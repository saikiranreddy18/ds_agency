"""Local dev server: serves the static site and proxies /api/chat to Groq
(or any OpenAI-compatible API) using a key from the environment or a .env file.

    python dev-server.py            # http://localhost:8085
    GROQ_API_KEY=... python dev-server.py

Without a key the endpoint answers {"error":"not_configured"} and the widget
falls back to its built-in rule-based answers.
"""
import json
import os
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

    def do_POST(self):
        if self.path.split("?")[0] != "/api/chat":
            self._json(404, {"error": "not_found"})
            return
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            self._json(200, {"error": "not_configured"})
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
        model = os.environ.get("CHAT_MODEL", "llama-3.3-70b-versatile")
        payload = json.dumps({
            "model": model, "temperature": 0.3, "max_tokens": 400,
            "messages": [{"role": "system", "content": system}] + msgs,
        }).encode("utf-8")
        req = urllib.request.Request(
            base + "/chat/completions", data=payload,
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                j = json.loads(r.read().decode("utf-8"))
            reply = (j.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
            self._json(200, {"reply": reply or "I could not produce an answer. Please try again or book a call."})
        except urllib.error.HTTPError as e:
            self._json(502, {"error": "upstream", "detail": e.read().decode("utf-8", "replace")[:300]})
        except Exception as e:  # network, timeout
            self._json(502, {"error": "upstream", "detail": str(e)[:300]})


if __name__ == "__main__":
    print(f"Serving {ROOT} on http://localhost:{PORT}  (chat: {'live' if os.environ.get('GROQ_API_KEY') else 'fallback, no GROQ_API_KEY'})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
