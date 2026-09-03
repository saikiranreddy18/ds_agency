// ---------------------------------------------------------------
// Site configuration. Edit this one file to personalise the site.
// Every page reads these values on load (see site.js).
// ---------------------------------------------------------------
window.SITE = {
  // Agency name. Appears in the header, footer, titles and copy.
  name: "DS Agency",

  // Contact details. Leave a value empty ("") to hide that option.
  email: "hello@example.com",
  whatsapp: "",            // international format, digits only, e.g. "919876543210"
  linkedin: "",            // full URL, e.g. "https://www.linkedin.com/company/your-agency"

  // Booking. Calendly is used when `calendly.url` is set; otherwise Cal.com
  // when `cal.intro` is set; otherwise the page shows a placeholder.
  calendly: {
    url:      "https://calendly.com/saikiranreddytallapureddy/30min",  // 30-min strategy call
    deepDive: "",          // optional second event, e.g. "https://calendly.com/you/45min"
  },
  cal: {
    intro:    "",          // Cal.com alternative, e.g. "your-handle/strategy-30"
    deepDive: "",
  },

  // Form endpoint. Works with https://web3forms.com (free), https://formspree.io,
  // or an n8n / Make webhook. Every form posts here with a `source` field:
  // contact_page, exit_intent_audit, mobile_engagement, workflow_modal,
  // roi_email_capture, build_stack_email, solution_detail_email,
  // case_study_email, recommend_email. Leave empty to fall back to a mailto link.
  // n8n workflow "DS Agency website forms → email": emails each submission and stores it
  // in the "DS Agency leads" data table. https://sai830.app.n8n.cloud/workflow/9fdhU4I3xUTSbqmQ
  formEndpoint: "https://sai830.app.n8n.cloud/webhook/ds-agency-forms",
  // Optional: send the free-audit modal somewhere else (defaults to formEndpoint).
  auditEndpoint: "",
  // Same-origin relay (api/form.js on Vercel) used only if the direct post to formEndpoint fails,
  // e.g. CORS on a preview domain. Leave empty on hosts without serverless functions.
  formProxy: "/api/form",
  // While true, every payload carries test_mode=true so test submissions can be
  // filtered out downstream. Set to false (or remove) before real traffic.
  testMode: false,

  // Where you work. Shown in the footer and About page.
  base: "India",
  regions: ["India", "United States", "United Kingdom", "Australia", "Canada", "Europe", "Middle East", "Southeast Asia"],

  // Typical response time promise.
  responseTime: "24 hours",

  // Site assistant (chat widget). The model key lives on the server
  // (GROQ_API_KEY env var for api/chat.js on Vercel, or dev-server.py locally).
  // With no backend the widget answers from built-in rules over the site content.
  // Home-page intro (loader.js + loader.css): a 7-second story before the hero.
  // enabled: false removes it entirely; duration in ms; oncePerSession: play only the first time in a tab.
  intro: {
    enabled: true,
    duration: 7000,
    oncePerSession: true,
  },

  chat: {
    enabled: true,
    endpoint: "/api/chat",
    // Used only if `endpoint` reports no key: the sister Vercel project (ds-agency-siak) that has
    // GROQ_API_KEY. Remove once the key is set on the ds-agency project itself.
    fallbackEndpoint: "https://ds-agency-in.vercel.app/api/chat",
  },
};
