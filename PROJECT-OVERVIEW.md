# Project Overview — Chicking Mohali Franchise Lead Engine

*A bird's-eye view of what this system is, how it's built, and how a lead flows through it
end to end. Written to be read by a person or an AI assistant.*

---

## 1. The problem it solves

Chicking Mohali needs two distinct streams of leads, captured and acted on quickly:

1. **B2B — franchise / investor enquiries.** Prospects with capital who want to open a
   Chicking outlet. These are high-value and need fast, qualified follow-up.
2. **B2C — "founders club" customer waitlist.** Local customers registering interest ahead
   of the store opening, with a referral mechanic to grow the list virally.

Manually triaging these from a form inbox is slow, inconsistent, and leaks hot leads. This
platform automates capture → qualification → routing → reporting so the franchise team only
ever spends time on leads that are worth their time.

## 2. Architecture at a glance

```
   ┌─────────────────────┐
   │  Landing site (Astro)│  franchise.astro · founders.astro · waitlist.astro
   │  chicking-mohali...  │  (public, static, Cloudflare Pages)
   └──────────┬──────────┘
              │  POST /api/leads
              ▼
   ┌─────────────────────────────────────────────┐
   │  Lead API — Cloudflare Worker (TypeScript)   │
   │  • validates + size-limits + de-duplicates   │
   │  • writes to D1 (SQLite at the edge)         │
   │  • forwards to the pipeline (durable)        │
   │  • serves the admin dashboard (authenticated)│
   └──────────┬───────────────────────┬──────────┘
              │ webhook (signed)       │ admin API (password)
              ▼                        ▼
   ┌─────────────────────┐   ┌────────────────────┐
   │  n8n automation     │   │  Admin dashboard   │
   │  W1 → W2 → W3       │   │  (Next.js)         │
   └─────────┬───────────┘   └────────────────────┘
             │
   ┌─────────┴───────────────────────────────────┐
   │ AI scoring (Claude) · compliance audit ·     │
   │ HubSpot CRM · Telegram hot-lead alert ·      │
   │ Resend daily digest email                    │
   └──────────────────────────────────────────────┘
```

**Design principle:** the Cloudflare Worker is the durable system of record; n8n is the
automation brain; every external dependency (CRM, email, AI, alerts) is reachable but never
allowed to block or lose a lead.

## 3. The end-to-end lead journey

1. **Capture.** A visitor submits the franchise form or joins the founders club. The form
   posts to the Worker.
2. **Validate & store.** The Worker validates the payload (required fields, phone format,
   size limits), **de-duplicates** on phone (a repeat submission updates the existing lead
   rather than creating a twin), generates a server-authoritative referral code for
   founders-club members, and writes the lead to **D1**.
3. **Durable forward.** The Worker forwards the lead to the automation pipeline over a
   **signed webhook**, and records the outcome. If the pipeline is briefly unavailable, a
   **15-minute cron job automatically re-sends** any lead that didn't get through — so a lead
   is never silently lost.
4. **AI scoring (W2 — B2B only).** Claude scores the lead 0–100 against a franchise-fit
   rubric and proposes a tier (HOT / WARM / COLD) and a priority action. A second **AI
   compliance auditor** independently checks the output against brand guardrails before
   anything is published.
5. **Effective tier + CRM.** Only a lead that scores HOT **and** passes the compliance audit
   triggers an instant **Telegram hot-lead alert**. The result (score, tier, action, audit
   status) is written to **HubSpot** (create-or-update, never a duplicate) **and back to D1**,
   so the dashboard and the daily digest report real numbers rather than guesses.
6. **B2C path.** Founders-club leads skip investor scoring entirely (it would mis-rate them),
   are acknowledged instantly, and flow straight into the daily digest and referral tracking.
7. **Daily digest (W3).** Once a day, an AI-written, brand-safe digest of the **last 24 hours**
   of leads (B2B and B2C separated, with KPI counts) is emailed to the franchise team via
   Resend.

## 4. Components

| Component | Tech | What it does |
|---|---|---|
| **Landing** (`web/landing`) | Astro, static | Franchise + founders-club + consent/legal pages; posts leads to the API |
| **Lead API** (`web/worker`) | Cloudflare Worker (TS) + D1 | Validation, dedup, storage, durable forwarding, admin API, cron replay |
| **Admin dashboard** (`web/dashboard`) | Next.js | Password-gated pipeline view: leads, tiers, notes, Excel export |
| **W1 — Lead Intake** (`web/n8n`) | n8n | Receives the lead, acknowledges instantly, routes to scoring (non-blocking) |
| **W2 — AI Lead Scoring** (`web/n8n`) | n8n + Claude | Scores B2B leads, audits for compliance, upserts CRM, fires hot alerts, writes back to D1 |
| **W3 — Daily Digest** (`web/n8n`) | n8n + Claude + Resend | Brand-safe daily pipeline summary email |

## 5. Notable engineering details

- **Edge-native and cheap to run.** Cloudflare Workers + D1 means the API and database live
  at the edge with no server to maintain; the pipeline adds automation without a server leash.
- **De-duplication & idempotency.** The same person submitting twice never creates a duplicate
  lead or a duplicate alert.
- **Durable delivery.** Forwarding state is tracked; a cron replay self-heals any lead that
  didn't reach the pipeline.
- **Two-stage AI with a compliance gate.** A scoring model and an independent auditor model —
  a HOT alert can only fire when the score *and* the audit agree.
- **Deterministic reporting.** Scores are persisted to the database, so dashboards and digests
  report facts, not LLM guesses.
- **Brand-safe by construction.** The AI layer is constrained by explicit guardrails (no
  fabricated financial/returns claims, no off-brand language).

## 6. Tech stack

| Layer | Choice |
|---|---|
| Marketing site | Astro (static, Cloudflare Pages) |
| Lead API + DB | Cloudflare Workers + D1 (SQLite at the edge) |
| Admin dashboard | Next.js (static export) |
| Orchestration | n8n (self-hosted) |
| AI | Anthropic Claude (scoring + compliance audit + digest writing) |
| CRM | HubSpot |
| Email | Resend |
| Instant alerts | Telegram |
| Language | TypeScript throughout the application code |

---

*Built and operated by Rudra Digital. For the engineering standards behind every release —
security, compliance, reliability, and QA — see [ENGINEERING-RIGOUR.md](ENGINEERING-RIGOUR.md).*
