/* Conversion layer behaviours. Loads last, after site.config.js, data.js, site.js and chat.js.
   Owns: H1 micro-qualifier + [data-focus-copy] swap, H4 sticky solutions bar,
   H5 workflow modal, H6 mini-capture forms, H21 "How to read this" on the 3D board.
   No dependencies. Reads window.SITE for the form endpoint and email. */
(function () {
  "use strict";
  const S = window.SITE || {};
  const root = document.documentElement;
  const email = S.email || "";
  const RT = S.responseTime || "24 hours"; // reply-time promise, from site.config.js
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const GOALS = ["More bookings", "Capture and follow up leads", "Answer customers 24/7", "Stop chasing by hand", "Less admin", "More reviews", "Not sure yet"];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = () => (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) || root.getAttribute("data-motion") === "reduced";
  const scrollMode = () => (reduced() ? "instant" : "smooth");

  /* ---------------------------------------------------------------
     Shared: send a form to SITE.formEndpoint, or fall back to a
     mailto: link with every collected field in the body (same
     behaviour as the contact form in site.js).
  --------------------------------------------------------------- */
  const nice = (k) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const fixUrl = (v) => { const t = String(v || "").trim(); return t && !/^https?:\/\//i.test(t) ? "https://" + t : t; };
  const setStatus = (el, text, kind) => { if (!el) return; el.className = "status" + (kind ? " " + kind : ""); el.textContent = text; };
  const textOf = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();

  async function deliver(form, opts) {
    const { subject, okText, btn, status } = opts;
    const extra = opts.extra || {};
    const data = new FormData(form);
    Object.keys(extra).forEach((k) => { if (extra[k] != null && String(extra[k]).trim()) data.set(k, extra[k]); });
    if (!data.get("_subject")) data.set("_subject", subject);
    setStatus(status, "", "");
    if (S.formEndpoint) {
      if (btn) btn.setAttribute("aria-busy", "true");
      try {
        const res = await fetch(S.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        setStatus(status, okText, "ok"); form.reset(); return true;
      } catch (err) {
        setStatus(status, "Could not send (" + err.message + "). Email " + (email || "us") + " instead.", "err"); return false;
      } finally { if (btn) btn.removeAttribute("aria-busy"); }
    }
    const lines = [];
    data.forEach((v, k) => { if (k.startsWith("_") || k === "botcheck") return; const t = String(v).trim(); if (t) lines.push(nice(k) + ": " + t); });
    location.href = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
    setStatus(status, "Opening your email app. If nothing happens, email " + (email || "us") + " directly.", "ok");
    return true;
  }

  /* ---------------------------------------------------------------
     H1 Micro-qualifier: chip -> ?focus= -> highlight the matching
     catalog card, and swap every [data-focus-copy] line.
  --------------------------------------------------------------- */
  const FOCUS = {
    missed_leads: { sol: "lead-followup", copy: "Start with the enquiry that arrived at 9 pm and never got a reply." },
    followup:     { sol: "crm",           copy: "Start with the follow-up your team types out by hand every day." },
    booking:      { sol: "ai-booking",    copy: "Start with the customer who had to call twice to get a slot." },
    admin:        { sol: "internal-ops",  copy: "Start with the hours a week spent moving data between tools." },
  };
  let spotTimer = 0;
  const findCard = (id) => Array.from(document.querySelectorAll(".bento a.sol")).find((a) => (a.getAttribute("href") || "").endsWith("id=" + id)) || null;
  const spot = (card) => {
    document.querySelectorAll(".sol.spot").forEach((c) => c.classList.remove("spot"));
    clearTimeout(spotTimer);
    void card.offsetWidth; // restart the ring animation if the same card is chosen again
    card.classList.add("spot");
    spotTimer = setTimeout(() => card.classList.remove("spot"), 2500);
  };
  const inViewport = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
  function applyFocus(value, scroll) {
    const f = FOCUS[value]; if (!f) return;
    document.querySelectorAll("[data-qualifier] .chip[data-focus]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.focus === value)));
    document.querySelectorAll("[data-focus-copy]").forEach((el) => { el.textContent = f.copy; });
    const card = findCard(f.sol); if (!card) return;
    if (scroll) {
      try { card.scrollIntoView({ behavior: scrollMode(), block: "center" }); }
      catch (err) { card.scrollIntoView({ behavior: "auto", block: "center" }); } // engines without the "instant" value
      spot(card); card.focus({ preventScroll: true }); return;
    }
    // Page load with ?focus=: no scrolling. Light the card now if it is on screen, otherwise when it first appears.
    if (inViewport(card) || !("IntersectionObserver" in window)) { spot(card); return; }
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { spot(card); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(card);
  }
  const qualifier = document.querySelector("[data-qualifier]");
  if (qualifier) {
    qualifier.querySelectorAll(".chip[data-focus]").forEach((c) => { if (!c.hasAttribute("aria-pressed")) c.setAttribute("aria-pressed", "false"); });
    qualifier.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip[data-focus]"); if (!chip) return;
      const v = chip.dataset.focus;
      try { const u = new URL(location.href); u.searchParams.set("focus", v); history.replaceState(null, "", u); } catch (err) { /* ignore */ }
      applyFocus(v, true);
    });
  }
  const focusParam = new URLSearchParams(location.search).get("focus");
  if (focusParam && FOCUS[focusParam]) applyFocus(focusParam, false);

  /* ---------------------------------------------------------------
     H4 Sticky solutions mini-bar (desktop, while the catalog is in view)
  --------------------------------------------------------------- */
  const bento = document.querySelector(".bento");
  if (bento && "IntersectionObserver" in window) {
    const bar = document.createElement("div");
    bar.className = "solbar"; bar.hidden = true;
    bar.innerHTML = `<span class="solbar-count"></span><button class="btn sm ghost" type="button" data-open="workflow">Not sure which one fits? Tell us your workflow <span class="arr">→</span></button>`;
    document.body.append(bar);
    const countEl = bar.querySelector(".solbar-count");
    const recount = () => {
      const all = bento.querySelectorAll(".sol").length;
      const vis = bento.querySelectorAll(".sol:not([hidden])").length;
      // No filter bar (home preview): the count is noise, so show only the CTA.
      countEl.textContent = document.querySelector(".filterbar") ? "Seeing " + vis + " of " + all + " solutions" : "";
      countEl.hidden = !countEl.textContent;
    };
    const later = () => setTimeout(recount, 0); // after site.js has applied the filter
    document.addEventListener("click", (e) => { if (e.target && e.target.closest && e.target.closest(".chip")) later(); });
    const fbar = document.querySelector(".filterbar");
    if (fbar) { fbar.addEventListener("input", later); fbar.addEventListener("click", later); }
    const wide = window.matchMedia("(min-width: 901px)");
    let inView = false;
    const update = () => { bar.hidden = !(inView && wide.matches); };
    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; update(); }, { threshold: 0 }).observe(bento);
    if (wide.addEventListener) wide.addEventListener("change", update); else if (wide.addListener) wide.addListener(update);
    recount();
  }

  /* ---------------------------------------------------------------
     H5 Workflow modal. Opened by any [data-open="workflow"].
  --------------------------------------------------------------- */
  const modal = document.createElement("div");
  modal.className = "modal"; modal.id = "workflow-modal";
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "workflow-title");
  modal.innerHTML = `<div class="box">
    <button class="close" type="button" aria-label="Close">×</button>
    <p class="eyebrow">Tell us your workflow</p>
    <h3 id="workflow-title">Describe your day. We'll map what to automate.</h3>
    <p>Leave your email and the one thing that takes too much time. We usually reply within ${esc(RT)} with 2–3 concrete automations for your business.</p>
    <form novalidate>
      <label>Website <span class="opt">(optional)</span><input type="url" name="website" placeholder="https://your-site.com" autocomplete="url" inputmode="url"></label>
      <label>Email<input type="email" name="email" placeholder="you@company.com" required autocomplete="email" inputmode="email"></label>
      <label>Main goal<select name="goal" required><option value="">Choose one</option>${GOALS.map((g) => `<option>${esc(g)}</option>`).join("")}</select></label>
      <label>What takes too much time? <span class="opt">(optional)</span><textarea name="message" rows="3" placeholder="e.g. We get 30 WhatsApp enquiries a day and answer each one by hand."></textarea></label>
      <input type="hidden" name="_subject" value="Workflow request">
      <input type="hidden" name="source" value="workflow_modal">
      <input type="hidden" name="page" value="">
      <button class="btn primary" type="submit">Send my workflow <span class="arr">→</span></button>
      <p class="status" role="status" aria-live="polite"></p>
      <p class="fine">No newsletter. We only use this to reply to you.</p>
    </form>
  </div>`;
  document.body.append(modal);
  const wf = modal.querySelector("form");
  const wfStatus = wf.querySelector(".status");
  const wfBtn = wf.querySelector('button[type="submit"]');
  const firstField = wf.querySelector("input, select, textarea");
  let opener = null;
  const modalOpen = () => modal.classList.contains("open");
  const openModal = (from) => {
    opener = from || document.activeElement;
    modal.classList.add("open"); document.body.classList.add("modal-open");
    requestAnimationFrame(() => firstField.focus());
  };
  const closeModal = () => {
    if (!modalOpen()) return;
    modal.classList.remove("open"); document.body.classList.remove("modal-open");
    if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    opener = null;
  };
  document.addEventListener("click", (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-open="workflow"]') : null; if (!t) return;
    if (t.tagName === "A") e.preventDefault();
    openModal(t);
  });
  modal.querySelector(".close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (!modalOpen()) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key !== "Tab") return;
    // Keep keyboard focus inside the dialog while it is open.
    const f = Array.from(modal.querySelectorAll("button, [href], input, select, textarea")).filter((el) => !el.disabled && el.type !== "hidden");
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  wf.addEventListener("input", (e) => { const l = e.target.closest("label"); if (l) l.classList.remove("invalid"); });
  wf.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (wfBtn.getAttribute("aria-busy") === "true") return;
    const emailF = wf.querySelector('[name="email"]'), goalF = wf.querySelector('[name="goal"]'), webF = wf.querySelector('[name="website"]');
    wf.querySelectorAll("label.invalid").forEach((l) => l.classList.remove("invalid"));
    let bad = null;
    if (!goalF.value) { goalF.closest("label").classList.add("invalid"); bad = goalF; }
    if (!EMAIL_RE.test(emailF.value.trim())) { emailF.closest("label").classList.add("invalid"); bad = emailF; }
    if (bad) { setStatus(wfStatus, "Add a valid email and pick a goal so we can reply.", "err"); bad.focus(); return; }
    webF.value = fixUrl(webF.value);
    wf.querySelector('[name="page"]').value = location.href;
    await deliver(wf, { subject: "Workflow request", okText: "Got it. We usually reply within " + RT + " with 2–3 concrete automations.", btn: wfBtn, status: wfStatus });
  });

  /* ---------------------------------------------------------------
     H6 Mini-capture forms ("Send me this by email"). Delegated on the
     document so forms rendered later by site.js work too.
  --------------------------------------------------------------- */
  function summaryFor(kind, form) {
    if (kind === "stack") {
      return Array.from(document.querySelectorAll(".configurator .stack .item b")).map((b) => b.textContent.trim()).filter(Boolean).join(" + ");
    }
    if (kind === "roi") {
      const roi = document.querySelector(".roi"); if (!roi) return "";
      const outs = Array.from(roi.querySelectorAll(".metric")).map((m) => {
        const b = m.querySelector("[data-o]"), s = m.querySelector("span");
        return b && s ? s.textContent.trim() + ": " + b.textContent.trim() : "";
      }).filter(Boolean);
      const ins = Array.from(roi.querySelectorAll(".inputs label")).map((l) => {
        const f = l.querySelector("input, select"); return f ? textOf(l) + ": " + f.value : "";
      }).filter(Boolean);
      return "Modelled results: " + outs.join("; ") + ". Inputs: " + ins.join("; ") + ".";
    }
    if (kind === "recommend") {
      const g = form.querySelector('[name="goal"]');
      return "Goal: " + ((g && g.value) || "not given") + " · Page: " + location.href;
    }
    return document.title + " · " + location.href; // solution, case, anything else
  }
  document.addEventListener("submit", async (e) => {
    const form = e.target && e.target.closest ? e.target.closest("form.mini-capture") : null;
    if (!form) return;
    e.preventDefault();
    const kind = form.dataset.kind || "page";
    const btn = form.querySelector('button[type="submit"]') || form.querySelector("button");
    const status = form.querySelector(".status");
    if (btn && btn.getAttribute("aria-busy") === "true") return;
    const emailF = form.querySelector('[name="email"]');
    if (!emailF || !EMAIL_RE.test(emailF.value.trim())) {
      if (emailF) { emailF.classList.add("invalid"); emailF.focus(); }
      setStatus(status, "Enter a valid email address and we'll send it there.", "err"); return;
    }
    emailF.classList.remove("invalid");
    const webF = form.querySelector('[name="website"]'); if (webF) webF.value = fixUrl(webF.value);
    const summary = summaryFor(kind, form);
    if (kind === "stack" && !summary) { setStatus(status, "Pick an industry and a goal first. Then we can send the stack.", "err"); return; }
    // PLUG IN: the automation endpoint receives kind, summary, page and source=capture_<kind>.
    await deliver(form, { subject: "Send by email: " + kind, extra: { kind, summary, page: location.href, source: "capture_" + kind }, okText: "Done. We'll email this within " + RT + ".", btn, status });
  });
  document.addEventListener("input", (e) => { const t = e.target; if (t && t.classList && t.classList.contains("invalid")) t.classList.remove("invalid"); });

  /* ---------------------------------------------------------------
     H21 "How to read this" on the 3D automation board
  --------------------------------------------------------------- */
  const legend = document.querySelector(".hero3d .legend");
  if (legend) {
    const stage = legend.closest(".hero3d");
    const btn = document.createElement("button");
    btn.className = "help"; btn.type = "button"; btn.textContent = "?";
    btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "How to read this diagram"); btn.setAttribute("aria-controls", "hero-help");
    const tip = document.createElement("div");
    tip.className = "help-tip"; tip.id = "hero-help"; tip.hidden = true;
    tip.innerHTML = `<b>How to read this</b><ul>
      <li>Each tile is a tool you already own.</li>
      <li>The amber dot is one lead moving through your system.</li>
      <li>Ripples mark the steps that run on their own.</li>
      <li>Move your cursor to look around. Hover a tile for detail.</li>
    </ul>`;
    legend.append(btn); stage.append(tip);
    const setHelp = (open) => { tip.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => setHelp(tip.hidden));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !tip.hidden) { setHelp(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (!tip.hidden && !tip.contains(e.target) && !btn.contains(e.target)) setHelp(false); });
  }

  /* ---------------------------------------------------------------
     Term tooltips: give screen readers the text (aria-describedby) and
     let Escape dismiss a focused tooltip (WCAG 1.4.13).
  --------------------------------------------------------------- */
  document.querySelectorAll(".term[data-tip]").forEach((t, i) => {
    const s = document.createElement("span");
    s.className = "sr"; s.id = "term-tip-" + i; s.setAttribute("role", "tooltip"); s.textContent = t.dataset.tip;
    t.after(s); t.setAttribute("aria-describedby", s.id);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.activeElement && document.activeElement.classList.contains("term")) document.activeElement.blur();
  });

  /* ---------------------------------------------------------------
     Kinetic type on 2–3 key section headlines (word by word when in view)
  --------------------------------------------------------------- */
  if (!reduced() && "IntersectionObserver" in window) {
    const heads = document.querySelectorAll(".kinetic-on-view");
    const kio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const h = en.target; kio.unobserve(h);
        const words = h.textContent.trim().split(/\s+/);
        h.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");
        h.classList.add("kinetic", "in");
      });
    }, { threshold: 0.4 });
    heads.forEach((h) => kio.observe(h));
  }

  /* ---------------------------------------------------------------
     3D board: a ripple where you click or tap the board
  --------------------------------------------------------------- */
  const board = document.querySelector(".hero3d .board");
  if (board && !reduced()) {
    board.addEventListener("pointerdown", (e) => {
      const r = board.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 560, y = ((e.clientY - r.top) / r.height) * 400;
      const rip = document.createElement("span");
      rip.className = "tap-ripple"; rip.style.left = x + "px"; rip.style.top = y + "px";
      board.append(rip); setTimeout(() => rip.remove(), 1400);
    }, { passive: true });
  }
})();
