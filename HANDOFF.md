# Production handoff: conversion hooks

Everything a visitor can submit on the DS Agency site, what arrives at your webhook, and how to switch from testing to production. Verified end to end on 2026-09-03 with the local echo endpoint.

## 1. Config (`site.config.js`)

```js
window.SITE = {
  // ...existing config
  formEndpoint: "https://api.web3forms.com/submit",   // or an n8n / Make webhook URL
  auditEndpoint: "",                                  // optional: separate endpoint for the audit modal
  testMode: true,                                     // set false before real traffic
};
```

Behaviour:

- Regular forms (contact, workflow modal, every "Send me this by email" capture) post to `formEndpoint`.
- The audit modal (exit-intent on desktop, scroll-depth plus time on touch) posts to `auditEndpoint` when set, otherwise `formEndpoint`.
- If `formEndpoint` is empty, every form falls back to opening the visitor's mail app with the fields in the body. Nothing is lost, but nothing reaches a webhook either.
- Web3Forms also needs `<input type="hidden" name="access_key" value="…">` inside the contact form in `contact.html`; the other forms pass the key through the endpoint URL or you add the same hidden field where needed. n8n and Make webhooks need nothing extra.

## 2. What every payload carries

Posted as `multipart/form-data` (not JSON). Web3Forms, Formspree, n8n and Make all accept this directly.

| Field | Always | Value |
|---|---|---|
| `source` | yes | one of the tags below, from `window.DS.sources` |
| `page` | yes | path plus query string, e.g. `/index.html?for=healthcare` |
| `timezone` | yes | IANA zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`, e.g. `Asia/Calcutta` (Chrome's alias for Kolkata) |
| `test_mode` | yes | `"true"` while `testMode` is on, otherwise `"false"` |
| `_subject` | yes | human-readable subject, used by Web3Forms / Formspree for the notification email |

## 3. Source tags and their fields

| `source` | Where | Extra fields | Suggested handling |
|---|---|---|---|
| `contact_page` | Contact form | `name, email, company, country, website, industry, automate, message, source_page` | Medium to high intent. Reply personally. |
| `exit_intent_audit` | Audit modal, desktop | `website, email, bottleneck, message` | High intent. Fast follow-up with the 3-point audit. |
| `mobile_engagement` | Audit modal, touch devices | same as above | Same as above. |
| `workflow_modal` | "Tell us your workflow" | `website, email, goal, message` | Medium intent. Send the recommended stack plus one case study. |
| `build_stack_email` | Build Your Stack | `email, website, kind=stack, summary` (the stack names) | Low intent. Send the stack, invite to book. |
| `roi_email_capture` | ROI calculator | `email, website, kind=roi, summary` (inputs and modelled outputs) | Low intent. Send the numbers, offer a walkthrough. |
| `solution_detail_email` | Solution pages | `email, website, kind=solution, summary` (page title and URL) | Low intent. Send the page, add a related case study. |
| `case_study_email` | Case-study pages | `email, website, kind=case, summary` | Low intent. Same. |
| `recommend_email` | Home mid-page block, Solutions page | `email, website, goal, kind=recommend, summary` | Low to medium intent. Reply with 2–3 solutions. |

Values are the visible labels, not slugs: `bottleneck` is "Booking", `goal` is "More bookings", and so on. `website` is normalised to start with `https://`.

## 4. Sheet or CRM columns

A header row that fits every form:

```
received_at | source | test_mode | page | timezone | name | email | company | country | website | industry | goal | automate | bottleneck | kind | summary | message | source_page | _subject
```

n8n: Webhook (POST, "Form-Data" body) → IF `test_mode` is "true" (route to a test sheet or stop) → Google Sheets "Append row" mapped to the columns above → Gmail / WhatsApp reply chosen by `source`. Use `timezone` to delay follow-ups to the visitor's working hours.

## 5. Local testing

1. In `site.config.js` set `formEndpoint: "/api/form"` (and `auditEndpoint` if you want to test that path).
2. Run `python dev-server.py`.
3. Submit any form. Each payload is appended to `.form-log.jsonl` (gitignored) and echoed back as JSON.
4. Reset `formEndpoint` to the real URL before deploying.

## 6. Go-live checklist

- [ ] `formEndpoint` set to the real URL; `auditEndpoint` only if you want a separate route
- [ ] `testMode: false`
- [ ] Web3Forms only: `access_key` hidden input added where required
- [ ] `GROQ_API_KEY` set on Vercel for the chat assistant (see README)
- [ ] One real submission per form, checked in the sheet or inbox
