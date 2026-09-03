"""Local dev server: serves the static site and proxies /api/chat to Groq
(or any OpenAI-compatible API) using a key from the environment or a .env file.

    python dev-server.py            # http://localhost:8085
    GROQ_API_KEY=... python dev-server.py

Without a key the endpoint answers {"error":"not_configured"} and the widget
falls back to its built-in rule-based answers.
"""
import json
import os
import time
import re
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8085"))

# Load .env if present (KEY=value lines, no quotes needed)
env_path = os.path.join(ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

with open(os.path.join(ROOT, "api", "chat.js"), encoding="utf-8") as f:
    _src = f.read()
# Reuse the exact system prompt from the serverless function so behaviour matches production.
SYSTEM_TEMPLATE = _src.split("const SYSTEM = (context) => `", 1)[1].split("`;", 1)[0]


# Model choice, same policy as api/chat.js: Groq moves models between free, preview and enterprise
# tiers, so ask /models and take the first available from PREFERRED instead of hard-coding an id.
PREFERRED = [
    r"^openai/gpt-oss-120b$", r"^openai/gpt-oss-20b$",
    r"^llama-3\.3-70b-versatile$", r"^meta-llama/llama-4-maverick", r"^meta-llama/llama-4-scout",
    r"^qwen/qwen3", r"^moonshotai/kimi", r"^llama-3\.1-8b-instant$", r"^groq/compound-mini$",
]
NOT_CHAT = re.compile(r"whisper|tts|orpheus|playai|guard|safeguard|embed|allam|distil", re.I)
MODEL_ERR = re.compile(r"model_not_found|does not exist|decommissioned|deprecated|not supported|no longer", re.I)
MODEL_CACHE = {}


def list_models(base, key):
    if MODEL_CACHE.get("ids") and time.time() - MODEL_CACHE.get("at", 0) < 600:
        return MODEL_CACHE["ids"]
    req = urllib.request.Request(base + "/models", headers={"Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=20) as r:
        j = json.loads(r.read().decode("utf-8"))
    ids = [m["id"] for m in j.get("data", []) if m.get("id") and m.get("active", True) is not False]
    MODEL_CACHE.update(at=time.time(), ids=ids)
    return ids


def pick_model(base, key, exclude=None):
    try:
        ids = [i for i in list_models(base, key) if i != exclude]
    except Exception:
        return ""
    for pat in PREFERRED:
        hit = next((i for i in ids if re.search(pat, i)), None)
        if hit:
            return hit
    return next((i for i in ids if not NOT_CHAT.search(i)), "")


def complete(base, key, model, system, msgs):
    body = {"model": model, "temperature": 0.3, "max_tokens": 900 if re.search(r"gpt-oss|qwen3|compound", model, re.I) else 400,
            "messages": [{"role": "system", "content": system}] + msgs}
    if re.search(r"gpt-oss", model, re.I):
        body["reasoning_effort"] = "low"
    req = urllib.request.Request(base + "/chat/completions", data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return {"status": r.status, "text": r.read().decode("utf-8")}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "text": e.read().decode("utf-8", "replace")}
    except Exception as e:  # network, timeout
        return {"status": 0, "text": str(e)}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)

    def _json(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_form(self):
        """Parse a multipart/form-data or urlencoded POST into a dict (local testing only)."""
        n = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(n) if n else b""
        ctype = self.headers.get("Content-Type", "")
        fields = {}
        if ctype.startswith("multipart/form-data"):
            from email.parser import BytesParser
            from email.policy import default
            msg = BytesParser(policy=default).parsebytes(b"Content-Type: " + ctype.encode() + b"\r\n\r\n" + raw)
            for part in msg.iter_parts():
                name = part.get_param("name", header="content-disposition")
                if name:
                    fields[name] = part.get_content().strip() if isinstance(part.get_content(), str) else ""
        else:
            from urllib.parse import parse_qsl
            fields = dict(parse_qsl(raw.decode("utf-8", "replace")))
        return fields

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/form":
            # Local echo endpoint: set formEndpoint: "/api/form" to test payloads without a real provider.
            fields = self._read_form()
            print("[form] source=%s page=%s fields=%s" % (fields.get("source"), fields.get("page"), sorted(fields)), flush=True)
            try:
                with open(os.path.join(ROOT, ".form-log.jsonl"), "a", encoding="utf-8") as log:
                    log.write(json.dumps(fields, ensure_ascii=False) + "\n")
            except OSError:
                pass
            self._json(200, {"ok": True, "received": fields})
            return
        if path != "/api/chat":
            self._json(404, {"error": "not_found"})
            return
        key = next((os.environ.get(n, "").strip() for n in ("GROQ_API_KEY", "GROQ_KEY", "GROQ_API", "GROQ_TOKEN", "GROQ") if os.environ.get(n, "").strip()), "")
        if not key:
            self._json(200, {"error": "not_configured", "groqVarsSeen": [k for k in os.environ if k.upper().startswith("GROQ")]})
            return
        try:
            n = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            self._json(400, {"error": "bad_request"})
            return
        msgs = [
            {"role": m["role"], "content": str(m["content"])[:1500]}
            for m in body.get("messages", [])
            if isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str)
        ][-10:]
        if not msgs:
            self._json(400, {"error": "bad_request"})
            return
        context = str(body.get("context", ""))[:12000]
        system = SYSTEM_TEMPLATE.replace("${context}", context)
        base = os.environ.get("CHAT_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
        model = os.environ.get("CHAT_MODEL") or pick_model(base, key)
        if not model:
            self._json(502, {"error": "upstream", "detail": "no chat model available on this key"}); return
        out = complete(base, key, model, system, msgs)
        if out["status"] != 200 and MODEL_ERR.search(out["text"]):
            # Pinned or cached model vanished: refresh the list and retry once with the next best.
            MODEL_CACHE.clear()
            nxt = pick_model(base, key, exclude=model)
            if nxt:
                model = nxt; out = complete(base, key, model, system, msgs)
        if out["status"] != 200:
            self._json(502, {"error": "upstream", "model": model, "detail": out["text"][:300]}); return
        try:
            j = json.loads(out["text"])
            reply = (j.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
        except Exception:
            reply = ""
        self._json(200, {"reply": reply or "I could not produce an answer. Please try again or book a call.", "model": model})

if __name__ == "__main__":
    print(f"Serving {ROOT} on http://localhost:{PORT}  (chat: {'live, model picked from /models' if os.environ.get('GROQ_API_KEY') else 'fallback, no GROQ_API_KEY'})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
