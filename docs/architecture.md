# Chicking Mohali — System Architecture

## Data Flow Overview

```
User (web form)
      │
      ▼
Cloudflare Pages (Landing)          Cloudflare Pages (Dashboard)
chicking-mohali.pages.dev           chicking-dashboard.pages.dev
/waitlist  → B2C form               /leads  → lead table + status management
/franchise → B2B form               /flow   → pipeline architecture map
      │
      ▼ POST /api/leads
Cloudflare Worker
chicking-api.cvchaudhary.workers.dev
  • Validates (type, name, phone required; 10-digit phone)
  • Stores 9 fields in D1
  • Fires n8n webhook (ctx.waitUntil — non-blocking)
      │
      ├──► D1 Database (chicking-leads)        ◄── Dashboard reads from here
      │    Source of truth for all leads
      │
      └──► n8n W1 Webhook (fire-and-forget)
                 │
                 ▼
           n8n W1: Lead Intake Relay
             • Forwards to the processing engine FastAPI (internal)
             • Simultaneously triggers W2 scoring (parallel)
                 │
                 ├──► the processing engine FastAPI (port 8000, internal)
                 │      • Phone normalised to E.164 (+91XXXXXXXXXX)
                 │      • HubSpot: search → PATCH existing or POST new
                 │      • Pincode lookup (postalpincode.in)
                 │      • Location score (85/65/40 tiered)
                 │      • AI inference AI model: drafts WhatsApp message
                 │      • HubSpot: updates note + score
                 │      • Telegram: HTML alert to Hunny
                 │      • Resend: confirmation email to lead (franchise@rudradigital.uk)
                 │          └── BLOCKED: domain not verified yet
                 │
                 └──► n8n W2: AI Lead Scoring (parallel, per-lead)
                            • AI inference Generator: scores 0-100, returns JSON
                            • AI inference Auditor: validates score output
                            • HubSpot: patches chicking_lead_score property
                            • If HOT (80-100): Telegram priority alert to Hunny
                            • If Auditor FAIL: Telegram alert, email NOT sent
                 │
           n8n W3: Daily Digest (independent cron)
             Fires: 04:30 UTC = 10:00am IST daily
             • Fetches B2B leads (last 720h) from Worker API
             • Fetches B2C leads (last 720h) from Worker API
             • Merges data
             • AI inference Generator: produces HTML digest report
             • AI inference Auditor: validates brand compliance
             • Resend: sends email digest to Ajay (ajkum4r@gmail.com)
                 └── BLOCKED: domain not verified yet
             • Telegram: confirms digest sent (or flags audit failure)
```

---

## Layer Breakdown

### Layer 1 — Entry (Public)

**Landing Page** (`web/landing/` — Astro 5)
- `/` — B2C waitlist form (name, phone, city, message)
- `/franchise` — B2B franchise enquiry (9 fields)
- `/waitlist` — standalone waitlist page
- `/ajay` — internal status page for Ajay
- Built with Astro 5, deployed to Cloudflare Pages
- API endpoint: `PUBLIC_API_URL=https://chicking-api.cvchaudhary.workers.dev`
- Franchise form packs extra fields into `notes` JSON bundle for backwards compat with older Worker versions

**Form fields captured (B2B franchise):**
```
name, phone, email, city, investment, property (own/identified/looking),
format (food-court/dine-in/flexible), background (free text), experience (yes-food/yes-retail/no)
```

**Form fields captured (B2C waitlist):**
```
name, phone, city
```

---

### Layer 2 — API + Storage (Cloudflare)

**Cloudflare Worker** (`web/worker/` — TypeScript)
- URL: `chicking-api.cvchaudhary.workers.dev`
- Routes:
  - `POST /api/leads` — create lead (validates, stores, fires webhook)
  - `GET /api/leads?type=b2b&since=720h` — fetch leads (used by dashboard + W3)
  - `PATCH /api/leads/:id` — update status/notes (used by dashboard)
  - `GET /api/leads/export` — CSV export

**D1 Database** (`chicking-leads`)
- Database ID: `<D1_DATABASE_ID>`
- Schema (production — includes ALTER TABLE migrations, schema.sql file is not fully current):
  ```sql
  CREATE TABLE leads (
    id          TEXT    PRIMARY KEY,      -- 16-char UUID hex
    type        TEXT    NOT NULL,         -- 'b2c' | 'b2b'
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    city        TEXT,
    investment  TEXT,                     -- e.g. '75L', '75L-1Cr'
    status      TEXT    DEFAULT 'new',    -- 'new'|'contacted'|'qualified'|'dropped'
    notes       TEXT,                     -- legacy JSON bundle (older form versions)
    email       TEXT,                     -- B2B: added via ALTER TABLE
    property    TEXT,                     -- B2B: own/identified/looking
    format      TEXT,                     -- B2B: food-court/dine-in/flexible
    background  TEXT,                     -- B2B: free text
    experience  TEXT,                     -- B2B: yes-food/yes-retail/no
    created_at  INTEGER DEFAULT (unixepoch()),
    updated_at  INTEGER DEFAULT (unixepoch())
  );
  ```
  Note: `email`, `property`, `format`, `background`, `experience` were added via `ALTER TABLE` after initial deploy. The `schema.sql` file reflects the original 7-column schema only.

