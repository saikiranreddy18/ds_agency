# AI automation agency site

Static site, no build step. Dark editorial design with one amber accent and a shared animated workflow component.

| File | Purpose |
|---|---|
| `site.config.js` | **Edit this first.** Agency name, email, WhatsApp, LinkedIn, Cal.com links, form endpoint, regions. |
| `data.js` | All catalog content: 8 solutions, 3 case studies, 8 industries, hero flow. Add entries here; pages render from it. |
| `index.html` | Homepage: hero + workflow rail, flip problem cards, traditional vs system comparison, services, bento catalog, case-study teasers, process timeline, integrations hub, trust, final CTA |
| `solutions.html` | Full catalog with sticky industry / use-case filters. Deep-link with `?industry=healthcare` or `?use=booking` |
| `solution.html?id=…` | Product-style detail page rendered from `data.js` (problem, system diagram, included, how it works, typical potential impact) |
| `industries.html` | Industry cards linking to the relevant solutions |
| `case-studies.html`, `case-study.html?id=…` | Teaser cards and the 8-section editorial detail page |
| `book.html` | Cal.com embed, agenda, meeting types, time-zone note, alternative contact |
| `contact.html` | Validated form with loading, success and error states; hidden fields for CRM automation |
| `about.html`, `legal.html` | Editorial about page; plain-language privacy and terms |
| `styles.css`, `site.js` | Design tokens and components; header/footer/menu injection, workflow renderer, filters, counters, booking, form |

> **Which commit is live?** Run `git log -1 --format="%h %ad %s" --date=short`. The live site at https://ds-agency.vercel.app auto-deploys every push to `main` (last verified 2026-09-03).

## Start here for edits

- **Forms.** Every form posts `multipart/form-data` to `formEndpoint` in `site.config.js` (today: the n8n webhook). The contact form lives in `contact.html` and is handled in `site.js`; the audit modal is built in `site.js` (`initAuditModal`); the workflow modal and every "send me this by email" mini-capture are handled by `deliver()` in `conversion.js`. Success and error text is set next to each handler. Field list and routing: `HANDOFF.md`.
- **Source tags.** `window.DS.sources` in `conversion.js` maps each form to a `source` value (`contact_page`, `exit_intent_audit`, `recommend_email`, ...). `getSourceForForm(form)` reads it from `data-source`, then `data-kind`, then the page. Every payload also carries `page`, `timezone` and `test_mode`.
- **Adding a form.** Copy an existing `<form class="mini-capture" data-kind="...">`, give it a new `data-kind`, add that kind to `window.DS.sources`, and keep a `<p class="status" role="status" aria-live="polite">` inside it. `deliver()` picks it up automatically; nothing else to wire. Add the new `source` value to the table in `HANDOFF.md` so the automation can route it.
- **Analytics.** `window.DS.track(event, props)` dispatches a `ds:track` DOM event and, if `window.dataLayer` exists, pushes the same object there. To use GA4, load the GTM/GA4 snippet in every page's `<head>` before `conversion.js`; nothing else changes. Events are listed in `EFFECTS.md`.
- **Primary colour.** Change `--accent` (and `--accent-dim`, `--accent-text`) in `:root` in `styles.css`; every component reads those tokens. The light theme overrides live under `:root[data-theme="light"]` in the same file.
- **Intro loader.** The 7-second story on the home page is `loader.js` + `loader.css`; switch it off or shorten it in `site.config.js -> intro`. Details and test links in `EFFECTS.md`.
- **Chat.** `chat.js` calls `chat.endpoint`, then `chat.fallbackEndpoint` (both in `site.config.js`). The model is chosen at runtime by `api/chat.js`; pin one with the `CHAT_MODEL` env var.

## Theme and the 3D hero

