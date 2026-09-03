/* Intro loader for the home page: a 7-second story, then the site.
   Loaded synchronously in <head> (after site.config.js) so the decision to show
   the overlay happens before the first paint. Styles: loader.css.

   Change the duration, switch it off, or make it play every visit in
   site.config.js -> intro: { enabled, duration, oncePerSession }.
   Change the copy or the phase split below (INTRO). Test it again with ?intro=1,
   the reduced-motion version with ?intro=reduced, and skip it with ?intro=off. */
(function () {
  const root = document.documentElement;
  const S = window.SITE || {};
  const cfg = Object.assign({ enabled: true, duration: 7000, oncePerSession: true }, S.intro || {});
  const param = new URLSearchParams(location.search).get("intro");
  if (param === "off" || !cfg.enabled) return;
  const hold = param && param.indexOf("phase:") === 0 ? param.slice(6) : "";   // ?intro=phase:connect freezes that phase for review
  let seen = false; try { seen = sessionStorage.getItem("introSeen") === "1"; } catch (e) { /* private mode: play it */ }
  if (seen && cfg.oncePerSession && !param) return;

  const reduced = param === "reduced" || root.getAttribute("data-motion") === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reduced ? 1400 : Math.max(1500, Number(cfg.duration) || 7000);
  root.classList.add("intro-on");
  try { sessionStorage.setItem("introSeen", "1"); } catch (e) { /* ignore */ }

  const INTRO = {
    copy: {
      chaos:   "Most small businesses run on manual work.",
      connect: "We connect your tools around your business.",
      work:    "AI websites + automations that work 24/7.",
      brand:   S.name || "DS Agency",
      tagline: "AI websites and automations built around how your business works.",
    },
    /* Phase boundaries as fractions of the duration: chaos -> connect -> work -> brand. */
    phases: [["chaos", 0], ["connect", 0.27], ["work", 0.57], ["brand", 0.73]],
    skipAfter: 2500,      // ms before "Skip intro" appears
    nodes: [   /* label on wide screens, short on phones */
      { label: "Lead",             short: "Lead",      icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
      { label: "AI website",       short: "Website",   icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>' },
      { label: "Qualification",    short: "Qualify",   icon: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>' },
      { label: "CRM",              short: "CRM",       icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>' },
      { label: "WhatsApp / Email", short: "WhatsApp",  icon: '<path d="M4 5h16v11H8l-4 4z"/>' },
      { label: "Appointment",      short: "Booking",   icon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
      { label: "Follow-up",        short: "Follow-up", icon: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/>' },
    ],
    /* Manual-work chips: text, resting x/y (% of the scene), tilt (deg), fly-in direction (x/y, -1..1) */
    bits: [
      ["Missed call, 6:40 pm", 22, 22, -5, -1, -0.4], ["Spreadsheet, 3 tabs", 74, 18, 4, 1, -0.5], ["DM not answered", 40, 46, 3, -1, 0.2],
      ["Quote still pending", 66, 52, -3, 1, 0.3], ["Sticky note on the desk", 30, 78, 5, -0.6, 1], ["Reminder: call back", 76, 82, -4, 0.7, 1],
      ["Same email, again", 52, 8, 2, 0, -1],
    ],
  };

  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const svgIcon = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + d + '</svg>';

  let built = false;
  function build() {
    if (built) return; built = true;
    const loader = document.getElementById("ds-loader");
    if (!loader) { root.classList.remove("intro-on"); return; }
    loader.style.setProperty("--ds-intro-ms", duration + "ms");
    if (reduced) loader.setAttribute("data-motion", "reduced");

    const words = (t) => t.split(/\s+/).map((w, i) => '<span class="w" style="--i:' + i + '">' + w + '</span>').join(" ");
    const letters = (t) => t.split("").map((c, i) => '<span class="l" style="--i:' + i + '">' + c + '</span>').join("");
    const lines = loader.querySelector(".ds-loader-lines");
    const mark = '<svg class="mk" viewBox="0 0 44 44" aria-hidden="true"><rect class="frame" x="3" y="3" width="38" height="38" rx="11"/><rect class="bar" x="12" y="20" width="20" height="3.5" rx="1.75"/><circle class="dot" cx="15" cy="13.5" r="3"/></svg>';
    lines.append(
      el("p", null, words(INTRO.copy.chaos)), el("p", null, words(INTRO.copy.connect)), el("p", null, words(INTRO.copy.work)),
      el("div", "ds-loader-brand", mark + '<b>' + letters(INTRO.copy.brand) + '</b><small>' + INTRO.copy.tagline + '</small>')
    );
    lines.children[0].dataset.line = "chaos"; lines.children[1].dataset.line = "connect"; lines.children[2].dataset.line = "work";

    const scene = loader.querySelector(".ds-loader-scene");
    loader.insertBefore(el("div", "ds-loader-floor"), loader.firstChild);
    loader.insertBefore(el("div", "ds-loader-glow"), loader.firstChild);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ds-loader-wires"); svg.setAttribute("aria-hidden", "true");
    scene.append(svg);
    const nodes = INTRO.nodes.map((n, i) => {
      const d = el("div", "ds-loader-node", '<span class="ic">' + svgIcon(n.icon) + '</span><span class="lb">' + n.label + '</span>');
      d.style.setProperty("--i", i); scene.append(d); return d;
    });
    const bits = INTRO.bits.map((bit, i) => {
      const b = el("span", "ds-loader-bit", bit[0]);
      b.style.setProperty("--x", bit[1]); b.style.setProperty("--y", bit[2]); b.style.setProperty("--r", bit[3] + "deg"); b.style.setProperty("--i", i);
      scene.append(b); return b;
    });

    /* Slots: one row on wide screens, a 4 + 3 zigzag on phones. Wires are cubic curves between consecutive slots. */
    function layout() {
      const W = scene.clientWidth || 800, H = scene.clientHeight || 260;
      const narrow = W < 620;
      const slots = nodes.map((_, i) => narrow
        ? (i < 4 ? [14 + i * 24, 30] : [26 + (i - 4) * 24, 72])
        : [8 + i * 14, 50]);
      const px = (s) => [(s[0] / 100) * W, (s[1] / 100) * H];
      nodes.forEach((d, i) => { d.querySelector(".lb").textContent = narrow ? INTRO.nodes[i].short : INTRO.nodes[i].label; });
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML = "";
      let all = "";
      for (let i = 0; i < slots.length - 1; i++) {
        const a = px(slots[i]), b = px(slots[i + 1]); const mx = (a[0] + b[0]) / 2;
        const seg = "C " + mx + " " + a[1] + ", " + mx + " " + b[1] + ", " + b[0] + " " + b[1];
        const p = document.createElementNS(NS, "path");
        p.setAttribute("class", "wire"); p.setAttribute("d", "M " + a[0] + " " + a[1] + " " + seg); p.style.setProperty("--i", i);
        svg.append(p);
        p.style.setProperty("--len", p.getTotalLength().toFixed(1));
        all += (i === 0 ? "M " + a[0] + " " + a[1] + " " : "") + seg + " ";
      }
      const packet = document.createElementNS(NS, "path");
      packet.setAttribute("class", "packet"); packet.setAttribute("d", all.trim());
      svg.append(packet);
      packet.style.setProperty("--len", packet.getTotalLength().toFixed(1));
      nodes.forEach((d, i) => { d.style.setProperty("--x", slots[i][0]); d.style.setProperty("--y", slots[i][1]); });
      /* Chips fly in from outside the scene and are later pulled to the middle of the line */
      const lineY = narrow ? 51 : 50;
      bits.forEach((b, i) => {
        const bit = INTRO.bits[i];
        b.style.setProperty("--fx", Math.round(bit[4] * (W * 0.7 + 200)) + "px"); b.style.setProperty("--fy", Math.round(bit[5] * (H * 0.9 + 160)) + "px");
        b.style.setProperty("--tx", Math.round(((50 - bit[1]) / 100) * W) + "px"); b.style.setProperty("--ty", Math.round(((lineY - bit[2]) / 100) * H) + "px");
      });
    }
    layout();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

    /* Timeline. "elapsed" is wall-clock time minus any time the tab spent hidden, so the story
       plays while the visitor is looking at it and is not slowed by timer throttling. A 40 ms
       ticker (not requestAnimationFrame: some embedded views never paint frames) applies the
       phase for the current elapsed time; a one-shot timer ends the intro on time. */
    const skip = loader.querySelector(".ds-loader-skip");
    const bar = loader.querySelector(".ds-loader-bar i");
    const start = performance.now();
    let done = false; const timers = [];
    let elapsed = 0, ticker = 0, phase = "";
    let hiddenSince = document.hidden ? performance.now() : 0, hiddenTotal = 0;
    /* Keep the hidden-time bookkeeping in step with document.hidden even when no visibilitychange
       event arrives (pages that start hidden, embedded views). */
    const syncHidden = () => {
      if (document.hidden && !hiddenSince) hiddenSince = performance.now();
      else if (!document.hidden && hiddenSince) { hiddenTotal += performance.now() - hiddenSince; hiddenSince = 0; }
    };
    const elapsedNow = () => { syncHidden(); return performance.now() - start - hiddenTotal - (hiddenSince ? performance.now() - hiddenSince : 0); };
    const setPhase = (p) => { if (phase !== p) { phase = p; loader.setAttribute("data-phase", p); } };
    const finish = (skipped) => {
      if (done) return; done = true;
      timers.forEach(clearTimeout); clearInterval(ticker);
      loader.classList.add("out");
      root.classList.remove("intro-on");
      const detail = { skipped: !!skipped, after: Math.round(performance.now() - start), reduced: reduced };
      try { document.dispatchEvent(new CustomEvent("ds:intro", { detail: detail })); } catch (e) { /* ignore */ }
      if (window.DS && typeof window.DS.track === "function") window.DS.track(skipped ? "intro_skip" : "intro_complete", detail);
      setTimeout(() => loader.remove(), 500);
    };
    let loaded = document.readyState === "complete";
    if (!loaded) window.addEventListener("load", () => { loaded = true; }, { once: true });
    const tryFinish = () => { if (loaded) finish(false); else window.addEventListener("load", () => finish(false), { once: true }); };

    const showSkip = () => { if (!skip.hidden) return; skip.hidden = false; requestAnimationFrame(() => skip.classList.add("show")); };
    if (hold) {
      setPhase(hold); showSkip(); if (bar) bar.style.transform = "scaleX(.5)";
    } else if (reduced) {
      setPhase("brand");
      showSkip();
      timers.push(setTimeout(tryFinish, duration));
    } else {
      setPhase("chaos");
      loader.classList.add("run");
      const skipAt = Math.min(INTRO.skipAfter, duration * 0.4);
      const tick = () => {
        if (done) return;
        elapsed = elapsedNow();
        let current = INTRO.phases[0][0];
        INTRO.phases.forEach((ph) => { if (elapsed >= ph[1] * duration) current = ph[0]; });
        setPhase(current);
        if (bar) bar.style.transform = "scaleX(" + Math.min(1, elapsed / duration).toFixed(3) + ")";
        if (elapsed >= skipAt) showSkip();
        if (elapsed >= duration) { clearInterval(ticker); tryFinish(); }
      };
      const endTimer = () => { const left = duration - elapsedNow(); if (left <= 0) tick(); else timers.push(setTimeout(endTimer, left + 20)); };
      document.addEventListener("visibilitychange", tick);
      ticker = setInterval(tick, 40);
      timers.push(setTimeout(endTimer, duration + 20));
      timers.push(setTimeout(tryFinish, duration * 3 + 3000));   // safety net: never trap a visitor behind the overlay
    }
    skip.addEventListener("click", () => finish(true));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !done) finish(true); });
  }

  window.DSIntro = { build: build };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
