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
  /* Single source map for every form on the site (also used by site.js via window.DS.sources).
     PLUG IN: your automation can branch on the `source` field. */
  const SOURCES = {
    contact: "contact_page",
    audit: "exit_intent_audit",
    heroAudit: "hero_audit",
    auditMobile: "mobile_engagement",
    workflow: "workflow_modal",
    stack: "build_stack_email",
    roi: "roi_email_capture",
    solution: "solution_detail_email",
    case: "case_study_email",
    recommend: "recommend_email",
  };
  const getSourceForForm = (form) => {
    if (!form) return "unknown";
    const explicit = form.querySelector('[name="source"]'); if (explicit && explicit.value) return explicit.value;
    if (form.classList.contains("mini-capture")) return SOURCES[form.dataset.kind] || ("capture_" + (form.dataset.kind || "page"));
    if (form.classList.contains("contact")) return SOURCES.contact;
    return "form_" + (document.body.dataset.page || "page");
  };
  const timezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })();
  /* Analytics hook. Nothing is sent anywhere by default: listen for the "ds:track" event,
     or define window.dataLayer (Google Tag Manager) and every event is pushed there too.
     Events: qualifier_used, workflow_modal_opened, capture_sent, audit_shown, playground_used,
     roi_calculator_used, roi_shared, stack_configured. */
  const track = (event, props) => {
    const detail = Object.assign({ event, page: location.pathname + location.search }, props || {});
    try { document.dispatchEvent(new CustomEvent("ds:track", { detail })); } catch (e) { /* ignore */ }
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
  };
  window.DS = Object.assign(window.DS || {}, { sources: SOURCES, getSourceForForm, timezone, track });

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
    // Every payload carries source, page and timezone so the automation can route and reply at a sensible hour.
    if (!data.get("source")) data.set("source", getSourceForForm(form));
    if (!data.get("page")) data.set("page", location.pathname + location.search);
    if (!data.get("timezone") && timezone) data.set("timezone", timezone);
    data.set("test_mode", S.testMode ? "true" : "false"); // filter test submissions downstream
    setStatus(status, "", "");
    if (S.formEndpoint) {
      if (form.dataset.pending === "1") return false; // ignore a second click while the first is in flight
      form.dataset.pending = "1";
      if (btn) { btn.setAttribute("aria-busy", "true"); btn.disabled = true; }
      try {
        const res = await window.DS.postForm(data);
        if (!res.ok) throw new Error("HTTP " + res.status);
        setStatus(status, okText, "ok"); form.reset(); return true;
      } catch (err) {
        setStatus(status, "Something went wrong on our side. Please try again in a moment, or email " + (email || "us") + " directly.", "err"); return false;
      } finally { form.dataset.pending = ""; if (btn) { btn.removeAttribute("aria-busy"); btn.disabled = false; } }
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
      track("qualifier_used", { focus: v });
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
      <input type="hidden" name="stack" value="">
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
  const openModal = (from, prefill) => {
    opener = from || document.activeElement;
    if (prefill) {
      const stackF = wf.querySelector('[name="stack"]'), msgF = wf.querySelector('[name="message"]');
      if (stackF) stackF.value = prefill.stack || "";
      if (msgF && !msgF.value && prefill.message) msgF.value = prefill.message;
    }
    modal.classList.add("open"); document.body.classList.add("modal-open");
    track("workflow_modal_opened", { prefilled: !!(prefill && prefill.stack) });
    requestAnimationFrame(() => firstField.focus());
  };
  /* Other scripts (site.js stack canvas) open the modal with context: DS.openWorkflow({stack, message}) */
  window.DS.openWorkflow = (prefill, from) => openModal(from || null, prefill);
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
    wf.querySelector('[name="page"]').value = location.pathname + location.search;
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
    // PLUG IN: the automation endpoint receives kind, summary, page, timezone and the source tag from SOURCES.
    const sent = await deliver(form, { subject: "Send by email: " + kind, extra: { kind, summary, source: getSourceForForm(form) }, okText: "Done. We'll email this within " + RT + ".", btn, status });
    if (sent) track("capture_sent", { source: getSourceForForm(form), kind });
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
  /* Triggers when the headline scrolls into view (not on load), once per session per headline.
     data-kinetic="slow" gives a more relaxed timing (see conversion.css). */
  if (!reduced() && "IntersectionObserver" in window) {
    const seenKey = (h) => "kinetic:" + h.textContent.trim().slice(0, 40);
    const heads = Array.from(document.querySelectorAll(".kinetic-on-view")).filter((h) => { try { return !sessionStorage.getItem(seenKey(h)); } catch (e) { return true; } });
    const kio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const h = en.target; kio.unobserve(h);
        const words = h.textContent.trim().split(/\s+/);
        h.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");
        h.classList.add("kinetic", "in");
        try { sessionStorage.setItem(seenKey(h), "1"); } catch (e) { /* ignore */ }
      });
    }, { threshold: 0.4 });
    heads.forEach((h) => kio.observe(h));
  }

  /* ---------------------------------------------------------------
     FAQ open/close animation for browsers without CSS
     interpolate-size (styles.css animates ::details-content natively
     where supported). Native <details> keeps working without JS.
  --------------------------------------------------------------- */
  const supportsDetailsAnim = typeof CSS !== "undefined" && CSS.supports && CSS.supports("interpolate-size", "allow-keywords");
  if (!supportsDetailsAnim && !reduced() && "animate" in Element.prototype) {
    document.querySelectorAll(".faq details").forEach((d) => {
      const summary = d.querySelector("summary"), body = d.querySelector("p");
      if (!summary || !body) return;
      summary.addEventListener("click", (e) => {
        e.preventDefault();
        if (d.open) {
          const h = body.getBoundingClientRect().height;
          body.style.overflow = "hidden";
          body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "ease" }).onfinish = () => { d.open = false; body.style.overflow = ""; };
        } else {
          d.open = true;
          const h = body.getBoundingClientRect().height;
          body.style.overflow = "hidden";
          body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 260, easing: "ease" }).onfinish = () => { body.style.overflow = ""; };
        }
      });
    });
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

  /* ---------------------------------------------------------------
     Playground: drag the automation flow. Exists so a visitor can
     "feel" the system: move a step and the wiring follows; tap a step
     to read what happens there. Static markup (nodes in default
     positions) still reads fine without JS.
     - Pointer events cover mouse, pen and touch; drag is constrained
       to the container; a short pointerdown/up with no movement is a tap.
     - Arrow keys move the focused step by 10px (keyboard users).
     - Positions persist in localStorage ("pg:layout"); Reset clears them.
  --------------------------------------------------------------- */
  const pg = document.querySelector("[data-playground]");
  const D = window.DATA || {};
  if (pg && D.heroFlow) {
    const STEPS = D.heroFlow;
    const DEFAULT = [[14, 22], [40, 22], [66, 22], [86, 50], [66, 78], [40, 78], [14, 78]]; // percent of container
    const svg = pg.querySelector(".pg-wires");
    const info = pg.querySelector(".pg-info");
    const resetBtn = pg.querySelector("[data-pg-reset]");
    let layout = null;
    try { const saved = JSON.parse(localStorage.getItem("pg:layout") || "null"); if (Array.isArray(saved) && saved.length === STEPS.length) layout = saved; } catch (e) { /* ignore */ }
    if (!layout) layout = DEFAULT.map((p) => p.slice());
    const nodes = STEPS.map(([icon, label, sub], i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pg-node"; b.dataset.i = String(i);
      b.setAttribute("aria-label", label + ". " + (sub || "") + " Drag to move, arrow keys to nudge.");
      b.innerHTML = `<span class="ic" aria-hidden="true">${(D.icons && D.icons[icon]) || ""}</span><span><span>${esc(label)}</span><small>${esc(sub || "")}</small></span>`;
      pg.insertBefore(b, pg.querySelector(".pg-bar"));
      return b;
    });
    const place = (i) => { nodes[i].style.setProperty("--x", layout[i][0] + "%"); nodes[i].style.setProperty("--y", layout[i][1] + "%"); };
    const centre = (i) => { const r = pg.getBoundingClientRect(); return [layout[i][0] / 100 * r.width, layout[i][1] / 100 * r.height]; };
    const draw = () => {
      const r = pg.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      const pts = STEPS.map((_, i) => centre(i));
      // Smooth curves between consecutive steps so the wiring reads as one flow.
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const cx = (x0 + x1) / 2; d += ` C${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`; }
      svg.innerHTML = `<path d="${d}"/><path class="live" d="${d}"/>`;
    };
    const save = () => { try { localStorage.setItem("pg:layout", JSON.stringify(layout)); } catch (e) { /* ignore */ } };
    const clamp = (v) => Math.max(6, Math.min(94, v));
    let used = false;
    const markUsed = (how) => { if (used) return; used = true; track("playground_used", { how }); };
    const select = (i) => {
      nodes.forEach((n, k) => n.classList.toggle("active", k === i));
      if (info) info.innerHTML = `<b>${esc(STEPS[i][1])}</b> · ${esc(STEPS[i][2] || "")} — step ${i + 1} of ${STEPS.length}`;
    };
    nodes.forEach((n, i) => {
      place(i);
      let drag = null;
      n.addEventListener("pointerdown", (e) => {
        if (e.button && e.button !== 0) return;
        try { n.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released or synthetic: drag still works via bubbling */ }
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: layout[i][0], oy: layout[i][1], moved: false };
        n.classList.add("drag");
      });
      n.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const r = pg.getBoundingClientRect();
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        layout[i] = [clamp(drag.ox + dx / r.width * 100), clamp(drag.oy + dy / r.height * 100)];
        place(i); draw();
      });
      const end = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        n.classList.remove("drag");
        if (drag.moved) { save(); markUsed("drag"); } else { select(i); markUsed("tap"); }
        drag = null;
      };
      n.addEventListener("pointerup", end); n.addEventListener("pointercancel", end);
      n.addEventListener("keydown", (e) => {
        const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!k) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); } return; }
        e.preventDefault();
        const r = pg.getBoundingClientRect();
        layout[i] = [clamp(layout[i][0] + k[0] * 10 / r.width * 100), clamp(layout[i][1] + k[1] * 10 / r.height * 100)];
        place(i); draw(); save(); markUsed("keyboard");
      });
    });
    if (resetBtn) resetBtn.addEventListener("click", () => { layout = DEFAULT.map((p) => p.slice()); nodes.forEach((_, i) => place(i)); draw(); try { localStorage.removeItem("pg:layout"); } catch (e) { /* ignore */ } if (info) info.textContent = "Layout reset. Tap a step to see what it does."; });
    draw();
    if ("ResizeObserver" in window) new ResizeObserver(draw).observe(pg); else window.addEventListener("resize", draw);
  }
})();