- **Dark is the default.** The sun/moon button in the header (and in the mobile menu) switches to light mode; the choice is saved in the visitor's browser. `theme.js` applies it before first paint so there is no flash. All colours are tokens in `styles.css`: the `:root` block is dark, `:root[data-theme="light"]` overrides it.
- **3D hero board.** `renderHero3D()` in `site.js` builds an isometric board from `DATA.heroFlow`: a lead packet travels a CSS motion path across seven tool tiles; each tile rises and ripples the board when the packet lands; moving the pointer over the hero tilts the rig; hovering a tile shows a standing label. It is pure CSS 3D (no WebGL). Under 640px, or where motion paths are unsupported, the vertical workflow rail is shown instead. Reduced-motion users get a static board.

## Effects (all CSS-first, all respect reduced motion)

| Effect | Where | Notes |
|---|---|---|
| Kinetic headline | Home hero | Word-by-word reveal. Used on one line only. |
| Personalised hero | `index.html?for=healthcare` (any id from `DATA.industries`) | Rule-based copy swap for campaign links. |
| Gradient mesh + cursor halo | Hero / desktop pointer | Low-contrast, disabled on touch and reduced-motion. |
| Target badges | Catalog cards | From `badge` in `data.js`; always worded as targets. |
| Build your stack | Home, `#stack` | Industry + goal → website + top 3 solutions. Labelled rule-based. |
| ROI calculator | Home, `#roi` | **Modelled** from the visitor's inputs and two editable assumptions. Never presented as a result. |
| Before / after slider | Case-study detail | Range input, keyboard accessible. |
| Flow tooltips + Play | Solution and case-study diagrams | Hover a step; Play restarts the pulse. |
| Exit-intent audit offer | All pages except booking/contact | Desktop only, once per session, after 8 s. Uses `formEndpoint` or mailto. |
| Booking success state | Booking page | Cal.com `bookingSuccessful` event replaces the agenda with next steps. |
| Sticky CTA hint | Mobile | One line under the button. |
| Problem-card icons | Home | Pop in with a stagger as the row reveals. |
| Service glow | Home | Lift plus thin amber glow border on hover. |
| Catalog hover + reflow | Home, Solutions | Hover reveals three typical impacts and speeds the mini flow; filters reflow with a FLIP glide. |
| Timeline draw | Home `#process` | Line draws itself and stages appear one by one. |
| Industry trust bar | Home `#trust` | Chips with hover tooltips: the usual leak and the solution we start with (targets only). |
| CTA pulse | Final CTA bands | Soft pulse behind the primary button. |
| Case-study story | Case-study detail | Sections reveal, a rail draws down the left on wide screens, metrics pop and count up. |
| Booking explainer | Booking | Pick a time → We audit → You get a plan, animated. |
| About parallax | About | Two soft shapes move with scroll (CSS scroll-timeline where supported). |
| Reduce motion switch | Footer | Site-level no-animation mode, remembered per browser; OS setting also respected. |
| Section dividers | All `.rule` sections | Slow low-contrast light along the divider line. |

Deliberately not built: animated counters with invented numbers, a "recent wins" ticker, and a client-side AI chat (would expose an API key; route through an n8n webhook if wanted).

## Conversion layer

`conversion.js` + `conversion.css` hold the engagement mechanics added on top of the site: micro-qualifier (`?focus=`), sticky solutions bar, "Tell us your workflow" modal, "Send me this by email" mini-capture forms, kinetic section headlines, term tooltips, board tap ripple. `site.js` holds Build Your Stack presets and progress, ROI presets/diagram/estimate, the audit modal (exit-intent on desktop, scroll-depth + time on touch), related solutions/industries on detail pages, and the booking success panel. Every form carries `source`, `page`, `timezone` and `test_mode`. **`EFFECTS.md`** explains why each motion exists, the colour tokens, the play components (playground, ROI sliders and share link, stack canvas), analytics events and how to add effects safely. **`HANDOFF.md`** is the production handoff: config, payload shape, source tags, sheet columns, go-live checklist. **`DS-Agency-effects-and-hooks.txt`** maps each effect and every automation plug-in point to its file and selector.

## Site assistant (AI chat)

`chat.js` adds an "Ask us" widget to every page. It builds a context block from `site.config.js` and `data.js` (services, process, solutions, industries, illustrative case studies, policies) and sends it with the conversation to `/api/chat`.

