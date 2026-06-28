# Chicking Mohali — Project Handover & System Overview

**Prepared for:** Ajay Kumar — Trinity Foods International, and your AI assistant
**Prepared by:** Rudra Digital
**Date:** 28 June 2026

> This is the full picture of what we've built for Chicking Mohali: how a lead's information travels from the website all the way to your dashboard, what runs automatically behind the scenes, how we protect the data, how this delivers your playbook, and what we'd need from you to scale it. Written so both you and your AI assistant can follow it end to end.

---

## 1. In one paragraph

We built an **AI-assisted franchise lead engine**: branded landing pages capture enquiries, a Cloudflare-hosted engine validates, de-duplicates, enriches (with location intelligence), and **scores** each lead, then drives an automated journey — instant acknowledgement, location analysis, nurture, booking, reminders — while sending you a **daily digest** and giving you a **live dashboard**. It's deployed, live, and ahead of its build milestones. The remaining step to *volume* is connecting paid ad traffic (your Meta ad account) and a few access handovers.

---

## 2. How a lead's information flows (form → engine → dashboard)

**Two entry points (forms):**

- **Franchise enquiry (B2B)** — `/franchise`: name, phone (WhatsApp), email, city, property status, preferred format, investment band, background, experience, consent.
- **Customer waitlist (B2C)** — `/waitlist`: name, phone, city, consent, optional marketing opt-in.

**The journey, step by step:**

1. **Submission (HTTPS).** The form POSTs securely to our engine (`/api/leads`). This is the first trust boundary — the engine validates everything before trusting it.
2. **Intake & validation.** The engine size-limits the request (anti-abuse), validates every field, normalises the phone to international format, and records **consent** (DPDP Act basis).
3. **De-duplication ("first-touch wins").** A repeat submission can't overwrite or expose an existing lead — duplicates are safely ignored.
4. **Secure storage.** The lead is written to a **Cloudflare D1 database** (encrypted at rest). This is the single source of truth.
5. **The funnel begins.** Each lead moves through clear stages — `INTAKE → ENRICHED → LOCATED → SCORED → NURTURE → BOOKED → CALL_DONE → LOI → SIGNED → ONBOARDED` — advanced automatically by a scheduler that runs every minute.
6. **Location intelligence.** For franchise leads, the system analyses the area (competitors, footfall) and produces an AI viability brief.
7. **Scoring.** Every lead is scored and tiered — **HOT / WARM / COLD** — on a consistent, rules-based model. HOT requires a real signal (e.g. a booked call), never a self-claim, so the tier you see is trustworthy.
8. **Engagement.** Acknowledgement email goes out instantly; booking, reminders, and nurture follow.
9. **Visibility.** Everything surfaces on your **dashboard** in real time, and a **daily digest** lands in your inbox each morning.

---

## 3. The automation workflows (behind the scenes)

These run on **n8n** (an automation engine) and the Cloudflare Worker. *Verified live, 28 June 2026:*

| Workflow | What it does | Fires when |
|----------|--------------|-----------|
| **W1 — Lead Intake** | Receives the form, authenticates it, hands the lead to the engine | A form is submitted |
| **W-LOCATED — Location Intelligence** | Geocodes the area, scans nearby competitors + footfall, writes an AI viability brief | A franchise lead is enriched |
| **W2 — AI Lead Scoring** | Runs the deterministic score + a brand-compliance audit, mirrors the contact to HubSpot, alerts you on HOT leads | A lead reaches the scoring stage |
| **W-ACK — Acknowledgement** | Sends the lead an instant branded "thanks, we'll be in touch" email with a booking link | A new lead arrives |
| **W-APPT — Booking Confirmation** | Sends a confirmation + calendar invite when a call is booked | A call is booked |
| **W-APPT-REMINDER** | Sends a reminder 24 hours before the call | A booked call is approaching |
| **W-NOSHOW — Recovery** | Detects no-shows and runs a polite 3-touch recovery | A booked call is missed |
| **W3 — Daily Digest** | Emails you the day's pipeline summary (~9:00 AM IST); stays quiet on zero-lead days | Daily |
| **W-OPS — Pipeline Watchdog** | Monitors the pipeline for stuck or failed steps | Continuously |
| **W4 — Day-0 Welcome (nurture)** | First nurture email; head of the follow-up sequence (built, switched on with the nurture layer) | A scored lead enters nurture |

---

## 4. The emails & messages

**To your leads:**

- **Acknowledgement** — instant, branded, with a link to book a call.
- **Booking confirmation** — with a calendar invite, on booking.
- **Reminder** — 24 hours before a booked call.
- **Nurture sequence** — a Day-0 welcome and follow-up cadence (built; activates once your sender domain is verified).

**To you (Ajay):**

- **Daily digest** (~9:00 AM IST) — the day's leads broken down by tier (HOT/WARM/COLD) and type (B2B/B2C), overdue follow-ups, re-engagement needed, and the day's priority actions. On a zero-lead day it stays silent and pings us internally instead, so your inbox stays clean.
- **Instant Telegram alerts** — for new leads and especially HOT leads, so you can act fast.

---

## 5. The landing pages

