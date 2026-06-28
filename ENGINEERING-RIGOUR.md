# Engineering Rigour & Security

*How Rudra Digital builds and ships this platform to a professional standard. This is the
difference between "a form that emails you" and a system you can trust with real customers and
real money.*

---

## Security

The platform handles personal lead data (names, phone numbers, investment intent), so it is
built to protect it:

- **Authenticated admin surface.** Reading, editing, or exporting leads requires a server-side
  password check; the public can only *submit* a lead, never read the pipeline. Authentication
  **fails closed** — if the secret is ever unset, the admin API denies access rather than
  opening up.
- **No secrets in the browser.** The dashboard never ships a credential to the client; the
  admin password is entered at runtime and held only for the session.
- **Signed automation.** The Worker → pipeline webhook is secret-signed; the pipeline rejects
  anonymous calls.
- **Input hardening.** Every public submission is size-capped, type-checked, length-limited,
  and validated before it touches the database. Database access is fully parameterised
  (no SQL injection surface). Spreadsheet exports are escaped against formula-injection.
- **Secret hygiene.** All credentials live in encrypted platform secret stores and environment
  bindings — never in source. (This very repository was scrubbed of all secrets and customer
  data before sharing.)

## Compliance & brand safety

The AI never speaks for the brand unchecked:

- A dedicated **AI compliance auditor** reviews every generated lead assessment *before* it is
  acted on, and auto-rejects anything off-brand — no fabricated returns/payback figures, no
  unverified claims, no off-tone language.
- A lead is only ever escalated as **HOT** when both the score **and** the independent audit
  agree. A failed audit routes the lead to **review**, not to the sales team — and never fires
  a false alert.

## Reliability

- **Nothing gets lost.** Lead forwarding is tracked with durable state, and a scheduled job
  automatically re-sends anything that didn't get through — so a brief outage in any downstream
  service can't drop a customer.
- **No duplicates.** De-duplication on submission prevents duplicate leads, duplicate CRM
  records, and duplicate alerts.
- **Graceful degradation.** Side-effects (e.g. internal logging) are non-blocking: if a
  secondary service is down, the customer still gets an instant acknowledgement and the lead
  still flows through scoring.

## Quality assurance

Every release is held to a multi-stage bar before it goes near a customer:

- **Cross-model review.** Changes are reviewed by **two independent frontier AI models from
  different labs** acting as adversarial reviewers — they look for what's *wrong*, from
  different blind spots. Issues both models agree on are treated as high-confidence.
- **Standing security audit.** A dedicated automated security pass runs a fixed vulnerability
  rubric (injection, auth/transport, resource-exhaustion, secret-leakage, and more) and returns
  a **GO / NO-GO** verdict — code does not ship to a client on a NO-GO.
- **Live end-to-end verification.** Before a change is called done, a real lead is pushed
  through the *entire* live pipeline and observed at every hop — not just unit-tested. (In
  practice this catches issues that static review alone misses.)
- **Typed and checked.** The application is TypeScript end-to-end, and continuous integration
  fails the build on any type error.

## The standard, in one line

> A lead's data is protected, its assessment is brand-safe, its delivery is guaranteed, and
> every change is independently reviewed and live-verified before it reaches you.

---

*Rudra Digital · engineered for Chicking Mohali.*
