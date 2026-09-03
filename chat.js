/* Site assistant. Answers questions about the agency from the site's own content.
   - With a backend (api/chat.js on Vercel, or dev-server.py locally) it uses an LLM via
     the server-side key. The page never sees the key.
   - Without a backend it falls back to a rule-based answerer over the same content.
   Loads after site.config.js, data.js and site.js. */
(function () {
  const S = window.SITE || {}; const D = window.DATA || { solutions: [], industries: [], cases: [] };
  const cfg = Object.assign({ enabled: true, endpoint: "/api/chat", name: "Assistant" }, S.chat || {});
  if (cfg.enabled === false) return;
  const page = document.body.dataset.page || "";
  const agency = S.name || "the agency";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Site context: what the model is allowed to know ---------- */
  function buildContext() {
    const L = [];
    L.push(`AGENCY: ${agency}. AI automation agency for small and medium businesses. Builds AI websites, lead systems, booking flows and business automations. Based in ${S.base || ""}; works with businesses in ${(S.regions || []).join(", ")}. Replies within ${S.responseTime || "24 hours"}. Contact: ${S.email || "see contact page"}. Booking page: book.html (free 30-minute strategy call; 45-minute deep dive also available). Contact page: contact.html.`);
    L.push(`POLICIES: Pricing is a fixed price per project, given after the free strategy call once scope is known; no price list on the site. Typical timeline three to five weeks. Everything is built in accounts the client owns; no lock-in. Assistants only answer from the client's own material. Every automation is logged. Metrics on the site are targets or illustrative unless marked "Client result"; never quote them as achieved results.`);
    L.push(`SERVICES: Build (AI websites, landing pages, lead capture, booking experiences). Automate (lead routing, CRM, appointment, email, WhatsApp workflows, internal notifications). Scale (analytics, AI agents, workflow optimisation, integrations).`);
    L.push(`PROCESS: 1 Discover (free call, workflow map) 2 Design (one-page plan, fixed price) 3 Build (in your accounts) 4 Test (real scenarios) 5 Launch and optimise (monthly numbers review).`);
    L.push("SOLUTIONS:");
    D.solutions.forEach((s) => L.push(`- ${s.name} [solution.html?id=${s.id}] (${s.cat}; industries: ${s.industry.join(", ")}): ${s.outcome} ${s.tagline} Typical potential impact: ${s.impact.map((i) => i.join(" ")).join("; ")}. Tools: ${(s.stack || []).join(", ")}.`));
    L.push("INDUSTRIES:");
    D.industries.forEach((i) => L.push(`- ${i.name} (${i.who}): common leak: ${i.pain} Recommended: ${i.sols.map((id) => (D.solutions.find((s) => s.id === id) || {}).name).filter(Boolean).join(", ")}.`));
    L.push("CASE STUDIES (all ILLUSTRATIVE SCENARIOS with target ranges, not named-client results):");
    D.cases.forEach((c) => L.push(`- ${c.title}, ${c.industry}, ${c.country} [case-study.html?id=${c.id}]: problem: ${c.problem} built: ${c.built} targets: ${c.metrics.map((m) => m[0] + " " + m[1]).join("; ")}.`));
    return L.join("\n").slice(0, 9000);
  }
  const CONTEXT = buildContext();

  /* ---------- Rule-based fallback (no backend) ---------- */
  function localAnswer(q) {
    const t = q.toLowerCase();
    const has = (...ws) => ws.some((w) => t.includes(w));
    const link = (txt, href) => `[${txt}](${href})`;
    const byName = D.solutions.find((s) => t.includes(s.name.toLowerCase()) || t.includes(s.cat.toLowerCase()) || (s.id === "whatsapp" && has("whatsapp")) || (s.id === "crm" && has("crm")) || (s.id === "reviews" && has("review")));
    if (byName && !has("contact", "email", "reach you", "phone")) return `**${byName.name}**: ${byName.tagline} Typical potential impact: ${byName.impact.map((i) => i.join(" ").toLowerCase()).join(", ")}. ${link("See how it works", "solution.html?id=" + byName.id)}.`;
    if (has("price", "cost", "pricing", "how much", "fee", "budget", "charge")) return `We quote a fixed price per project once we know the scope, so there is no price list on the site. The free strategy call is where we work that out, and you leave with a written roadmap and an estimate either way. ${link("Book a free strategy call", "book.html")}.`;
    if (has("how long", "timeline", "time to build", "weeks", "duration", "fast")) return `Most systems go live in three to five weeks: discover, design, build, test, then launch and optimise. You see it handle real cases before it goes live. ${link("See the process", "index.html#process")}.`;
    if (has("book", "call", "meeting", "demo", "schedule", "appointment with")) return `You can book a free 30-minute strategy call any time. The calendar shows slots in your time zone and sends confirmations and reminders. ${link("Book a call", "book.html")}. Prefer to write first? ${link("Use the contact form", "contact.html")}.`;
    if (has("contact", "email", "whatsapp", "reach", "phone")) return `${S.email ? `Email ${S.email}. ` : ""}${S.whatsapp ? "WhatsApp is on the contact page too. " : ""}We reply within ${S.responseTime || "24 hours"}. ${link("Contact page", "contact.html")}.`;
    if (has("own", "lock", "account", "cancel", "leave")) return `Everything runs in accounts registered to you: calendar, messaging, CRM, automations. If you stop working with us, it all keeps running and you keep the keys. No proprietary platform.`;
    if (has("result", "proof", "case stud", "client", "metric", "number")) return `The case studies on the site are illustrative scenarios with target ranges, and they are labelled that way. We publish real numbers only from a client's own dashboards, with their approval. ${link("Read the scenarios", "case-studies.html")}.`;
    const stem = (w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "");
    const qWords = new Set(t.split(/[^a-z]+/).filter((w) => w.length > 2).map(stem));
    const STOP = new Set(["and", "any", "custom", "small", "local", "practice", "business", "company", "stores", "store", "centre", "centres"]);
    const ind = D.industries.find((i) => (i.name + " " + i.who).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem).some((w) => qWords.has(w)));
    if (ind) { const sols = ind.sols.map((id) => D.solutions.find((s) => s.id === id)).filter(Boolean); return `For ${ind.name.toLowerCase()} the usual leak is: ${ind.pain} We would start with ${sols.map((s) => link(s.name, "solution.html?id=" + s.id)).join(", ")}. ${link("Book a call", "book.html")} and we map it to your tools.`; }
    const sol = D.solutions.find((s) => t.includes(s.name.toLowerCase()) || s.uses.some((u) => t.includes(u)) || t.includes(s.cat.toLowerCase()));
    if (sol) return `**${sol.name}**: ${sol.tagline} Typical potential impact: ${sol.impact.map((i) => i.join(" ").toLowerCase()).join(", ")}. ${link("See how it works", "solution.html?id=" + sol.id)}.`;
    if (has("what do you do", "services", "what can you", "help", "automation", "ai website")) return `We build AI websites and the automations behind them: instant replies on web, WhatsApp and email, self-serve booking with reminders, CRM that fills itself in, follow-ups on a schedule, and internal admin done by software. ${link("Browse solutions", "solutions.html")} or ${link("find your industry", "industries.html")}.`;
    return `I can answer questions about what ${agency} builds, pricing and timelines, specific industries, or how a solution works. Try one of the suggestions below, or ${link("book a free strategy call", "book.html")} to talk it through.`;
  }

  /* ---------- Markdown-lite renderer ---------- */
  function md(s) {
    let h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, href) => { const safe = /^(https?:\/\/|[a-z0-9\-]+\.html|#|mailto:)/i.test(href) ? href : "#"; return `<a href="${safe}"${/^https?:/.test(safe) ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`; });
    const lines = h.split(/\n/); let out = "", inList = false;
    lines.forEach((ln) => { if (/^\s*[-•]\s+/.test(ln)) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + ln.replace(/^\s*[-•]\s+/, "") + "</li>"; } else { if (inList) { out += "</ul>"; inList = false; } if (ln.trim()) out += "<p>" + ln + "</p>"; } });
    if (inList) out += "</ul>";
    return out;
  }

  /* ---------- UI ---------- */
  const SUGGEST = ["What would you build for a clinic?", "How much does it cost?", "How long does it take?", "Do I own the accounts?"];
  const root = document.createElement("div"); root.className = "chat"; root.innerHTML = `
    <button class="chat-launch" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Open assistant">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>
      <span>Ask us</span>
    </button>
    <section class="chat-panel" id="chat-panel" role="dialog" aria-label="Assistant" hidden>
      <header>
        <div><b>Ask ${esc(agency)}</b><small class="mode" aria-live="polite">Answers from this site's content</small></div>
        <button class="chat-close" type="button" aria-label="Close">×</button>
      </header>
      <div class="chat-log" role="log" aria-live="polite"></div>
      <div class="chat-suggest">${SUGGEST.map((s) => `<button type="button" class="chip">${esc(s)}</button>`).join("")}</div>
      <form class="chat-form"><label class="sr" for="chat-in">Your question</label><input id="chat-in" type="text" autocomplete="off" maxlength="500" placeholder="Ask about pricing, timelines, your industry…"><button class="btn primary sm" type="submit">Send</button></form>
      <p class="chat-fine">No account needed. Conversations are not stored beyond this tab. For a real answer on your business, <a href="book.html">book a call</a>.</p>
    </section>`;
  document.body.append(root);
  const launch = root.querySelector(".chat-launch"), panel = root.querySelector(".chat-panel"), log = root.querySelector(".chat-log"), form = root.querySelector(".chat-form"), input = root.querySelector("#chat-in"), mode = root.querySelector(".mode");
  if (page === "book" || page === "contact") root.classList.add("low");

  let history = []; try { history = JSON.parse(sessionStorage.getItem("chatHistory") || "[]"); } catch (e) { /* ignore */ }
  let backend = null; // null = unknown, true = live, false = fallback
  /* Endpoints in order of preference: the site's own /api/chat, then an optional fallback on a sister
     deployment (site.config.js → chat.fallbackEndpoint). The first one that answers is remembered. */
  const endpoints = [cfg.endpoint, cfg.fallbackEndpoint].filter(Boolean);
  let epIndex = 0;
  const save = () => { try { sessionStorage.setItem("chatHistory", JSON.stringify(history.slice(-12))); } catch (e) { /* ignore */ } };
  const add = (role, text) => { const el = document.createElement("div"); el.className = "msg " + role; el.innerHTML = role === "bot" ? md(text) : `<p>${esc(text)}</p>`; log.append(el); log.scrollTop = log.scrollHeight; return el; };
  const open = (o) => { panel.hidden = !o; launch.setAttribute("aria-expanded", String(o)); root.classList.toggle("open", o); if (o) { if (!log.children.length) { history.length ? history.forEach((m) => add(m.role === "assistant" ? "bot" : "user", m.content)) : add("bot", `Hi. I answer questions about what ${agency} builds, for which businesses, and how the process works. What would you like to know?`); } input.focus(); } };
  launch.addEventListener("click", () => open(panel.hidden));
  root.querySelector(".chat-close").addEventListener("click", () => open(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) open(false); });
  root.querySelectorAll(".chat-suggest .chip").forEach((c) => c.addEventListener("click", () => { input.value = c.textContent; form.requestSubmit(); }));

  async function ask(q) {
    add("user", q); history.push({ role: "user", content: q }); save();
    const typing = add("bot", "…"); typing.classList.add("typing");
    let answer = "", live = false;
    if (backend !== false) {
      const body = JSON.stringify({ messages: history.slice(-10), context: CONTEXT, page: location.pathname });
      while (epIndex < endpoints.length && !live) {
        try {
          const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
          const res = await fetch(endpoints[epIndex], { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: ctrl.signal });
          clearTimeout(to);
          const j = res.ok ? await res.json() : null;
          if (j && j.reply) { answer = j.reply; live = true; backend = true; }
          else epIndex++; // not configured, upstream error or 404 here: try the next endpoint
        } catch (e) { epIndex++; }
      }
      if (!live) backend = false;
    }
    if (!live) answer = localAnswer(q);
    mode.textContent = live ? "AI answers grounded in this site's content" : "Answers from this site's content";
    typing.classList.remove("typing"); typing.innerHTML = md(answer);
    log.scrollTop = log.scrollHeight;
    history.push({ role: "assistant", content: answer }); save();
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); const q = input.value.trim(); if (!q) return; input.value = ""; ask(q); });
})();
