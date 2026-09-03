/* Vercel serverless function: POST /api/form
   Same-origin relay for the site's forms. The browser posts straight to the webhook
   (site.config.js -> formEndpoint) and only falls back to this relay when that direct
   post fails, e.g. CORS on a preview or sister domain. The relay forwards the body
   unchanged, with the visitor's user agent (the webhook has a bot filter).

   Environment variable (optional): FORM_WEBHOOK_URL overrides the target below. */
const DEFAULT_TARGET = "https://sai830.app.n8n.cloud/webhook/ds-agency-forms";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") { res.status(200).json({ ok: true, relay: true }); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }
  const target = process.env.FORM_WEBHOOK_URL || DEFAULT_TARGET;
  const type = req.headers["content-type"] || "application/octet-stream";
  let body = req.body;
  if (body == null) body = "";
  else if (!Buffer.isBuffer(body) && typeof body !== "string") body = /json/i.test(type) ? JSON.stringify(body) : new URLSearchParams(body).toString();
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
    res.setHeader("Content-Type", "application/json");
    if (r.ok) { res.status(200).end(text || '{"ok":true}'); return; }
    res.status(502).end(JSON.stringify({ error: "upstream", status: r.status, detail: text.slice(0, 200) }));
  } catch (e) {
    res.status(502).json({ error: "upstream", detail: String(e.message || e).slice(0, 200) });
  }
};
