/* Vercel serverless function: POST /api/form
   Same-origin relay for the site's forms. The browser posts straight to the webhook
   (site.config.js -> formEndpoint) and falls back to this relay when that direct post
   fails, e.g. CORS on a preview or sister domain. The relay forwards the body unchanged,
   with the visitor's user agent (the webhook has a bot filter).

   Backup channel: if the webhook is down or answers with an error, the same fields are
   emailed through FormSubmit (free, no key) to FORM_BACKUP_EMAIL, so a lead is never lost
   because of n8n. The inbox must click FormSubmit's one-time activation link first.

   Environment variables (optional):
     FORM_WEBHOOK_URL    overrides the webhook below
     FORM_BACKUP_EMAIL   overrides the backup inbox below ("" disables the backup)
   Testing: POST /api/form?backup=1 skips the webhook and exercises the backup path. */
const DEFAULT_TARGET = "https://sai830.app.n8n.cloud/webhook/ds-agency-forms";
const DEFAULT_BACKUP = "saikiranreddytallapureddy@gmail.com";

/* Minimal multipart/form-data reader (text fields only; files are skipped). */
function fields(body, type) {
  const out = {};
  if (!body) return out;
  if (/json/i.test(type)) { try { return JSON.parse(String(body)); } catch (e) { return out; } }
  if (/x-www-form-urlencoded/i.test(type)) { new URLSearchParams(String(body)).forEach((v, k) => { out[k] = v; }); return out; }
  const m = /boundary=("?)([^";]+)\1/i.exec(type || "");
  if (!m) return out;
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
  text.split("--" + m[2]).forEach((part) => {
    const idx = part.indexOf("\r\n\r\n"); if (idx < 0) return;
    const head = part.slice(0, idx), val = part.slice(idx + 4).replace(/\r\n$/, "");
    const name = /name="([^"]+)"/.exec(head); if (!name || /filename=/.test(head)) return;
    out[name[1]] = val;
  });
  return out;
}

async function backup(req, body, type, reason) {
  const to = process.env.FORM_BACKUP_EMAIL != null ? process.env.FORM_BACKUP_EMAIL : DEFAULT_BACKUP;
  if (!to) return { ok: false, detail: "backup disabled" };
  const f = fields(body, type);
  const payload = Object.assign({}, f, {
    _subject: "[DS Agency] " + (f.source || "form") + (f.email ? " · " + f.email : "") + " (backup channel)",
    _template: "table",
    _captcha: "false",
    delivered_via: "backup, because the webhook " + reason,
  });
  const origin = "https://" + (req.headers.host || "ds-agency.vercel.app");
  const r = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Origin: origin, Referer: origin + "/", "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (compatible; DS Agency relay)" },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch (e) { /* not json */ }
  return { ok: r.ok && !!j && String(j.success) === "true", detail: (j && j.message) || text.slice(0, 200) };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") { res.status(200).json({ ok: true, relay: true }); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }
  const target = process.env.FORM_WEBHOOK_URL || DEFAULT_TARGET;
  const type = req.headers["content-type"] || "application/octet-stream";
  let body = req.body;
  if (body == null) body = "";
  else if (!Buffer.isBuffer(body) && typeof body !== "string") body = /json/i.test(type) ? JSON.stringify(body) : new URLSearchParams(body).toString();
  const forceBackup = /[?&]backup=1/.test(req.url || "");
  let failure = "";
  if (!forceBackup) {
    try {
      const r = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": type,
          "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (compatible; DS Agency relay)",
          Accept: "application/json",
          Origin: "https://" + (req.headers.host || "ds-agency.vercel.app"),
        },
        body,
      });
      const text = await r.text();
      if (r.ok) { res.setHeader("Content-Type", "application/json"); res.status(200).end(text || '{"ok":true}'); return; }
      failure = "answered " + r.status;
    } catch (e) {
      failure = "was unreachable (" + String(e.message || e).slice(0, 80) + ")";
    }
  } else failure = "was skipped for a backup test";
  try {
    const b = await backup(req, body, type, failure);
    if (b.ok) { res.status(200).json({ ok: true, via: "backup", webhook: failure }); return; }
    res.status(502).json({ error: "upstream", webhook: failure, backup: b.detail });
  } catch (e) {
    res.status(502).json({ error: "upstream", webhook: failure, backup: String(e.message || e).slice(0, 200) });
  }
};