**CORS:** Worker allows both `chicking-mohali.pages.dev` and `chicking-dashboard.pages.dev` as origins.

---

### Layer 3 — AI + CRM (Internal)

**the processing engine FastAPI** (`src/engine/api.py` — Python)
- Port: 8000 (internal only — never expose publicly)
- Endpoint: `POST /api/chicking/lead-intake`
- ChickingLead Pydantic model fields: `name, phone, enquiry_type, type, email, city_of_interest, city, pincode, investment_range, business_background, property_status, outlet_format, franchise_experience, message, consent, notes`
- `coerce_fields` model_validator handles aliasing (enquiry_type↔type, property↔property_status, format↔outlet_format, background↔business_background, experience↔franchise_experience) and unpacks legacy notes JSON bundle

**HubSpot CRM** (EU1 region)
- Private app token: `***`
- Dedup strategy: search by phone → PATCH if exists, POST if new; 409 CONFLICT → regex-extract existing ID, PATCH
- Custom contact properties (13 total):
  ```
  enquiry_type, investment_range, business_background, city_of_interest,
  chicking_pincode, location_score, lead_source_detail,
  chicking_property_status, chicking_outlet_format, chicking_franchise_experience,
  chicking_lead_score (W2 writes this), hs_lead_status
  ```

**AI inference (local)** — model: `AI model`
- Used by: the processing engine FastAPI (WA message drafting), W2 Generator, W2 Auditor, W3 Generator, W3 Auditor
- Zero API cost — runs on server locally
- n8n accesses via: `http://internal-host:11434` (host IP from Docker container)

**Telegram**
- Sends HTML alerts for: every new lead (W1), HOT leads (W2), audit failures (W2/W3), daily digest confirmation (W3)

**Resend** (transactional email)
- API key: `***`
- FROM: `franchise@rudradigital.uk`
- Status: **BLOCKED** — domain `rudradigital.uk` not yet verified in Resend dashboard
- Fix: add Resend DNS records (TXT + CNAME) in Cloudflare DNS for rudradigital.uk

---

### Layer 4 — W2 AI Scoring (Per-Lead)

Triggered by W1 in parallel after each lead is processed.

**Scoring rubric** (from `llm-guidelines.yaml`):
```
HOT  (80-100): Location identified, capital confirmed, QSR/retail background, active
WARM (40-79):  Location being scouted, capital available, responsive
COLD (0-39):   Enquiry only, wrong city, no financial commitment, unresponsive
```

Generator prompt includes full lead data + llm-guidelines context.
Auditor independently validates using its own prompt — FAIL triggers Telegram alert, blocks HubSpot update.

---

### Layer 5 — W3 Daily Digest (Cron)

Runs at 04:30 UTC (10:00am IST) every day.

Digest sections (per `llm-guidelines.yaml > ajay_digest`):
1. B2B Pipeline: HOT/WARM/COLD counts with city breakdown
2. Overdue WARM leads: location not updated in 7+ days
3. Re-engagement needed: COLD leads untouched 21+ days
4. B2C Waitlist: total signups, city breakdown, persona breakdown
5. Actions required today: prioritised list for Ajay
6. Revenue forecast: HOT+WARM pipeline value

---

### Layer 6 — Dashboard (Internal)

**Dashboard** (`web/dashboard/` — Next.js 14, App Router)
- Deployed to: `chicking-dashboard.pages.dev`
- Pages:
  - `/` — redirect or home
  - `/leads` — full leads table, auto-refreshes every 60s, status management, CSV export
  - `/flow` — pipeline architecture map (visual, color-coded 5-layer diagram)
- API reads from Cloudflare Worker (`NEXT_PUBLIC_API_URL=https://chicking-api.cvchaudhary.workers.dev`)
- Components: `LeadsTable`, `StatsBar`, `NotesModal`

---

## Generator → Auditor Pattern

All AI-generated content follows this pattern before any external send:

```
1. Generator LLM call → draft content (message/score/digest)
2. Auditor LLM call → independent validation → PASS or FAIL: <reason>
3. If PASS → send to lead / update HubSpot / email Ajay
4. If FAIL → Telegram alert to Hunny, nothing sent to external party
```

This ensures brand compliance on every outbound communication.
The auditor checks against: verified_facts, tone rules, no unconfirmed promises, correct sign-off, no hallucinated numbers.
