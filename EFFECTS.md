# Effects, motion and play: how the DS Agency site uses them

A short guide for whoever edits the site next. Every animation here has a job. If a new one does not fit one of the three jobs below, leave it out.

## Why motion exists on this site

1. **Reveal structure.** Sections fade and slide in as they enter the viewport so the page reads in order. Timing is 0.5–0.6 s with a gentle ease, staggered by at most 0.24 s.
2. **Show cause and effect.** When a visitor does something, something visible answers: a tapped problem card flips to its automated version, a dragged step pulls the wiring with it, a moved slider re-runs the model, a chosen preset lights the progress strip.
3. **Reward curiosity.** Hover reveals detail (card outcomes, tooltips), the cursor halo and board tilt make the page feel responsive, and the packet on the 3D board keeps showing what the product does while the visitor reads.

What we do not do: autoplay anything loud, animate the copy while it is being read, block content behind a loading sequence, or move more than one thing at a time in the same viewport.

## Colour

One primary hue (amber) drives everything. Tokens live in `styles.css` under `:root`; the light theme overrides them under `:root[data-theme="light"]`. The semantic aliases `--color-primary`, `--color-primary-weak`, `--color-bg`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-success`, `--color-error` map onto the working tokens, so either vocabulary works in new CSS.

To rebrand: change `--accent`, `--accent-2`, `--accent-hover`, `--accent-dim` and `--accent-text` (both theme blocks). Keep the contrast rules the tokens were built for: body text ≥ 4.5:1, button labels on the primary colour ≥ 3:1, and use `--accent-text` (a darker amber) for amber text on light surfaces.

Colour signals intent: solid primary for the one main action per section, ghost/outline for secondary actions, `.btn.success` and `.btn.danger` only for confirmations and destructive actions, and status text uses `--accent-text` for success and `--danger` for errors.

## Inventory: which section uses what

| Section | Effect | Files |
|---|---|---|
| Hero | Kinetic H1 (on load, once), gradient mesh, cursor halo, 3D board (packet, rising tiles, ripples, pointer tilt, hover labels, tap ripple), `?for=` personalisation | `site.js` renderHero3D, `styles.css` .hero3d, `conversion.js` "3D board" |
| Problem cards | Icon pop-in on reveal, real 3D flip on hover/tap/keyboard, micro-qualifier that scrolls and spotlights a solution | `styles.css` .problem, `conversion.js` H1 |
| Services | Lift + amber glow on hover, impact line, CTA row | `styles.css`, `conversion.css` |
| Catalog | Hover reveals three impacts and setup time, mini flow speeds up, FLIP reflow when filtering, sticky solutions bar | `site.js` catalog, `conversion.js` H4, `conversion.css` |
| Build Your Stack | Presets, progress strip, result pop-in, stack canvas (drag or tap modules, live summary, hand-off to the workflow modal) | `site.js` configurator |
| Case studies | "If this is you" lines, count-up metrics on detail pages, before/after slider, rail that draws on scroll | `site.js`, `styles.css` |
| Process | Timeline draws itself, staggered stages, FAQ that animates open (CSS where supported, JS fallback) | `styles.css`, `conversion.js` |
| Playground | Draggable flow: pointer drag, tap to read a step, arrow keys, wiring redrawn live, layout remembered, reset | `conversion.js` "Playground", `conversion.css` |
| Integrations | Rotating dashed ring, tooltips on tiles | `styles.css` |
| ROI calculator | Live recalculation on typing or sliding, short count tween on outputs, presets, share link, remembered inputs, "How we estimate this" | `site.js` ROI |
| Section headlines | Kinetic type on two headlines when scrolled into view, once per session; `data-kinetic="slow"` for a calmer version | `conversion.js`, `conversion.css` |
| Site-wide | Scroll reveals, section-divider shimmer, sticky compact header, mobile sticky CTA, theme toggle, "Reduce motion" switch | `styles.css`, `site.js`, `theme.js` |

Kinetic type is deliberately limited to three lines site-wide: the hero H1 and two section headlines.

## Adding a new effect without breaking things

- Animate only `transform` and `opacity` (plus `clip-path` for reveals). Never animate layout properties.
- Trigger on visibility with `IntersectionObserver`, not on page load, unless it is above the fold.
- Add the selector to both reduced-motion blocks: `@media (prefers-reduced-motion: reduce)` and `:root[data-motion="reduced"]` (the footer switch). The site must still make sense with every animation off.
- Keep it keyboard-operable and touch-operable: pointer events for drag, tap for the same action on touch, arrow keys where position matters, `aria-pressed` on toggles, `aria-live` on anything that reports state.
- Give it a `track()` call if it is an interaction worth measuring: `window.DS.track("event_name", {...})` dispatches a `ds:track` DOM event and pushes to `window.dataLayer` when one exists. Current events: `qualifier_used`, `workflow_modal_opened`, `capture_sent`, `audit_shown`, `playground_used`, `roi_calculator_used`, `roi_shared`, `stack_configured`.
- Test with the footer "Reduce motion" switch on, at 375 px wide, and in light mode.

## Deep links

- `index.html?for=<industry>` personalises the hero.
- `index.html?focus=missed_leads|followup|booking|admin` preselects the qualifier and spotlights a solution.
- `solutions.html?industry=…&use=…` pre-filters the catalog.
- `index.html?roi_leads=…&roi_close=…&roi_value=…&roi_hours=…&roi_rate=…&roi_cur=…#roi` reopens the calculator with those numbers (produced by "Share this estimate").
