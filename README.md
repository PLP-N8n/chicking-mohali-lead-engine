# Chicking Mohali — Franchise Lead Engine

A production, AI-assisted lead-capture and qualification platform built by **Rudra Digital**
for the **Chicking Mohali** franchise. It turns a website visitor into a qualified,
scored, CRM-tracked lead — and gives the franchise team a same-day picture of their pipeline
— with no manual data entry.

> **This repository is a curated, read-only snapshot** prepared for review. Secrets,
> credentials, customer data, and internal commercial documents have been removed. It exists
> so the architecture, engineering quality, and scope of the delivery can be assessed at a
> glance (by a person or an AI assistant).

## Start here
- **[PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)** — the full bird's-eye view: what it does, the
  architecture, and the end-to-end lead journey. *Read this first.*
- **[ENGINEERING-RIGOUR.md](ENGINEERING-RIGOUR.md)** — how it's built to a professional standard:
  the security, compliance, reliability, and QA process behind every release.

## What's live
| Surface | URL | Purpose |
|---|---|---|
| Landing site | `chicking-mohali.pages.dev` | Public franchise + founders-club lead capture |
| Lead API | Cloudflare Worker | Validates, stores, and routes every lead |
| Admin dashboard | `chicking-dashboard.pages.dev` | Password-protected pipeline view for the team |
| Automation pipeline | n8n (self-hosted) | AI scoring → CRM → alerts → daily digest |

## Stack at a glance
Astro (landing) · Cloudflare Workers + D1 (API + database) · Next.js (admin dashboard) ·
n8n (orchestration) · Anthropic Claude (AI scoring + compliance audit) · HubSpot (CRM) ·
Resend (email) · Telegram (instant hot-lead alerts).

## Repository map
```
web/worker/      Cloudflare Worker — the lead API (TypeScript) + D1 schema & migrations
web/landing/     Astro marketing + lead-capture site (franchise, founders-club, consent pages)
web/dashboard/   Next.js admin dashboard (password-gated pipeline view)
web/n8n/         The three automation workflows (W1 intake → W2 scoring → W3 digest), redacted
docs/            Architecture, stack, and workflow documentation
```