| Page | Purpose |
|------|---------|
| **Home** — [chicking-mohali.pages.dev](https://chicking-mohali.pages.dev) | Brand landing; franchise as the primary call-to-action |
| **Franchise (B2B)** — [chicking-mohali.pages.dev/franchise](https://chicking-mohali.pages.dev/franchise) | Enquiry form for prospective franchisees |
| **Waitlist (B2C)** — [chicking-mohali.pages.dev/waitlist](https://chicking-mohali.pages.dev/waitlist) | Customer sign-up for opening-day notification |
| **Founders Club** — [chicking-mohali.pages.dev/founders](https://chicking-mohali.pages.dev/founders) | Referral tier with a (privacy-masked) leaderboard |
| **Booking** — [chicking-mohali.pages.dev/book](https://chicking-mohali.pages.dev/book) | Self-serve call booking (secure, tokenised link) |
| **Privacy / Terms / Data-request** — [/privacy](https://chicking-mohali.pages.dev/privacy) · [/terms](https://chicking-mohali.pages.dev/terms) · [/data-request](https://chicking-mohali.pages.dev/data-request) | DPDP Act compliance pages |

---

## 6. Your dashboard — `chicking-dashboard.pages.dev/leads`

A live owner's view of the whole pipeline:

- **Leads table** — every lead with tier, stage, city, and contact details
- **Status management & notes** — work each lead, record what happened
- **Funnel / pipeline stats** — counts by stage and tier
- **CSV export** — pull the data out any time
- **Booking visibility** — see scheduled calls

Access is **owner-only** (protected by a private key); the public website can never read your lead data.

---

## 7. Security & safety — how the data is protected

We ran an **independent, multi-model security review** of the whole system on 28 June. The posture is **strong**. In plain terms:

- **Encrypted** in transit (HTTPS) and at rest (Cloudflare).
- **Owner-only access** to leads, with a timing-safe key check; the public site cannot read data.
- **Database hardened** — all queries are parameterised (no injection), so form input can never tamper with the database.
- **Anti-abuse** — size limits and validation on every public form.
- **Duplicate-safe** intake — no leak, no overwrite, no way to probe whether a lead exists.
- **Tamper-proof booking links** — cryptographically signed; can't be forged.
- **Export safety** — protected against spreadsheet-formula attacks.
- **Brand-compliance gate** — every automated message is checked against your brand rules (₹60 Lakhs+ only, no earnings/return claims, no halal references, confirmed opening date) *before* it can be sent.
- **Privacy (DPDP Act)** — consent captured at the point of collection; a data-request page for access/withdrawal.

A short list of routine hardening items came out of the review; none expose data today, and they're scheduled.

---

## 8. How this delivers your playbook

Your franchise-lead-automation playbook describes a funnel: **ads → landing → capture → scoring → nurture → booking → LOI → dashboard.** We've delivered **that exact funnel** — but on a stronger technical foundation than the playbook's original Make.com approach.

| Playbook intent | How we delivered it | Status |
|-----------------|---------------------|--------|
| Capture franchise + customer leads | Branded landing pages + smart capture | ✅ Live |
| Qualify/score leads automatically | In-engine deterministic scoring (HOT/WARM/COLD) | ✅ Live |
| Location/market intelligence | AI location brief (competitors + footfall) | ✅ Live |
| Automated follow-up | Acknowledgement live; nurture sequence built | ✅ / 🔨 |
| Booking & reminders | Self-serve booking + reminders + no-show recovery | ✅ Live |
| Owner reporting | Daily digest + live dashboard | ✅ Live |
| Compliance & brand safety | Built-in compliance gate | ✅ Live |
| Ads → traffic | Creative ready; runs on your Meta account | ⏳ Needs your ad account |

**The key point:** the *technology stack is different* (Cloudflare-native + n8n rather than Make.com) — and that's an upgrade: it's faster, more reliable, and isn't dependent on a single third-party automation tool. **The outcomes your playbook asked for have been built and delivered.**

---

## 9. Want to take it for a spin? (and what we'd need to go full-scale)

**Try it yourself — a 2-minute test:**

1. Open **`/franchise`** and submit a test enquiry (use your own details).
2. Watch it appear on your **dashboard** within a minute, scored and tiered.
3. Check your inbox for the **acknowledgement email**, and try the **booking link**.
4. You'll see the **daily digest** arrive the next morning.

**To move from "built" to a flowing pipeline at volume, we'd need from you:**

1. **Meta ad account + Business Manager access** (and your ad budget) — this powers the actual lead traffic and the 50-leads goal.
2. **Approve the Instagram/Meta ad creative.**
3. **WhatsApp Business** number + provider — unlocks WhatsApp follow-up.
4. **Sender-domain verification** for chicking@trinityfoodsintl.com — switches the nurture emails live.
5. **Existing-outlets list** — so targeting avoids your own catchments.
6. **Confirmed opening date** + booking calendar.

---

## 10. Follow the project

A curated technical snapshot of the project is maintained here:
**https://github.com/PLP-N8n/chicking-mohali-lead-engine**

It holds the project overview, the engineering-rigour notes, and the documentation — a transparent window into what's been built.

---

*We continue to supervise the entire pipeline on your behalf, end to end. We'd be glad to walk you and your team through any part of it on a call.*

*— Rudra Digital*
