/* Shared behaviour. Reads window.SITE (site.config.js) and window.DATA (data.js). */
(function () {
  const S = window.SITE || {};
  const D = window.DATA || { icons: {}, solutions: [], cases: [], industries: [] };
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
    sticky.innerHTML = `<span class="hint">Free 30-min strategy call · we map your automation roadmap</span><a class="btn primary" href="book.html">Book a Free Strategy Call <span class="arr">→</span></a>`;
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
  const solCard = (s, extra = "") => `
    <a class="sol ${s.size || ""} ${extra}" href="solution.html?id=${s.id}" data-industry="${s.industry.join(" ")}" data-use="${s.uses.join(" ")}">
      <span class="cat">${esc(s.cat)}</span>
      <h3>${esc(s.name)}</h3>
      ${s.badge ? `<span class="badge accent" style="align-self:flex-start">${esc(s.badge)}</span>` : ""}
      <ul class="peek" aria-label="Typical potential impact">${s.impact.slice(0, 3).map(([b, t]) => `<li><strong>${esc(b)}</strong> · ${esc(t)}</li>`).join("")}</ul>
      <p>${esc(s.outcome)}</p>
      ${renderFlow(s.flow.slice(0, s.size === "tall" ? 7 : 4), { horizontal: true })}
      <span class="more">View solution →</span>
    </a>`;
  const caseCard = (c) => `
    <a class="case" href="case-study.html?id=${c.id}">
      <div class="meta"><span class="badge">${esc(c.industry)} · ${esc(c.country)}</span><span class="badge accent dot">${esc(c.status)}</span></div>
      <h3>${esc(c.title)}</h3>
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

  document.querySelectorAll("[data-render]").forEach((el) => {
    const what = el.dataset.render;
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
        <div class="links">${ind.sols.map((id) => { const s = DATA_BY_ID.solution(id); return s ? `<a href="solution.html?id=${s.id}">${esc(s.name)}</a>` : ""; }).join("")}</div>
      </article>`).join("");
  });

  /* ---------------------------------------------------------------
     Effects: kinetic headline, personalised hero, mesh, cursor halo
  --------------------------------------------------------------- */
  const hero = document.querySelector(".hero");
  if (hero) {
    const params = new URLSearchParams(location.search);
    const forId = params.get("for");
    const ind = forId && D.industries.find((i) => i.id === forId);
    const h1 = hero.querySelector("h1");
    if (ind && h1) {
      hero.querySelector(".eyebrow").textContent = "AI automation agency · " + ind.name;
      h1.textContent = `AI websites and automations for ${ind.name.toLowerCase()}.`;
      const lead = hero.querySelector(".lead");
      if (lead) lead.textContent = `${ind.pain} We build the website and the automations that close those gaps, in tools you already use.`;
      const explore = hero.querySelector('a[href="solutions.html"]'); if (explore) explore.href = "solutions.html?industry=" + encodeURIComponent(["healthcare","fitness","home","ecommerce","professional","education"].includes(ind.id) ? ind.id : "other");
    }
    // Kinetic headline: word-by-word reveal (one of the two lines that gets this treatment).
    if (h1 && !reduced) {
      const words = h1.textContent.trim().split(/\s+/);
      h1.classList.add("kinetic"); h1.classList.remove("reveal", "d1");
      h1.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");
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
    const state = { industry: "", goal: "" };
    cfg.innerHTML = `
      <div>
        <div class="q"><div class="lbl">1 · Your industry</div><div class="chips" data-g="industry">${INDS.map(([k, v]) => `<button class="chip" type="button" data-v="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div></div>
        <div class="q"><div class="lbl">2 · Main goal</div><div class="chips" data-g="goal">${GOALS.map(([k, v]) => `<button class="chip" type="button" data-v="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div></div>
      </div>
      <div class="result" aria-live="polite"><div class="head"><h3>Your recommended stack</h3><span class="badge">Rule-based · not a quote</span></div><div class="body"></div></div>`;
    const body = cfg.querySelector(".body");
    const render = () => {
      if (!state.industry || !state.goal) { body.innerHTML = `<p class="empty">Pick an industry and a goal. We will show the website and the two or three automations we would start with.</p>`; return; }
      const scored = D.solutions.map((s) => ({ s, score: (s.uses.includes(state.goal) ? 2 : 0) + (s.industry.includes(state.industry) ? 1 : 0) + (s.uses[0] === state.goal ? 1 : 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
      const indName = D.industryLabels[state.industry] || "your business";
      body.innerHTML = `
        <div class="stack">
          <div class="item web"><span class="n">00</span><div><b>AI website for ${esc(indName.toLowerCase())}</b><span>Fast, answers questions from your own material, captures every visitor's details. The base every stack sits on.</span></div></div>
          ${scored.map(({ s }, i) => `<a class="item" href="solution.html?id=${s.id}"><span class="n">0${i + 1}</span><div><b>${esc(s.name)}</b><span>${esc(s.outcome)}</span></div></a>`).join("")}
        </div>
        <div class="cta"><a class="btn primary" href="book.html?industry=${encodeURIComponent(state.industry)}&goal=${encodeURIComponent(state.goal)}">Get a custom version of this for your business <span class="arr">→</span></a></div>`;
    };
    cfg.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
      const g = chip.closest("[data-g]").dataset.g; state[g] = chip.dataset.v;
      chip.closest("[data-g]").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      render();
    }));
    render();
  }

  /* ---------------------------------------------------------------
     ROI calculator. Everything here is MODELLED from the visitor's
     own inputs and the two visible assumptions. Never presented as a result.
  --------------------------------------------------------------- */
  const roi = document.querySelector('[data-render="roi"]');
  if (roi) {
    roi.innerHTML = `
      <div class="inputs">
        <label>Currency <select name="cur"><option>$</option><option>£</option><option>€</option><option>₹</option><option>AED</option><option>A$</option><option>S$</option></select></label>
        <label>New enquiries per month <input type="number" name="leads" value="60" min="0"></label>
        <label>Enquiries that become customers now (%) <input type="number" name="close" value="20" min="0" max="100"></label>
        <label>Average value of one customer <input type="number" name="value" value="200" min="0"></label>
        <label>Hours per week on repetitive admin <input type="number" name="hours" value="10" min="0"></label>
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
        <div class="cta"><a class="btn primary" href="book.html">Want a tailored version? Book a call <span class="arr">→</span></a></div>
      </div>`;
    const g = (n) => parseFloat(roi.querySelector(`[name="${n}"]`).value) || 0;
    const fmt = (n) => n >= 1000 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toLocaleString();
    const calc = () => {
      const cur = roi.querySelector('[name="cur"]').value;
      const hours = g("hours") * 4.33 * (g("autoShare") / 100);
      const cost = hours * g("rate");
      const customers = g("leads") * (g("close") / 100) * (g("lift") / 100);
      const revenue = customers * g("value");
      roi.querySelector('[data-o="hours"]').textContent = fmt(hours) + " h";
      roi.querySelector('[data-o="cost"]').textContent = cur + " " + Math.round(cost).toLocaleString();
      roi.querySelector('[data-o="customers"]').textContent = fmt(customers);
      roi.querySelector('[data-o="revenue"]').textContent = cur + " " + Math.round(revenue).toLocaleString();
    };
    roi.addEventListener("input", calc); calc();
  }

  /* ---------------------------------------------------------------
     Exit-intent offer (desktop, once per session, not on booking/contact)
  --------------------------------------------------------------- */
  if (!["book", "contact"].includes(page) && window.matchMedia("(hover: hover)").matches) {
    let shown = false; try { shown = sessionStorage.getItem("exitShown") === "1"; } catch (e) { /* ignore */ }
    const armed = Date.now() + 8000;
    const modal = document.createElement("div"); modal.className = "modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "exit-title");
    modal.innerHTML = `<div class="box">
      <button class="close" type="button" aria-label="Close">×</button>
      <p class="eyebrow">Before you go</p>
      <h3 id="exit-title">Get a free 5-minute automation audit</h3>
      <p>Leave your website and email. We record a short walkthrough of the first three things we would automate for your business, usually within two working days.</p>
      <form>
        <input type="url" name="website" placeholder="https://your-website.com" required>
        <input type="email" name="email" placeholder="you@company.com" required>
        <input type="hidden" name="_subject" value="Free automation audit request">
        <button class="btn primary" type="submit">Send me the audit <span class="arr">→</span></button>
        <p class="status" role="status" aria-live="polite"></p>
        <p class="fine">No newsletter. We only use this to send your audit.</p>
      </form>
    </div>`;
    document.body.append(modal);
    const close = () => { modal.classList.remove("open"); };
    modal.querySelector(".close").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.addEventListener("mouseout", (e) => {
      if (shown || e.relatedTarget || e.clientY > 8 || Date.now() < armed) return;
      shown = true; try { sessionStorage.setItem("exitShown", "1"); } catch (err) { /* ignore */ }
      modal.classList.add("open"); modal.querySelector("input").focus();
    });
    modal.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, st = f.querySelector(".status"), data = new FormData(f);
      if (S.formEndpoint) {
        f.querySelector("button").setAttribute("aria-busy", "true");
        try { const res = await fetch(S.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } }); if (!res.ok) throw new Error("HTTP " + res.status); st.textContent = "Got it. Your audit is on its way."; st.classList.add("ok"); f.reset(); }
        catch (err) { st.textContent = "Could not send. Email " + (S.email || "us") + " with your website instead."; }
        finally { f.querySelector("button").removeAttribute("aria-busy"); }
      } else {
        location.href = "mailto:" + (S.email || "") + "?subject=" + encodeURIComponent("Free automation audit") + "&body=" + encodeURIComponent("Website: " + data.get("website") + "\nEmail: " + data.get("email"));
        st.textContent = "Opening your email app…";
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
    root.innerHTML = `
      <section class="page-head">
        <div class="wrap">
          <div class="crumbs"><a href="solutions.html">Solutions</a> / ${esc(s.cat)}</div>
          <div class="detail-split">
            <div>
              <p class="eyebrow">${esc(s.cat)}</p>
              <h1>${esc(s.name)}</h1>
              <p class="lead">${esc(s.tagline)}</p>
              <div class="row" style="margin-top:var(--s3)">
                <a class="btn primary" href="book.html">Book a Free Strategy Call <span class="arr">→</span></a>
                <a class="btn ghost" href="solutions.html">Explore Solutions</a>
              </div>
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
        </section>
        ${related.length ? `<section><h2>Related case studies</h2><div class="cases">${related.map(caseCard).join("")}</div></section>` : ""}
      </div>
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
        <section><h2>The takeaway</h2><div class="prose"><p style="font-family:var(--display);font-size:1.35rem;color:var(--text);letter-spacing:-0.02em">${esc(c.takeaway)}</p></div></section>
      </div>
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
      if (count) count.textContent = n + " of " + all.length;
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
    const tzEl = document.querySelector(".tz"); if (tzEl && tz) tzEl.textContent = "Times shown in your time zone: " + tz;
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
          <li>Reply to the confirmation with your website and the one task that eats the most time. We prepare before we meet.</li>
          <li>On the call: workflow audit, automation opportunities, and a written roadmap within a day.</li>
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
      if (S.formEndpoint) {
        btn.setAttribute("aria-busy", "true");
        try {
          const res = await fetch(S.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error("HTTP " + res.status);
          status.textContent = "Sent. We usually respond within " + (S.responseTime || "24 hours") + "."; status.classList.add("ok"); form.reset();
        } catch (err) {
          status.textContent = "The message could not be sent (" + err.message + "). Email us directly: " + (S.email || ""); status.classList.add("err");
        } finally { btn.removeAttribute("aria-busy"); }
      } else {
        const lines = []; data.forEach((v, k) => { if (!k.startsWith("_") && k !== "botcheck" && v) lines.push(k + ": " + v); });
        location.href = "mailto:" + (S.email || "") + "?subject=" + encodeURIComponent("Enquiry: " + (data.get("company") || data.get("name") || "website")) + "&body=" + encodeURIComponent(lines.join("\n"));
        status.textContent = "Opening your email app. If nothing happens, email " + (S.email || "us") + " directly.";
      }
    });
  }
})();