- **Production (Vercel):** `api/chat.js` is a serverless function that calls Groq's OpenAI-compatible API with `GROQ_API_KEY` from project environment variables. Free key at console.groq.com. Optional `CHAT_MODEL` (default `llama-3.3-70b-versatile`) and `CHAT_BASE_URL` (any OpenAI-compatible provider). The key never reaches the browser.
- **Local:** `python dev-server.py` serves the site and proxies `/api/chat` using `.env` (copy `.env.example`). Same system prompt as production.
- **No backend or no key:** the endpoint returns `not_configured` and the widget answers from built-in rules over the same content (pricing, timeline, industries, solutions, ownership, contact). Nothing breaks on GitHub Pages or a plain static host.
- **Guardrails:** the model is told to answer only from the site content, never invent prices, names or results, and to describe case studies as illustrative scenarios. User messages are capped, history is limited to the last 10 turns, and conversations live only in the tab's session storage.

## Logo

Five SVG variations live in `brand/`; open `logos.html` to compare them on dark and light. Each uses `currentColor` for ink and fixed amber for the node. To adopt one site-wide, replace the `.logo .mark` CSS in `styles.css` with the chosen mark and update the favicon data URI in each page head.

## Deployment

- **Repository:** https://github.com/saikiranreddy18/ds_agency (branch `main`).
- **GitHub Pages (live now):** https://saikiranreddy18.github.io/ds_agency/ — static only, so the chat widget runs in rule-based mode there.
- **Vercel (for the AI chat backend):** import the repo at https://vercel.com/new, keep the defaults (no build command, output is the repo root), and add `GROQ_API_KEY` under Settings → Environment Variables. Every push to `main` then redeploys and `api/chat.js` runs as a serverless function. Optional: point a custom domain at the Vercel project.

## Run locally

```bash
python -m http.server 8085
```

Then open http://localhost:8085.

## Set-up checklist

1. **Name and contacts**: `site.config.js` → `name`, `email`, `whatsapp` (digits with country code), `linkedin`.
2. **Booking**: `calendly.url` is set to the 30-minute strategy call on Calendly. The embed takes its colours from the site theme (dark or light) and re-draws when the visitor toggles. Add a second event as `calendly.deepDive` to enable the "Deep dive" link. Cal.com is still supported via `cal.intro` if `calendly.url` is empty. A completed booking (Calendly's `event_scheduled` message) swaps the agenda column for a "what happens next" panel.
3. **Contact form**: get a free key from web3forms.com, set `formEndpoint` to `https://api.web3forms.com/submit` and add `<input type="hidden" name="access_key" value="…">` inside the form in `contact.html`. Without an endpoint the form falls back to the visitor's mail app.
4. **Deploy**: drop the folder on Vercel, Netlify or GitHub Pages.

## No fake data policy

- Case studies are tagged **Illustrative scenario** in `data.js` (`status`). Change to `Client result` only with a client's approved dashboard numbers, and update `metrics` with the real figures and their source.
- Trust metrics for "automations deployed" and "countries served" are blank placeholders marked "published when verified". Fill them in `index.html` once real.
- The testimonial slot explains the policy instead of showing an invented quote. Replace with a real quote, role, industry and country.

## Automation hooks

Contact form fields: `name, email, company, country, website, industry, automate, message, source_page, timezone`. Point `formEndpoint` at an n8n webhook to run **new lead → CRM + follow-up**. Cal.com webhooks cover **new booking → calendar + reminders** and a **post-call survey**.

## Adding content

- New solution: add an object to `DATA.solutions` with `id, cat, name, industry[], uses[], outcome, tagline, flow[], problem, included[], how[], impact[], stack[]`. Optional `size: "wide" | "tall"` for the bento layout.
- New case study: add to `DATA.cases`. Link it to solutions via `solutions: [ids]` so it appears on those detail pages.
- Filter values must match the chips in `solutions.html` (`industry`: healthcare, fitness, home, ecommerce, professional, education, other; `use`: leads, booking, support, followup, ops, reviews, sales, crm).
