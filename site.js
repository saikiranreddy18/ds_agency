/* Shared behaviour. Reads window.SITE (site.config.js) and window.DATA (data.js). */
(function () {
  const S = window.SITE || {};
  const D = window.DATA || { icons: {}, solutions: [], cases: [], industries: [] };

  /* Post a form payload to the webhook. If the browser cannot reach it (CORS on a preview or
     sister domain, a network hiccup), retry once through the same-origin relay
     (site.config.js -> formProxy). Every form on the site goes through this. */
  window.DS = window.DS || {};
  window.DS.postForm = async function (data, endpoint) {
    const url = endpoint || S.formEndpoint;
    const attempt = async (u) => {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 15000);
      try { return await fetch(u, { method: "POST", body: data, headers: { Accept: "application/json" }, signal: ctrl.signal }); }
      finally { clearTimeout(to); }
    };
    const proxy = S.formProxy && S.formProxy !== url ? S.formProxy : "";
    try { const res = await attempt(url); if (res.ok || !proxy) return res; }
    catch (err) { if (!proxy) throw err; }
    return attempt(proxy);
  };
  const page = document.body.dataset.page || "";
  const name = S.name || "[Agency name]";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.getAttribute("data-motion") === "reduced";

  /* ---------------------------------------------------------------
     Workflow rail renderer (shared component)
     steps: [[icon, label, sub?], ...]
  --------------------------------------------------------------- */
  const TIPS = { lead: "A new enquiry arrives from any channel", web: "The AI website answers and captures details", ai: "AI reads the request and decides the next step", crm: "Your CRM record is created or updated", msg: "A message goes out on WhatsApp or email", cal: "A slot is booked on your live calendar", bell: "Reminders and nudges go out on time", star: "A review request is sent at the right moment", check: "Confirmed and logged", doc: "A document is generated from live data", card: "Payment collected or reconciled", chart: "The numbers land on your dashboard", box: "Order data is looked up live", team: "Your team is notified with full context" };
  window.renderFlow = function (steps, opts = {}) {
    const cls = ["flow", opts.horizontal ? "h" : "v", opts.big ? "big" : "", opts.run !== false ? "run" : ""].join(" ").trim();
    const parts = steps.map(([icon, label, sub], i) => {
      const ic = opts.horizontal ? "" : `<span class="ic">${D.icons[icon] || D.icons.check || ""}</span>`;
      const tipText = opts.big ? (sub || TIPS[icon] || "") : "";
      const tip = tipText ? `<span class="tip" role="tooltip">${esc(tipText)}</span>` : "";
      const node = `<div class="node" style="--i:${i}"${tipText ? ` data-tip tabindex="0"` : ""}>${ic}<span class="lbl"><span>${esc(label)}</span>${sub && !opts.horizontal ? `<span class="sub">${esc(sub)}</span>` : ""}</span>${tip}</div>`;
      const link = i < steps.length - 1 ? `<div class="link" style="--i:${i}"></div>` : "";
      return node + link;
    });
    return `<div class="${cls}" style="--dur:${(steps.length + 2) * 1.1}s" aria-label="Workflow: ${esc(steps.map((s) => s[1]).join(" → "))}">${parts.join("")}</div>`;
  };
  window.flowSteps = (arr) => arr.map((s) => s);
  window.DATA_BY_ID = { solution: (id) => D.solutions.find((s) => s.id === id), case: (id) => D.cases.find((c) => c.id === id) };
  /* Industry id → catalog filter value (beauty and local fall under "other"). */
  const FILTERABLE = ["healthcare", "fitness", "home", "ecommerce", "professional", "education"];
  const industryFilter = (id) => (FILTERABLE.includes(id) ? id : "other");

  /* ---------------------------------------------------------------
     Chrome: header, mobile menu, footer, sticky CTA
  --------------------------------------------------------------- */
  const NAV = [
    ["solutions.html", "Solutions", "solutions"],
    ["industries.html", "Industries", "industries"],
    ["case-studies.html", "Case Studies", "case-studies"],
    ["index.html#process", "Process", ""],
    ["about.html", "About", "about"],
  ];
  const cur = (key) => (key && key === page ? ' aria-current="page"' : "");

  const THEME_ICONS = `<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`;
  const head = document.createElement("header");
  head.className = "nav";
  head.innerHTML = `
    <div class="wrap">
      <a class="logo" href="index.html" aria-label="${esc(name)} home"><span class="mark" aria-hidden="true"></span><span>${esc(name)}</span></a>
      <nav class="primary" aria-label="Main">${NAV.map(([h, l, k]) => `<a href="${h}"${cur(k)}>${l}</a>`).join("")}</nav>
      <div class="nav-right">
        <button class="theme-btn" type="button" aria-label="Switch to light mode" title="Switch theme">${THEME_ICONS}</button>
        <a class="btn primary sm" href="book.html">Book a Strategy Call</a>
        <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><span></span></button>
      </div>
    </div>`;
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay"; overlay.id = "menu";
  overlay.innerHTML = `
    ${NAV.map(([h, l, k], i) => `<a class="item" href="${h}"${cur(k)}>${l}<small>0${i + 1}</small></a>`).join("")}
    <a class="item" href="contact.html">Contact<small>06</small></a>
    <div class="menu-foot">
      <a class="btn primary" href="book.html">Book a Free Strategy Call</a>
      ${S.email ? `<a class="btn ghost" href="mailto:${esc(S.email)}">Email us</a>` : ""}
      <button class="theme-btn" type="button" aria-label="Switch to light mode">${THEME_ICONS}<span class="theme-label">Light mode</span></button>
    </div>`;
  document.body.prepend(overlay);
  document.body.prepend(head);

  const menuBtn = head.querySelector(".menu-btn");
  const setMenu = (open) => { document.body.classList.toggle("menu-open", open); menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu"); };
  menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  overlay.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* Theme toggle: dark is the default; a visitor's choice is remembered in this browser. */
  const applyThemeLabels = () => {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    document.querySelectorAll(".theme-btn").forEach((b) => {
      b.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
      const l = b.querySelector(".theme-label"); if (l) l.textContent = light ? "Dark mode" : "Light mode";
    });
  };
  document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => {
    const light = document.documentElement.getAttribute("data-theme") !== "light";
    if (light) document.documentElement.setAttribute("data-theme", "light"); else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) { /* ignore */ }
    applyThemeLabels();
  }));
  applyThemeLabels();

  // Header state: observe a sentinel near the top of the page. Falls back to scroll events.
  const onScroll = () => { head.classList.toggle("scrolled", window.scrollY > 24); };
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  const sentinel = (top) => { const s = document.createElement("div"); s.setAttribute("aria-hidden", "true"); s.style.cssText = `position:absolute;left:0;top:${top};width:1px;height:1px;pointer-events:none;`; document.body.prepend(s); return s; };
  if ("IntersectionObserver" in window) {
    const topS = sentinel("24px");
    new IntersectionObserver(([e]) => head.classList.toggle("scrolled", !e.isIntersecting), { threshold: 0 }).observe(topS);
  }

  const foot = document.createElement("footer");
  foot.className = "site";
  foot.innerHTML = `
    <div class="wrap">
      <div class="cols">
        <div>
          <a class="logo" href="index.html"><span class="mark" aria-hidden="true"></span><span>${esc(name)}</span></a>
          <p style="margin-top:14px;max-width:26rem">AI websites and business automations built around how small businesses actually work. Based in ${esc(S.base || "")}, working with clients across ${esc((S.regions || []).join(", "))}.</p>
        </div>
        <div><h4>Explore</h4><ul><li><a href="solutions.html">Solutions</a></li><li><a href="industries.html">Industries</a></li><li><a href="case-studies.html">Case Studies</a></li><li><a href="index.html#process">Process</a></li></ul></div>
        <div><h4>Company</h4><ul><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li><li><a href="book.html">Book a Call</a></li></ul></div>
        <div><h4>Connect</h4><ul>
          ${S.email ? `<li><a href="mailto:${esc(S.email)}">Email</a></li>` : ""}
          ${S.whatsapp ? `<li><a href="https://wa.me/${esc(S.whatsapp)}" rel="noopener">WhatsApp</a></li>` : ""}
          ${S.linkedin ? `<li><a href="${esc(S.linkedin)}" rel="noopener">LinkedIn</a></li>` : ""}
        </ul></div>
      </div>
      <div class="bottom">
        <span>© ${new Date().getFullYear()} ${esc(name)}</span>
        <nav aria-label="Legal"><a href="legal.html#privacy">Privacy</a><a href="legal.html#terms">Terms</a><button class="motion-btn" type="button" aria-pressed="false">Reduce motion</button></nav>
      </div>
    </div>`;
  document.body.append(foot);

  /* No-animation mode: mirrors the OS reduced-motion setting, remembered in this browser. */
  document.querySelectorAll(".motion-btn").forEach((b) => {
    const on = document.documentElement.getAttribute("data-motion") === "reduced";
    b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Enable motion" : "Reduce motion";
    b.addEventListener("click", () => {
      try { localStorage.setItem("motion", on ? "full" : "reduced"); } catch (e) { /* ignore */ }
      location.reload();
    });
  });

  if (!["book", "contact"].includes(page)) {
    const sticky = document.createElement("div");
    sticky.className = "sticky-cta";
    sticky.innerHTML = `<span class="hint">Free 30-min strategy call</span><a class="btn primary" href="book.html">Book now <span class="arr">→</span></a>`;
    document.body.append(sticky);
    const showAt = () => sticky.classList.toggle("show", window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", showAt, { passive: true });
    if ("IntersectionObserver" in window) {
      const ctaS = sentinel("80vh");
      new IntersectionObserver(([e]) => sticky.classList.toggle("show", !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 }).observe(ctaS);
    }
  }

  /* ---------------------------------------------------------------
     Config substitutions
  --------------------------------------------------------------- */
  document.querySelectorAll("[data-site]").forEach((el) => {
    const k = el.dataset.site;
    if (k === "name") el.textContent = name;
    if (k === "email" && S.email) { el.textContent = S.email; if (el.tagName === "A") el.href = "mailto:" + S.email; }
    if (k === "responseTime") el.textContent = S.responseTime || "24 hours";
    if (k === "base") el.textContent = S.base || "";
    if (k === "regions") el.textContent = (S.regions || []).join(", ");
  });
  document.querySelectorAll("[data-contact]").forEach((el) => {
    const k = el.dataset.contact;
    if (k === "email") { if (S.email) el.href = "mailto:" + S.email; else el.hidden = true; }
    if (k === "whatsapp") { if (S.whatsapp) { el.href = "https://wa.me/" + S.whatsapp; el.rel = "noopener"; } else el.hidden = true; }
  });
  if (!document.title.includes(name)) document.title = document.title + " · " + name;

  /* ---------------------------------------------------------------
     Render data-driven blocks: [data-render="..."]
  --------------------------------------------------------------- */
  /* Mini-capture form ("Send me this by email"). Rendered here; conversion.js owns the submit handler. */
  const GOAL_OPTIONS = ["More bookings", "Capture and follow up leads", "Answer customers 24/7", "Stop chasing by hand", "Less admin", "More reviews", "Not sure yet"];
  const miniCapture = (kind, label = "Send me this by email", opts = {}) => `
    <form class="mini-capture" data-kind="${esc(kind)}" novalidate>
      <input type="email" name="email" placeholder="you@company.com" required aria-label="Email">
      <input type="url" name="website" placeholder="https://your-site.com" aria-label="Website (optional)">
      ${opts.goal ? `<select name="goal" aria-label="Main goal"><option value="">Main goal</option>${GOAL_OPTIONS.map((o) => `<option>${esc(o)}</option>`).join("")}</select>` : ""}
      <button class="btn sm primary" type="submit">${esc(label)}</button>
      <p class="status" role="status" aria-live="polite"></p>
    </form>`;
  window.miniCapture = miniCapture;

  /* opts.plain drops the bento size class so the card sits in a plain grid (detail pages). */
  const solCard = (s, extra = "", opts = {}) => `
    <a class="sol ${opts.plain ? "" : (s.size || "")} ${extra}" href="solution.html?id=${s.id}" data-industry="${s.industry.join(" ")}" data-use="${s.uses.join(" ")}">
      <span class="cat">${esc(s.cat)}</span>
      <h3>${esc(s.name)}</h3>
      ${s.badge ? `<span class="badge accent" style="align-self:flex-start">${esc(s.badge)}</span>` : ""}
      <ul class="peek" aria-label="Typical potential impact">${s.impact.slice(0, 3).map(([b, t]) => `<li><strong>${esc(b)}</strong> · ${esc(t)}</li>`).join("")}</ul>
      ${s.setup || s.bestFor ? `<div class="peek-meta">${s.setup ? `<span class="badge">Typical setup · ${esc(s.setup)}</span>` : ""}${s.bestFor ? `<span class="badge">Best for · ${esc(s.bestFor)}</span>` : ""}</div>` : ""}
      <p>${esc(s.outcome)}</p>
      ${renderFlow(s.flow.slice(0, !opts.plain && s.size === "tall" ? 7 : 4), { horizontal: true })}
      <span class="more">View solution →</span>
    </a>`;
  window.solCard = solCard;
  const caseCard = (c) => `
    <a class="case" href="case-study.html?id=${c.id}">
      <div class="meta"><span class="badge">${esc(c.industry)} · ${esc(c.country)}</span><span class="badge accent dot">${esc(c.status)}</span></div>
      <h3>${esc(c.title)}</h3>
      ${c.ifYou ? `<p class="if-you">${esc(c.ifYou)}</p>` : ""}
      <dl><div><dt>Problem</dt><dd>${esc(c.problem)}</dd></div><div><dt>Built</dt><dd>${esc(c.built)}</dd></div></dl>
      <div class="res">${c.results.map(([b, t]) => `<div><b>${esc(b)}</b> <span>${esc(t)}</span></div>`).join("")}</div>
    </a>`;

  /* 3D automation board for the hero. Falls back to the vertical rail where
     CSS motion paths are unsupported; the rail is also used under 640px. */
  function renderHero3D(el) {
    const supports3D = typeof CSS !== "undefined" && CSS.supports && CSS.supports("offset-path", 'path("M0 0 L1 1")') && CSS.supports("transform-style", "preserve-3d");
    const list = `<div class="hero-list panel"><div class="panel-head"><span class="live">System running</span><span>Lead → follow-up</span></div>${renderFlow(D.heroFlow)}</div>`;
    if (!supports3D) { el.innerHTML = list.replace('class="hero-list panel"', 'class="panel"'); return; }
    // Tile centres on the 600x420 board, serpentine path. --t is each tile's fraction along the path.
    const pos = [[80, 60], [280, 60], [480, 60], [480, 200], [280, 200], [80, 200], [80, 340]];
    const total = 400 + 140 + 400 + 140; const cum = [0, 200, 400, 540, 740, 940, 1080];
    const tiles = D.heroFlow.map(([icon, label, sub], i) => `
      <div class="tile" style="--x:${pos[i][0]}px;--y:${pos[i][1]}px;--t:${(cum[i] / total).toFixed(4)}">
        <span class="ripple"></span><span class="ripple r2"></span>
        <div class="face"><span class="ic">${D.icons[icon] || ""}</span><span><span>${esc(label)}</span><small>${esc(sub || "")}</small></span></div>
        <div class="sign">${esc(sub || label)}</div>
      </div>`).join("");
    el.innerHTML = `
      <div class="hero3d" aria-label="Interactive diagram: a lead travelling through the automated system">
        <div class="scaler"><div class="rig">
          <div class="board">
            <svg class="wires" viewBox="0 0 560 400" aria-hidden="true"><path class="base" d="M80 60 H480 V200 H80 V340"/><path class="trail" d="M80 60 H480 V200 H80 V340"/></svg>
            <div class="packet-shadow" aria-hidden="true"></div>
            ${tiles}
            <div class="packet" aria-hidden="true"></div>
          </div>
        </div></div>
        <div class="legend"><span class="live">System running</span><span>Move to look around · hover a step</span></div>
      </div>
      ${list}`;
    const stage = el.querySelector(".hero3d");
    const fit = () => stage.style.setProperty("--sc", String(Math.min(1, stage.clientWidth / 600)));
    fit(); if ("ResizeObserver" in window) new ResizeObserver(fit).observe(stage); else window.addEventListener("resize", fit);
    if (reduced) return;
    const area = el.closest(".hero") || stage;
    area.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = area.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      stage.style.setProperty("--rx", (48 - ny * 8).toFixed(2) + "deg");
      stage.style.setProperty("--rz", (-34 + nx * 10).toFixed(2) + "deg");
    }, { passive: true });
    area.addEventListener("pointerleave", () => { stage.style.removeProperty("--rx"); stage.style.removeProperty("--rz"); });
  }

  /* Top hero: floating outcome bubbles, six slots around the headline, labels cycling through a pool. */
  const ORBIT_POOL = [
    ["cal", "Booking confirmed · 9:12 pm", 40], ["msg", "Missed call answered", 200], ["lead", "New lead qualified", 150],
    ["bell", "Follow-up sent · day 3", 280], ["doc", "Quote chased automatically", 20], ["star", "Review request sent", 320],
    ["crm", "CRM updated, no typing", 90], ["check", "Reminder delivered", 260], ["chart", "Weekly report ready", 180], ["team", "Handed to the right person", 120],
  ];
  const ORBIT_SLOTS = [[7, 24], [11, 68], [23, 92], [93, 22], [88, 66], [77, 92]];
  function renderOrbit(el) {
    const orb = (item, pos, i) => `<div class="orb" style="--x:${pos[0]};--y:${pos[1]};--i:${i}"><span class="av" style="--h:${item[2]}">${D.icons[item[0]] || ""}</span><span class="tag">${esc(item[1])}</span></div>`;
    el.innerHTML = ORBIT_SLOTS.map((pos, i) => orb(ORBIT_POOL[i], pos, i)).join("");
    if (reduced) return;
    let next = ORBIT_SLOTS.length, busy = false;
    setInterval(() => {
      if (document.hidden || busy) return;
      const orbs = el.querySelectorAll(".orb"); if (!orbs.length) return;
      const o = orbs[Math.floor(Math.random() * orbs.length)]; const item = ORBIT_POOL[next++ % ORBIT_POOL.length];
      busy = true; o.classList.add("swap");
      setTimeout(() => { o.querySelector(".av").innerHTML = D.icons[item[0]] || ""; o.querySelector(".av").style.setProperty("--h", item[2]); o.querySelector(".tag").textContent = item[1]; }, 260);
      setTimeout(() => { o.classList.remove("swap"); busy = false; }, 700);
    }, 3200);
  }

  document.querySelectorAll("[data-render]").forEach((el) => {
    const what = el.dataset.render;
    if (what === "hero-orbit") renderOrbit(el);
    if (what === "hero-flow") el.innerHTML = renderFlow(D.heroFlow);
    if (what === "hero-3d") renderHero3D(el);
    if (what === "industry-bar") el.innerHTML = D.industries.map((i) => { const s = DATA_BY_ID.solution(i.sols[0]); return `<a class="ib" href="industries.html#${i.id}">${esc(i.name)}<span class="tipbox" role="tooltip"><b>Where it leaks</b>${esc(i.pain)}${s ? ` <b style="margin-top:6px">We start with</b>${esc(s.name)} · ${esc(s.badge || "")}` : ""}</span></a>`; }).join("");
    if (what === "explainer") el.innerHTML = renderFlow([["cal", "Pick a time"], ["ai", "We audit your process"], ["doc", "You get a custom automation plan"]], { horizontal: true });
    if (what === "catalog-preview") el.innerHTML = D.solutions.map((s) => solCard(s)).join("");
    if (what === "catalog") el.innerHTML = D.solutions.map((s) => solCard(s)).join("");
    if (what === "cases") el.innerHTML = D.cases.map(caseCard).join("");
    if (what === "industries") el.innerHTML = D.industries.map((ind) => `
      <article class="industry" id="${ind.id}">
        <span class="badge">${esc(ind.who)}</span>
        <h3>${esc(ind.name)}</h3>
        <p><strong style="color:var(--text)">Where it leaks:</strong> ${esc(ind.pain)}</p>
        <div class="links">${ind.sols.map((id) => { const s = DATA_BY_ID.solution(id); return s ? `<a href="solution.html?id=${s.id}">${esc(s.name)}</a>` : ""; }).join("")}<a class="btn quiet" href="solutions.html?industry=${encodeURIComponent(industryFilter(ind.id))}">See solutions for ${esc(ind.name)} →</a></div>
      </article>`).join("");
  });

  /* Top hero form: one field, then the audit modal with the website pre-filled. Falls back to the contact page. */
  const heroForm = document.querySelector(".hero-top-form");
  if (heroForm) heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = heroForm.querySelector('[name="website"]').value.trim();
    const site = raw && !/^https?:\/\//i.test(raw) ? "https://" + raw : raw;
    if (window.DS && DS.track) DS.track("hero_audit_start", { hasWebsite: !!site });
    if (window.DS && DS.openAudit) DS.openAudit("hero_audit", { website: site });
    else location.href = "contact.html" + (site ? "?website=" + encodeURIComponent(site) : "");
  });

  /* ---------------------------------------------------------------
     Effects: kinetic headline, personalised hero, mesh, cursor halo
  --------------------------------------------------------------- */
  const hero = document.querySelector(".hero");
  if (hero) {
    const params = new URLSearchParams(location.search);
    const forId = params.get("for");
    const ind = forId && D.industries.find((i) => i.id === forId);
    const h1 = hero.querySelector("h1, .hero-title");
    const topHero = document.querySelector(".hero-top");
    if (ind && h1) {
      hero.querySelector(".eyebrow").textContent = "AI automation agency · " + ind.name;
      h1.textContent = `AI websites and automations for ${ind.name.toLowerCase()}.`;
      if (topHero) { topHero.querySelector(".eyebrow").textContent = "AI automation agency · " + ind.name; topHero.querySelector("h1").textContent = `AI websites and automations for ${ind.name.toLowerCase()}.`; }
      const lead = hero.querySelector(".lead");
      if (lead) lead.textContent = ind.hero || `${ind.pain} We build the website and the automations that close those gaps, in tools you already use.`;
      const explore = hero.querySelector('a[href="solutions.html"]'); if (explore) explore.href = "solutions.html?industry=" + encodeURIComponent(industryFilter(ind.id));
    }
    // Kinetic headline on load: the top hero's h1 when present, otherwise the hero heading (the other one animates on view).
    const kin = (topHero && topHero.querySelector("h1")) || h1;
    if (kin && !reduced) {
      const words = kin.textContent.trim().split(/\s+/);
      kin.classList.add("kinetic"); kin.classList.remove("reveal", "d1", "kinetic-on-view");
      kin.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");
    }
    const mesh = document.createElement("div"); mesh.className = "mesh"; mesh.setAttribute("aria-hidden", "true"); mesh.innerHTML = "<i></i><i></i><i></i>";
    hero.prepend(mesh);
  }
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    const halo = document.createElement("div"); halo.id = "halo"; halo.setAttribute("aria-hidden", "true"); document.body.append(halo);
    window.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; halo.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; halo.style.opacity = "1"; }, { passive: true });
    document.addEventListener("mouseleave", () => { halo.style.opacity = "0"; });
  }

  /* Replay buttons on flow diagrams */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-replay]"); if (!btn) return;
    const flow = btn.closest(".panel")?.querySelector(".flow"); if (!flow) return;
    flow.classList.remove("run"); void flow.offsetWidth; flow.classList.add("run");
  });

  /* Before / after slider */
  document.addEventListener("input", (e) => {
    const r = e.target; const box = r.closest && r.closest(".ba-slider");
    if (box && r.type === "range") box.style.setProperty("--pos", r.value + "%");
  });

  /* ---------------------------------------------------------------
     Build your stack: industry + goal → recommended solutions
  --------------------------------------------------------------- */
  const cfg = document.querySelector('[data-render="configurator"]');
  if (cfg) {
    const GOALS = [["booking", "More bookings"], ["leads", "Capture and follow up leads"], ["support", "Answer customers 24/7"], ["followup", "Stop chasing by hand"], ["ops", "Less admin"], ["reviews", "More reviews"]];
    const INDS = Object.entries(D.industryLabels);
    /* Quick-start presets: [id, label, industry chip, goal chip]. Each one clicks the two real chips. */
    const PRESETS = [["clinic", "Clinic", "healthcare", "booking"], ["gym", "Gym / studio", "fitness", "leads"], ["salon", "Salon", "other", "booking"], ["home", "Home service", "home", "leads"], ["store", "Online store", "ecommerce", "support"], ["pro", "Professional service", "professional", "leads"]];
    const state = { industry: "", goal: "" };
    cfg.innerHTML = `
      <div>
        <div class="presets" aria-label="Quick presets"><span class="lbl">Quick start</span>${PRESETS.map(([k, v]) => `<button class="chip" type="button" data-preset="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div>
        <div class="q"><div class="lbl">1 · Your industry</div><div class="chips" data-g="industry">${INDS.map(([k, v]) => `<button class="chip" type="button" data-v="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div></div>
        <div class="q"><div class="lbl">2 · Main goal</div><div class="chips" data-g="goal">${GOALS.map(([k, v]) => `<button class="chip" type="button" data-v="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div></div>
      </div>
      <div class="result">
        <p class="sr" aria-live="polite" data-announce></p>
        <ol class="progress" aria-label="Progress"><li data-step="industry">Industry</li><li data-step="goal">Goal</li><li data-step="stack">Your stack</li></ol>
        <div class="head"><h3>Your recommended stack</h3><span class="badge">Rule-based · not a quote</span></div><div class="body"></div>
      </div>`;
    const body = cfg.querySelector(".body");
    const progress = cfg.querySelectorAll(".progress [data-step]");
    const presetBtns = cfg.querySelectorAll("[data-preset]");
    const syncMeta = () => {
      const ready = !!(state.industry && state.goal);
      progress.forEach((li) => { const k = li.dataset.step; li.classList.toggle("done", k === "stack" ? ready : !!state[k]); });
      presetBtns.forEach((b) => { const p = PRESETS.find((x) => x[0] === b.dataset.preset); b.setAttribute("aria-pressed", String(!!p && p[2] === state.industry && p[3] === state.goal)); });
    };
    const render = () => {
      syncMeta();
      if (!state.industry || !state.goal) { body.innerHTML = `<p class="empty">Pick an industry and a goal. We will show the website and the two or three automations we would start with.</p>`; return; }
      const scored = D.solutions.map((s) => ({ s, score: (s.uses.includes(state.goal) ? 2 : 0) + (s.industry.includes(state.industry) ? 1 : 0) + (s.uses[0] === state.goal ? 1 : 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
      const indName = D.industryLabels[state.industry] || "your business";
      body.innerHTML = `
        <div class="stack">
          <div class="item web"><span class="n">00</span><div><b>AI website for ${esc(indName.toLowerCase())}</b><span>Fast, answers questions from your own material, captures every visitor's details. The base every stack sits on.</span></div></div>
          ${scored.map(({ s }, i) => `<a class="item" href="solution.html?id=${s.id}"><span class="n">0${i + 1}</span><div><b>${esc(s.name)}</b><span>${esc(s.outcome)}</span></div></a>`).join("")}
        </div>
        <div class="cta"><a class="btn primary" href="book.html?industry=${encodeURIComponent(state.industry)}&goal=${encodeURIComponent(state.goal)}">Get a custom version of this for your business <span class="arr">→</span></a></div>
        <p class="fine">This is a starting point. We'll refine it after understanding your exact tools and constraints.</p>
        ${miniCapture("stack", "Send me this stack by email")}`;
      const ann = cfg.querySelector("[data-announce]"); if (ann) ann.textContent = `Stack updated: AI website plus ${scored.length} automations for ${indName}.`;
    };
    cfg.querySelectorAll("[data-g] .chip").forEach((chip) => chip.addEventListener("click", () => {
      const g = chip.closest("[data-g]").dataset.g; state[g] = chip.dataset.v;
      chip.closest("[data-g]").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      render();
    }));
    presetBtns.forEach((b) => b.addEventListener("click", () => {
      const p = PRESETS.find((x) => x[0] === b.dataset.preset); if (!p) return;
      const ind = cfg.querySelector(`[data-g="industry"] .chip[data-v="${p[2]}"]`), goal = cfg.querySelector(`[data-g="goal"] .chip[data-v="${p[3]}"]`);
      if (ind) ind.click(); if (goal) goal.click();
    }));
    render();

    /* Stack canvas: build a stack by hand. Drag modules into "Your stack" (HTML5 drag and drop on
       pointer devices) or tap a module to add/remove it (touch, keyboard). The summary is assembled
       from each solution's first "typical potential impact" line, so it never invents outcomes.
       "Use this as my starting point" opens the workflow modal with the modules pre-filled. */
    const canvas = document.createElement("div");
    canvas.className = "stack-canvas";
    canvas.innerHTML = `
      <div class="lbl">Or build it by hand</div>
      <div class="canvas">
        <div class="modules" aria-label="Available modules">
          <span class="chip module base" aria-disabled="true" title="Every stack starts with the AI website">AI website <span class="x">base</span></span>
          ${D.solutions.map((s) => `<button class="chip module" type="button" draggable="true" data-id="${s.id}" aria-pressed="false">${esc(s.name)} <span class="x" aria-hidden="true">+</span></button>`).join("")}
        </div>
        <div class="dropzone" data-empty="true" aria-label="Your stack" aria-live="polite"></div>
      </div>
      <p class="stack-summary"><b>Typical potential impact</b><span>Add a module to see what this stack is built to do.</span></p>
      <div class="row"><button class="btn primary" type="button" data-stack-use disabled>Use this as my starting point <span class="arr">→</span></button><span class="fine" style="margin:0">Opens the workflow form with these modules filled in.</span></div>`;
    cfg.append(canvas);
    const zone = canvas.querySelector(".dropzone"), summary = canvas.querySelector(".stack-summary span"), useBtn = canvas.querySelector("[data-stack-use]");
    let selected = [];
    let stackTracked = false;
    const renderCanvas = () => {
      zone.innerHTML = selected.map((id) => { const s = DATA_BY_ID.solution(id); return s ? `<button class="chip module" type="button" data-id="${s.id}" aria-pressed="true" aria-label="Remove ${esc(s.name)}">${esc(s.name)} <span class="x" aria-hidden="true">×</span></button>` : ""; }).join("");
      zone.dataset.empty = String(!selected.length);
      canvas.querySelectorAll(".modules .module[data-id]").forEach((m) => m.setAttribute("aria-pressed", String(selected.includes(m.dataset.id))));
      if (!selected.length) { summary.textContent = "Add a module to see what this stack is built to do."; useBtn.disabled = true; return; }
      const lines = selected.map((id) => DATA_BY_ID.solution(id)).filter(Boolean).map((s) => s.outcome.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase()));
      summary.textContent = "AI website + " + selected.length + " automation" + (selected.length > 1 ? "s" : "") + ". This stack is built to: " + lines.join("; ") + ". Ranges are targets, not measured results.";
      useBtn.disabled = false;
      if (!stackTracked) { stackTracked = true; if (window.DS && DS.track) DS.track("stack_configured", { modules: selected.length }); }
    };
    const toggle = (id) => { selected = selected.includes(id) ? selected.filter((x) => x !== id) : selected.concat(id); renderCanvas(); };
    canvas.addEventListener("click", (e) => { const m = e.target.closest(".module[data-id]"); if (m) toggle(m.dataset.id); });
    canvas.querySelectorAll(".modules .module[data-id]").forEach((m) => {
      m.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", m.dataset.id); e.dataTransfer.effectAllowed = "copy"; m.classList.add("dragging"); });
      m.addEventListener("dragend", () => m.classList.remove("dragging"));
    });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); const id = e.dataTransfer.getData("text/plain"); if (id && !selected.includes(id) && DATA_BY_ID.solution(id)) { selected = selected.concat(id); renderCanvas(); } });
    useBtn.addEventListener("click", () => {
      const names = ["AI website"].concat(selected.map((id) => (DATA_BY_ID.solution(id) || {}).name).filter(Boolean));
      if (window.DS && DS.openWorkflow) DS.openWorkflow({ stack: names.join(" + "), message: "Starting point: " + names.join(" + ") + "." }, useBtn);
      else location.href = "contact.html";
    });
    /* Keep the canvas in step with the recommended stack when a preset or chip pair is chosen. */
    const origRender = render;
    const syncCanvas = () => { if (state.industry && state.goal) { selected = Array.from(body.querySelectorAll(".stack a.item")).map((a) => (a.getAttribute("href").split("id=")[1] || "")).filter(Boolean); renderCanvas(); } };
    cfg.querySelectorAll("[data-g] .chip, [data-preset]").forEach((c) => c.addEventListener("click", () => setTimeout(syncCanvas, 0)));
    void origRender;
  }

  /* ---------------------------------------------------------------
     ROI calculator. Everything here is MODELLED from the visitor's
     own inputs and the two visible assumptions. Never presented as a result.
  --------------------------------------------------------------- */
  const roi = document.querySelector('[data-render="roi"]');
  if (roi) {
    /* Example businesses: illustrative defaults only, stated in the title so nothing is hidden. */
    const ROI_PRESETS = [
      ["clinic", "Small clinic", { leads: 80, close: 35, value: 120, hours: 12, rate: 20 }],
      ["local", "Local service business", { leads: 40, close: 30, value: 350, hours: 10, rate: 25 }],
      ["store", "Online store", { leads: 200, close: 8, value: 70, hours: 15, rate: 18 }],
      ["agency", "Consulting / agency", { leads: 25, close: 25, value: 2500, hours: 8, rate: 40 }],
    ];
    const presetTitle = (v) => `Illustrative defaults: ${v.leads} enquiries a month, ${v.close}% become customers, ${v.value} per customer, ${v.hours} admin hours a week, ${v.rate} per hour`;
    roi.innerHTML = `
      <div class="roi-diagram" style="grid-column:1/-1">${renderFlow([["lead", "Enquiries"], ["msg", "Instant replies"], ["cal", "More bookings + less admin"], ["chart", "Extra revenue"]], { horizontal: true })}</div>
      <div class="inputs">
        <div class="presets" data-presets="roi" aria-label="Example businesses"><span class="lbl">Try an example</span>${ROI_PRESETS.map(([k, l, v]) => `<button class="chip" type="button" data-preset="${k}" aria-pressed="false" title="${esc(presetTitle(v))}">${esc(l)}<span class="sr"> — ${esc(presetTitle(v))}</span></button>`).join("")}<span class="fine" style="flex-basis:100%;margin:6px 0 0">Example numbers only. Swap in your own.</span></div>
        <label>Currency <select name="cur"><option>$</option><option>£</option><option>€</option><option>₹</option><option>AED</option><option>A$</option><option>S$</option></select></label>
        <label>New enquiries per month <input type="number" name="leads" value="60" min="0"></label>
        <div class="range-row"><input type="range" data-for="leads" min="0" max="500" step="5" value="60" aria-label="New enquiries per month, slider"></div>
        <label>Enquiries that become customers now (%) <input type="number" name="close" value="20" min="0" max="100"></label>
        <div class="range-row"><input type="range" data-for="close" min="0" max="100" step="1" value="20" aria-label="Enquiries that become customers, slider"></div>
        <label>Average value of one customer <input type="number" name="value" value="200" min="0"></label>
        <div class="range-row"><input type="range" data-for="value" min="0" max="5000" step="10" value="200" aria-label="Average value of one customer, slider"></div>
        <label>Hours per week on repetitive admin <input type="number" name="hours" value="10" min="0"></label>
        <div class="range-row"><input type="range" data-for="hours" min="0" max="60" step="1" value="10" aria-label="Hours per week on repetitive admin, slider"></div>
        <label>Cost of one hour of that time <input type="number" name="rate" value="25" min="0"></label>
        <div class="assume">
          <div class="lbl"><span class="badge accent">Modelled</span> Assumptions you can change</div>
          <label>Share of admin hours that can be automated (%) <input type="number" name="autoShare" value="60" min="0" max="100"></label>
          <label>Relative lift in conversion from instant replies (%) <input type="number" name="lift" value="15" min="0" max="100"></label>
        </div>
      </div>
      <div class="out">
        <div class="metric"><b data-o="hours">—</b><span>hours given back per month</span><small>= admin hours × 4.33 × automatable share</small></div>
        <div class="metric"><b data-o="cost">—</b><span>admin cost removed per month</span><small>= hours given back × hourly cost</small></div>
        <div class="metric"><b data-o="customers">—</b><span>extra customers per month</span><small>= enquiries × conversion × lift</small></div>
        <div class="metric"><b data-o="revenue">—</b><span>extra revenue per month</span><small>= extra customers × customer value</small></div>
        <p class="note">Modelled estimate from your inputs and the assumptions above. Not a forecast or a guarantee. On a call we replace the assumptions with numbers from your own tools.</p>
        <details class="estimate"><summary>How we estimate this</summary><p>Hours given back = your admin hours × 4.33 weeks × the share you say can be automated. Cost removed = those hours × your hourly cost. Extra customers = your enquiries × your current conversion × the lift you set. Extra revenue = extra customers × your customer value. Every input is yours; the two assumptions are editable and start at values we consider cautious. Nothing here is measured from your business yet.</p></details>
        <div class="cta"><a class="btn primary" href="book.html">Want a tailored version? Book a call <span class="arr">→</span></a></div>
        <p class="fine">We can walk through these numbers with you on a 30-min call and show exactly where automation fits.</p>
        ${miniCapture("roi", "Send me these numbers by email")}
      </div>`;
    const g = (n) => parseFloat(roi.querySelector(`[name="${n}"]`).value) || 0;
    const fmt = (n) => n >= 1000 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toLocaleString();
    const FIELDS = ["cur", "leads", "close", "value", "hours", "rate", "autoShare", "lift"];
    /* Outputs tween from their previous value (short, opacity-free) so the slider feels live; instant under reduced motion. */
    const shown = {};
    const setOut = (key, value, render) => {
      const el = roi.querySelector(`[data-o="${key}"]`);
      const from = shown[key] == null ? value : shown[key]; shown[key] = value;
      if (reduced || from === value || !Number.isFinite(from)) { el.textContent = render(value); return; }
      const t0 = performance.now();
      const tick = (t) => { const p = Math.min(1, (t - t0) / 260); const v = from + (value - from) * (1 - Math.pow(1 - p, 3)); el.textContent = render(p < 1 ? v : value); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    const syncRanges = () => roi.querySelectorAll('input[type="range"][data-for]').forEach((r) => {
      const f = roi.querySelector(`[name="${r.dataset.for}"]`); if (!f) return;
      r.value = f.value; r.style.setProperty("--fill", ((r.value - r.min) / (r.max - r.min) * 100) + "%");
    });
    const calc = () => {
      const cur = roi.querySelector('[name="cur"]').value;
      const hours = g("hours") * 4.33 * (g("autoShare") / 100);
      const cost = hours * g("rate");
      const customers = g("leads") * (g("close") / 100) * (g("lift") / 100);
      const revenue = customers * g("value");
      setOut("hours", hours, (v) => fmt(v) + " h");
      setOut("cost", cost, (v) => cur + " " + Math.round(v).toLocaleString());
      setOut("customers", customers, (v) => fmt(v));
      setOut("revenue", revenue, (v) => cur + " " + Math.round(v).toLocaleString());
      syncRanges();
    };
    const presetBtns = roi.querySelectorAll("[data-preset]");
    presetBtns.forEach((b) => b.addEventListener("click", () => {
      const p = ROI_PRESETS.find((x) => x[0] === b.dataset.preset); if (!p) return;
      Object.entries(p[2]).forEach(([k, v]) => { const f = roi.querySelector(`[name="${k}"]`); if (f) f.value = v; });
      presetBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      calc(); persist();
    }));
    /* Remember the visitor's numbers in this browser; a shared link (?roi_…=) wins over the memory. */
    const persist = () => { try { const o = {}; FIELDS.forEach((k) => { o[k] = roi.querySelector(`[name="${k}"]`).value; }); localStorage.setItem("roi:inputs", JSON.stringify(o)); } catch (e) { /* ignore */ } };
    const applyValues = (o) => { FIELDS.forEach((k) => { if (o[k] != null && o[k] !== "") { const f = roi.querySelector(`[name="${k}"]`); if (f) f.value = o[k]; } }); };
    const params = new URLSearchParams(location.search);
    const fromUrl = {}; FIELDS.forEach((k) => { if (params.has("roi_" + k)) fromUrl[k] = params.get("roi_" + k); });
    if (Object.keys(fromUrl).length) applyValues(fromUrl);
    else { try { const saved = JSON.parse(localStorage.getItem("roi:inputs") || "null"); if (saved) applyValues(saved); } catch (e) { /* ignore */ } }
    let roiUsed = false;
    roi.addEventListener("input", (e) => {
      if (e.target.closest(".mini-capture")) return;
      if (e.target.type === "range" && e.target.dataset.for) { const f = roi.querySelector(`[name="${e.target.dataset.for}"]`); if (f) f.value = e.target.value; }
      presetBtns.forEach((x) => x.setAttribute("aria-pressed", "false"));
      calc(); persist();
      if (!roiUsed) { roiUsed = true; if (window.DS && DS.track) DS.track("roi_calculator_used"); }
    });
    /* Share: a link that reopens the calculator with these numbers. Copies to the clipboard, or shows the link to copy by hand. */
    const share = document.createElement("div"); share.className = "share";
    share.innerHTML = `<button class="btn sm ghost" type="button" data-roi-share>Share this estimate</button><input class="link" type="text" readonly aria-label="Shareable link" hidden><p class="status" role="status" aria-live="polite"></p>`;
    roi.querySelector(".out .cta").after(share);
    share.querySelector("[data-roi-share]").addEventListener("click", async () => {
      const u = new URL(location.href.split("#")[0]);
      FIELDS.forEach((k) => u.searchParams.set("roi_" + k, roi.querySelector(`[name="${k}"]`).value));
      u.hash = "roi";
      const link = share.querySelector(".link"), st = share.querySelector(".status");
      link.value = u.toString(); link.hidden = false;
      try { await navigator.clipboard.writeText(u.toString()); st.textContent = "Link copied. It reopens this calculator with your numbers."; }
      catch (e) { link.select(); st.textContent = "Copy the link above to save or send this estimate."; }
      if (window.DS && DS.track) DS.track("roi_shared");
    });
    calc();
  }

  /* ---------------------------------------------------------------
     Exit-intent offer (desktop, once per session, not on booking/contact)
  --------------------------------------------------------------- */
  /* Audit offer: exit-intent on pointer devices, scroll-depth + time on touch devices. Once per session.
     PLUG IN: submits to SITE.formEndpoint with source=exit_intent_audit (or source=mobile_engagement). */
  if (!["book", "contact"].includes(page)) {
    let shown = false; try { shown = sessionStorage.getItem("exitShown") === "1"; } catch (e) { /* ignore */ }
    const RT = S.responseTime || "24 hours";
    const armed = Date.now() + 8000;
    const modal = document.createElement("div"); modal.className = "modal"; modal.id = "audit-modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "exit-title");
    modal.innerHTML = `<div class="box">
      <button class="close" type="button" aria-label="Close">×</button>
      <p class="eyebrow">Before you go</p>
      <h3 id="exit-title">Get a free 5-minute automation audit</h3>
      <p>Tell us your website and biggest bottleneck. We usually reply within ${esc(RT)} with 2–3 concrete automations we'd build for you.</p>
      <form novalidate>
        <input type="url" name="website" placeholder="https://your-website.com" aria-label="Website" autocomplete="url" inputmode="url" required>
        <input type="email" name="email" placeholder="you@company.com" aria-label="Work email" autocomplete="email" inputmode="email" required>
        <select name="bottleneck" aria-label="Biggest bottleneck right now"><option value="">Biggest bottleneck (optional)</option><option>Missed leads</option><option>Manual follow-up</option><option>Booking</option><option>Admin</option><option>Support</option><option>Not sure</option></select>
        <textarea name="message" rows="2" placeholder="Anything else? (optional)" aria-label="Message (optional)"></textarea>
        <input type="hidden" name="_subject" value="Free automation audit request">
        <input type="hidden" name="source" value="exit_intent_audit">
        <input type="hidden" name="page" value="">
        <input type="hidden" name="timezone" value="${esc((() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })())}">
        <button class="btn primary" type="submit">Send me the audit <span class="arr">→</span></button>
        <p class="status" role="status" aria-live="polite"></p>
        <p class="fine">No newsletter. We only use this to send your audit.</p>
      </form>
    </div>`;
    document.body.append(modal);
    let opener = null;
    const open = (source, force) => {
      if (shown && !force) return;
      shown = true; try { sessionStorage.setItem("exitShown", "1"); } catch (err) { /* ignore */ }
      modal.querySelector(".eyebrow").textContent = force ? "Free audit" : "Before you go";
      modal.querySelector('[name="source"]').value = source;
      modal.querySelector('[name="page"]').value = location.pathname + location.search;
      opener = document.activeElement;
      modal.classList.add("open"); document.body.classList.add("modal-open");
      if (window.DS && DS.track) DS.track("audit_shown", { source });
      modal.querySelector("input").focus();
    };
    const close = () => {
      if (!modal.classList.contains("open")) return;
      modal.classList.remove("open"); document.body.classList.remove("modal-open");
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
      opener = null;
    };
    /* Deliberate open (top hero form): always opens, pre-fills the website, focuses the email field. */
    window.DS = window.DS || {};
    window.DS.openAudit = (source, prefill) => {
      open(source || "hero_audit", true);
      const w = modal.querySelector('[name="website"]'); if (prefill && prefill.website) w.value = prefill.website;
      (w.value ? modal.querySelector('[name="email"]') : w).focus();
    };
    modal.querySelector(".close").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    if (window.matchMedia("(hover: hover)").matches) {
      document.addEventListener("mouseout", (e) => { if (e.relatedTarget || e.clientY > 8 || Date.now() < armed) return; open("exit_intent_audit"); });
    } else {
      // Touch devices: after 25 s on the page and at least half of it scrolled.
      const t0 = Date.now(); let deep = false;
      const check = () => { const h = document.documentElement.scrollHeight - window.innerHeight; if (h > 0 && window.scrollY / h >= 0.5) deep = true; if (deep && Date.now() - t0 > 25000) { open("mobile_engagement"); window.removeEventListener("scroll", check); } };
      window.addEventListener("scroll", check, { passive: true });
      setTimeout(check, 26000);
    }
    modal.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, st = f.querySelector(".status"), data = new FormData(f);
      if (!data.get("page")) data.set("page", location.pathname + location.search);
      data.set("test_mode", S.testMode ? "true" : "false");
      const emailV = String(data.get("email") || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailV)) { st.className = "status err"; st.textContent = "Add a valid email so we can send the audit."; f.querySelector('[name="email"]').focus(); return; }
      const success = () => {
        f.innerHTML = `<p class="status ok" role="status">We'll send your automation audit to <b>${esc(emailV)}</b> within ${esc(RT)}.</p>
          <a class="btn primary" href="book.html" style="justify-content:center">Book a live walkthrough instead <span class="arr">→</span></a>`;
      };
      const endpoint = S.auditEndpoint || S.formEndpoint; // PLUG IN: audit requests can go to their own endpoint
      if (endpoint) {
        if (f.dataset.pending === "1") return; // one submission at a time
        f.dataset.pending = "1"; const sb = f.querySelector('button[type="submit"]') || f.querySelector("button"); sb.disabled = true; sb.setAttribute("aria-busy", "true");
        try {
          const res = await window.DS.postForm(data, endpoint);
          if (!res.ok) throw new Error("HTTP " + res.status); success();
        } catch (err) { st.className = "status err"; st.textContent = "Something went wrong on our side. Please try again, or email " + (S.email || "us") + " with your website instead."; sb.removeAttribute("aria-busy"); }
        finally { f.dataset.pending = ""; sb.disabled = false; }
      } else {
        location.href = "mailto:" + (S.email || "") + "?subject=" + encodeURIComponent("Free automation audit") + "&body=" + encodeURIComponent("Website: " + data.get("website") + "\nBiggest bottleneck: " + (data.get("bottleneck") || "not given") + "\nMessage: " + (data.get("message") || "-") + "\nEmail: " + emailV);
        st.className = "status ok"; st.textContent = "Opening your email app. If nothing happens, email " + (S.email || "us") + " directly.";
      }
    });
  }

  /* ---------------------------------------------------------------
     Solution detail page
  --------------------------------------------------------------- */
  if (page === "solution") {
    const id = new URLSearchParams(location.search).get("id");
    const s = DATA_BY_ID.solution(id) || D.solutions[0];
    document.title = s.name + " · " + name;
    const root = document.getElementById("solution-root");
    const related = D.cases.filter((c) => (c.solutions || []).includes(s.id));
    /* 2–3 other solutions that share a job (weighted) or an industry with this one. */
    const relatedSols = D.solutions.filter((o) => o.id !== s.id)
      .map((o) => ({ o, score: o.uses.filter((u) => s.uses.includes(u)).length * 2 + o.industry.filter((i) => s.industry.includes(i)).length }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.o);
    root.innerHTML = `
      <section class="page-head">
        <div class="wrap">
          <div class="crumbs"><a href="solutions.html">Solutions</a> / ${esc(s.cat)}</div>
          <div class="detail-split">
            <div>
              <p class="eyebrow">${esc(s.cat)}</p>
              <h1>${esc(s.name)}</h1>
              <p class="lead">${esc(s.tagline)}</p>
              <p class="fine">Deployed in your own accounts. No lock-in.</p>
              <div class="row" style="margin-top:var(--s3)">
                <a class="btn primary" href="book.html">Book a Free Strategy Call <span class="arr">→</span></a>
                <a class="btn ghost" href="solutions.html">Explore Solutions</a>
              </div>
              <p class="cta-sub">We'll map this onto your tools and give you a fixed price.</p>
              <div class="tags" style="margin-top:var(--s3)">${(s.stack || []).map((t) => `<span class="badge">${esc(t)}</span>`).join("")}</div>
            </div>
            <div class="sticky panel">
              <div class="panel-head"><span class="live">The system</span><span>${s.flow.length} steps · <button class="replay" type="button" data-replay>▶ Play</button></span></div>
              ${renderFlow(s.flow, { big: true })}
              <p class="panel-foot">Each step runs in tools you own. Nothing in this flow waits for a person unless you want it to.</p>
            </div>
          </div>
        </div>
      </section>
      <div class="wrap numbered">
        <section><h2>The problem</h2><div class="prose"><p>${esc(s.problem)}</p></div></section>
        <section><h2>What's included</h2><div class="features">${s.included.map(([b, t]) => `<div class="feature"><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join("")}</div></section>
        <section><h2>How it works</h2><div class="steps">${s.how.map(([b, t]) => `<div class="hstep"><div><b>${esc(b)}</b><span>${esc(t)}</span></div></div>`).join("")}</div></section>
        <section>
          <h2>Expected impact</h2>
          <div class="impact reveal">${s.impact.map(([b, t]) => `<div class="metric"><b>${esc(b)}</b><span>${esc(t)}</span><small>Typical potential impact</small></div>`).join("")}</div>
          <p class="note" style="margin-top:var(--s2)">Typical potential impact. Ranges reflect how this kind of workflow usually performs. We report your actual numbers from your own dashboards once the system is live.</p>
          <details class="estimate"><summary>How we estimate this</summary><p>These ranges are based on how this kind of workflow usually performs. They are targets we design for, not results we have measured. Your numbers depend on your volume, your tools and how fast you reply today. Once the system is live, we replace these figures with real numbers from your own dashboard.</p></details>
        </section>
        ${related.length ? `<section><h2>Related case studies</h2><div class="cases">${related.map(caseCard).join("")}</div></section>` : ""}
        ${relatedSols.length ? `<section><h2>Related solutions</h2><div class="prose" style="margin-bottom:var(--s3)"><p>Most businesses run two of these together. These share a job or an industry with ${esc(s.name)}.</p></div><div class="related-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--s2)">${relatedSols.map((o) => solCard(o, "", { plain: true })).join("")}</div></section>` : ""}
      </div>
      <div class="wrap"><div class="capture reveal" style="margin-bottom:var(--s5)"><p class="capture-title">Want this page in your inbox? We'll send it with a short note on how it would fit your business.</p>${miniCapture("solution", "Send me this solution by email")}</div></div>
      <section class="block cta-band">
        <div class="wrap">
          <h2>Want this running in your business?</h2>
          <p>Tell us how it works today. We'll map this system onto your tools and give you a fixed price.</p>
          <div class="actions"><a class="btn primary" href="book.html">Book a Free Strategy Call <span class="arr">→</span></a><a class="btn ghost" href="solutions.html">Explore Solutions</a></div>
        </div>
      </section>`;
  }

  /* ---------------------------------------------------------------
     Case study detail page
  --------------------------------------------------------------- */
  if (page === "case-study") {
    const id = new URLSearchParams(location.search).get("id");
    const c = DATA_BY_ID.case(id) || D.cases[0];
    document.title = c.title + " · " + name;
    const root = document.getElementById("case-root");
    const caseSols = (c.solutions || []).map((sid) => DATA_BY_ID.solution(sid)).filter(Boolean);
    const caseInds = D.industries.filter((i) => i.sols.some((sid) => (c.solutions || []).includes(sid)));
    root.innerHTML = `
      <section class="page-head">
        <div class="wrap">
          <div class="crumbs"><a href="case-studies.html">Case Studies</a> / ${esc(c.industry)}</div>
          <div class="row" style="margin-bottom:var(--s3)"><span class="badge">${esc(c.industry)} · ${esc(c.country)}</span><span class="badge accent dot">${esc(c.status)}</span></div>
          <h1>${esc(c.title)}</h1>
          <p class="lead">${esc(c.problem)}</p>
          <p class="note" style="max-width:40rem">This is an illustrative scenario: a realistic engagement built from the systems we deploy, with target ranges rather than a named client's measured results. When a client approves publishing their dashboard numbers, this label changes to "Client result".</p>
        </div>
      </section>
      <div class="wrap numbered">
        <section><h2>Overview</h2><dl class="overview"><div><dt>Client type</dt><dd>${esc(c.clientType)}</dd></div><div><dt>Industry</dt><dd>${esc(c.industry)}</dd></div><div><dt>Location</dt><dd>${esc(c.country)}</dd></div><div><dt>Project duration</dt><dd>${esc(c.duration)}</dd></div></dl></section>
        <section><h2>The challenge</h2><div class="prose"><p>${esc(c.challenge)}</p></div></section>
        <section><h2>Before</h2><div class="ba"><h3>The old workflow</h3><ul>${c.before.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div></section>
        <section><h2>What we built</h2><div class="ba after"><h3>The new system</h3><ul>${c.after.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
          <div class="tags" style="margin-top:var(--s2)">${(c.solutions || []).map((sid) => { const s = DATA_BY_ID.solution(sid); return s ? `<a class="badge" href="solution.html?id=${s.id}" style="text-decoration:none">${esc(s.name)} →</a>` : ""; }).join("")}</div></section>
        <section><h2>Automation flow</h2><div class="panel" style="max-width:620px"><div class="panel-head"><span class="live">Live flow</span><span>${c.flow.length} steps · <button class="replay" type="button" data-replay>▶ Play</button></span></div>${renderFlow(c.flow, { big: true })}<p class="panel-foot">Hover a step for what happens there.</p></div></section>
        <section><h2>Results</h2><div class="impact reveal">${c.metrics.map(([b, t, basis]) => `<div class="metric"><b data-count>${esc(b)}</b><span>${esc(t)}</span><small>${esc(basis)}</small></div>`).join("")}</div></section>
        <section><h2>Before vs after</h2>
          <div class="ba-slider" style="--pos:50%">
            <div class="pane before"><h3>Before · manual</h3><ul>${c.before.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
            <div class="pane after"><h3>After · automated</h3><ul>${c.after.slice(0, c.before.length + 1).map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
            <input type="range" min="0" max="100" value="50" aria-label="Drag to compare the manual and automated workflows">
            <div class="handle" aria-hidden="true"></div>
          </div>
          <p class="ba-caption">DRAG THE HANDLE · left is the workflow they had, right is the one we built</p>
        </section>
        <section><h2>The takeaway</h2><div class="prose"><p style="font-family:var(--display);font-size:1.35rem;color:var(--text);letter-spacing:-0.02em">${esc(c.takeaway)}</p><p class="next-step">If your day looks even 30% like this, we can probably build something similar. <a href="book.html">Tell us about your workflow → Book a strategy call</a></p></div></section>
        ${caseSols.length ? `<section><h2>Related solutions</h2><div class="prose" style="margin-bottom:var(--s3)"><p>The systems used in this scenario, as packaged solutions.</p></div><div class="related-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--s2)">${caseSols.map((o) => solCard(o, "", { plain: true })).join("")}</div></section>` : ""}
        ${caseInds.length ? `<section><h2>Related industries</h2><div class="prose" style="margin-bottom:var(--s3)"><p>Other businesses where the same systems fit.</p></div><div class="tags">${caseInds.map((i) => `<a class="badge" href="industries.html#${i.id}" style="text-decoration:none">${esc(i.name)} →</a>`).join("")}</div></section>` : ""}
      </div>
      <div class="wrap"><div class="capture reveal" style="margin-bottom:var(--s5)"><p class="capture-title">Want this case study in your inbox? We'll send it with a note on how a similar flow could work for you.</p>${miniCapture("case", "Send me this case study by email")}</div></div>
      <section class="block cta-band">
        <div class="wrap">
          <h2>Want to build a system like this?</h2>
          <p>Bring the part of your day that looks like this one. We'll show you the flow that removes it.</p>
          <div class="actions"><a class="btn primary" href="book.html">Book a Strategy Call <span class="arr">→</span></a><a class="btn ghost" href="case-studies.html">More case studies</a></div>
        </div>
      </section>`;
  }

  /* ---------------------------------------------------------------
     Reveal on scroll, number animation
  --------------------------------------------------------------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.matches("[data-count]")) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  document.querySelectorAll(".numbered > section").forEach((s) => s.classList.add("reveal"));
  document.querySelectorAll(".reveal, [data-count]").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  function countUp(el) {
    if (reduced) return;
    const m = el.textContent.match(/^([^\d]*)(\d+)(.*)$/);
    if (!m) return;
    const [, pre, num, post] = m; const target = parseInt(num, 10); const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / 900); const v = Math.round(target * (1 - Math.pow(1 - p, 3))); el.textContent = pre + v + post; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------
     Problem cards (tap to flip on touch)
  --------------------------------------------------------------- */
  document.querySelectorAll(".problem").forEach((card) => {
    card.addEventListener("click", () => card.classList.toggle("on"));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.classList.toggle("on"); } });
  });
  document.querySelectorAll(".stage").forEach((st) => st.addEventListener("click", () => { document.querySelectorAll(".stage").forEach((x) => x.classList.remove("on")); st.classList.add("on"); }));

  /* ---------------------------------------------------------------
     Catalog filters
  --------------------------------------------------------------- */
  const bar = document.querySelector(".filterbar");
  if (bar) {
    const cards = () => document.querySelectorAll(".bento .sol");
    const state = { industry: "all", use: "all" };
    const count = bar.querySelector(".count");
    const empty = document.querySelector(".catalog-empty");
    // FLIP reflow: cards glide to their new grid position instead of jumping.
    const apply = () => {
      const all = Array.from(cards());
      const first = new Map(all.map((c) => [c, c.hidden ? null : c.getBoundingClientRect()]));
      let n = 0;
      all.forEach((c) => {
        const ok = (state.industry === "all" || c.dataset.industry.split(" ").includes(state.industry)) && (state.use === "all" || c.dataset.use.split(" ").includes(state.use));
        c.hidden = !ok; c.classList.remove("out"); if (ok) n++;
      });
      if (!reduced) {
        all.forEach((c) => {
          if (c.hidden) return;
          const f = first.get(c), l = c.getBoundingClientRect();
          if (!f) { c.classList.add("enter"); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove("enter"))); return; }
          const dx = f.left - l.left, dy = f.top - l.top;
          if (dx || dy) { c.style.transition = "none"; c.style.transform = `translate(${dx}px, ${dy}px)`; requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ""; c.style.transform = ""; })); }
        });
      }
      if (count) count.textContent = "Showing " + n + " of " + all.length + " solutions";
      if (empty) empty.hidden = n > 0;
    };
    bar.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
      const g = chip.dataset.group; state[g] = chip.dataset.value;
      bar.querySelectorAll(`.chip[data-group="${g}"]`).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      const u = new URL(location.href); if (state[g] === "all") u.searchParams.delete(g); else u.searchParams.set(g, state[g]); history.replaceState(null, "", u);
      apply();
    }));
    const params = new URLSearchParams(location.search);
    ["industry", "use"].forEach((g) => { const v = params.get(g); const chip = v && bar.querySelector(`.chip[data-group="${g}"][data-value="${CSS.escape(v)}"]`); if (chip) chip.click(); });
    apply();
  }

  /* ---------------------------------------------------------------
     Booking embed (Cal.com)
  --------------------------------------------------------------- */
  const embed = document.getElementById("cal-embed");
  if (embed) {
    const calendlyUrl = (S.calendly && S.calendly.url) || "";
    const link = (S.cal && S.cal.intro) || "";
    const alt = (S.calendly && S.calendly.deepDive) || (S.cal && S.cal.deepDive) || "";
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })();
    /* Keep the page's own sentence; slot the detected zone into it. */
    const tzEl = document.querySelector(".tz");
    if (tzEl && tz) { const t = tzEl.textContent.trim(); tzEl.textContent = /your time zone/i.test(t) ? t.replace(/your time zone/i, (m) => m + " (" + tz + ")") : "Your time zone: " + tz + ". " + t; }
    const altEl = document.getElementById("cal-alt");
    if (altEl) { if (alt) { altEl.href = /^https?:/.test(alt) ? alt : "https://cal.com/" + alt; altEl.target = "_blank"; altEl.rel = "noopener"; } else { altEl.href = "contact.html"; } }
    const showBooked = () => {
      const left = document.querySelector(".split > div");
      if (!left) return;
      left.innerHTML = `<div class="booked">
        <span class="tick">${D.icons.check}</span>
        <h3>Booked. Here is what happens next.</h3>
        <ol>
          <li>You get a confirmation email now and a reminder before the call.</li>
          <li>Need a different time? The same email has a reschedule link.</li>
          <li>On the call: workflow audit, automation opportunities, and a written roadmap within a day.</li>
          <li>Prepared? Reply to the confirmation email with your website and top 2 bottlenecks. We'll review before the call.</li>
        </ol>
      </div>`;
      left.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    };
    if (calendlyUrl) {
      /* Calendly inline widget, coloured from the site theme and re-drawn on theme change. */
      const colors = () => {
        const light = document.documentElement.getAttribute("data-theme") === "light";
        return { background_color: light ? "ffffff" : "121417", text_color: light ? "101214" : "f2f3f5", primary_color: "f2b544" };
      };
      const draw = () => {
        const c = colors();
        const u = new URL(calendlyUrl);
        u.searchParams.set("hide_event_type_details", "1"); u.searchParams.set("hide_gdpr_banner", "1");
        Object.entries(c).forEach(([k, v]) => u.searchParams.set(k, v));
        // Calendly sizes its iframe to 100% of the parent, so the parent needs a real height.
        embed.innerHTML = "";
        embed.style.height = "720px"; embed.style.minHeight = "0";
        const host = document.createElement("div"); host.style.cssText = "width:100%;height:100%;min-width:320px;"; embed.append(host);
        window.Calendly.initInlineWidget({ url: u.toString(), parentElement: host });
      };
      if (window.Calendly && window.Calendly.initInlineWidget) {
        draw();
      } else {
        const sc = document.createElement("script"); sc.src = "https://assets.calendly.com/assets/external/widget.js"; sc.async = true;
        sc.onload = draw;
        sc.onerror = () => { embed.innerHTML = `<div class="placeholder"><h3>The calendar could not load</h3><p>Open it directly: <a href="${esc(calendlyUrl)}" target="_blank" rel="noopener">${esc(calendlyUrl)}</a></p></div>`; };
        document.head.append(sc);
      }
      document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => setTimeout(draw, 50)));
      window.addEventListener("message", (e) => { if (e.origin === "https://calendly.com" && e.data && e.data.event === "calendly.event_scheduled") showBooked(); });
    } else if (link) {
      (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
      window.Cal("init", { origin: "https://cal.com" });
      window.Cal("inline", { elementOrSelector: "#cal-embed", calLink: link, layout: "month_view" });
      window.Cal("ui", { theme: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark", styles: { branding: { brandColor: "#f2b544" } }, hideEventTypeDetails: false });
      // Success state: replace the agenda with next steps once a booking is made.
      window.Cal("on", { action: "bookingSuccessful", callback: showBooked });
    } else {
      embed.innerHTML = `<div class="placeholder">
        <p class="eyebrow">Calendar</p>
        <h3>Booking calendar not connected yet</h3>
        <p>Set <code>calendly.url</code> (or <code>cal.intro</code> for Cal.com) in <code>site.config.js</code>. The calendar will appear here with time-zone detection, confirmation and reminder emails.</p>
        <p>Until then, ${S.email ? `email <a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : "use the contact page"} and we will send you times.</p>
      </div>`;
    }
  }

  /* ---------------------------------------------------------------
     Contact form: validation, loading, success, error
  --------------------------------------------------------------- */
  const form = document.querySelector("form.contact");
  if (form) {
    const status = form.querySelector(".status");
    const tzField = form.querySelector('[name="timezone"]'); if (tzField) { try { tzField.value = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ } }
    const src = form.querySelector('[name="source_page"]'); if (src) src.value = document.referrer || location.href;
    const validate = () => {
      let ok = true;
      form.querySelectorAll("label").forEach((lab) => {
        const f = lab.querySelector("input, select, textarea"); if (!f || !f.required) return;
        const bad = !f.value.trim() || (f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value));
        lab.classList.toggle("invalid", bad); if (bad) ok = false;
      });
      return ok;
    };
    form.querySelectorAll("input, select, textarea").forEach((f) => f.addEventListener("input", () => f.closest("label")?.classList.remove("invalid")));
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      status.className = "status"; status.textContent = "";
      if (!validate()) { status.textContent = "Fill in the highlighted fields to send."; status.classList.add("err"); form.querySelector("label.invalid input, label.invalid select, label.invalid textarea")?.focus(); return; }
      const data = new FormData(form); const btn = form.querySelector('button[type="submit"]');
      if (!data.get("page")) data.set("page", location.pathname + location.search);
      data.set("test_mode", S.testMode ? "true" : "false");
      if (S.formEndpoint) {
        if (form.dataset.pending === "1") return; // one submission at a time
        form.dataset.pending = "1"; btn.setAttribute("aria-busy", "true"); btn.disabled = true;
        try {
          const res = await window.DS.postForm(data);
          if (!res.ok) throw new Error("HTTP " + res.status);
          status.textContent = "Sent. We usually respond within " + (S.responseTime || "24 hours") + "."; status.classList.add("ok"); form.reset();
          // Constant markup only; no user input goes through innerHTML here.
          status.insertAdjacentHTML("beforeend", ' While you wait, you can book a time directly → <a href="book.html">Book a Free Strategy Call</a>');
        } catch (err) {
          status.textContent = "Something went wrong on our side. Please try again in a moment, or email us directly: " + (S.email || ""); status.classList.add("err");
        } finally { form.dataset.pending = ""; btn.removeAttribute("aria-busy"); btn.disabled = false; }
      } else {
        const lines = []; data.forEach((v, k) => { if (!k.startsWith("_") && k !== "botcheck" && v) lines.push(k + ": " + v); });
        location.href = "mailto:" + (S.email || "") + "?subject=" + encodeURIComponent("Enquiry: " + (data.get("company") || data.get("name") || "website")) + "&body=" + encodeURIComponent(lines.join("\n"));
        status.textContent = "Opening your email app. If nothing happens, email " + (S.email || "us") + " directly.";
      }
    });
  }
})();
