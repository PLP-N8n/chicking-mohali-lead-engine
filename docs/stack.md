# Chicking Mohali — Full Stack Reference

## Services & URLs

| Service | URL / Endpoint | Status |
|---------|---------------|--------|
| Landing page | https://chicking-mohali.pages.dev | Live |
| Landing — franchise | https://chicking-mohali.pages.dev/franchise | Live |
| Landing — waitlist | https://chicking-mohali.pages.dev/waitlist | Live |
| Dashboard | https://chicking-dashboard.pages.dev | Live |
| Dashboard — leads | https://chicking-dashboard.pages.dev/leads | Live |
| Dashboard — pipeline map | https://chicking-dashboard.pages.dev/flow | Live |
| Cloudflare Worker API | https://chicking-api.cvchaudhary.workers.dev | Live |
| n8n (self-hosted) | https://<n8n-host> | Live (Docker) |
| Processing API | https://internal-api (internal only) | Live |
| HubSpot CRM | EU1 portal | Live |
| AI inference | http://127.0.0.1:11434 | Live (server) |

---

## Cloudflare Resources

| Resource | Name / ID |
|---------|-----------|
| Worker | `chicking-api` |
| Worker script | `chicking-api.cvchaudhary.workers.dev` |
| D1 Database name | `chicking-leads` |
| D1 Database ID | `<D1_DATABASE_ID>` |
| Pages project (landing) | `chicking-mohali` |
| Pages project (dashboard) | `chicking-dashboard` |
| Worker env: N8N_WEBHOOK_URL | `https://<n8n-host>/webhook/chicking-lead-intake` |
| Worker env: LANDING_ORIGIN | `https://chicking-mohali.pages.dev` |
| Worker env: DASHBOARD_ORIGIN | `https://chicking-dashboard.pages.dev` |

---

## n8n Workflows

| Workflow | ID | Trigger | Status |
|---------|-----|---------|--------|
| W1 — Lead Intake Relay | `oV8cNY5gg5IkA2XL` | Webhook POST `/webhook/chicking-lead-intake` | Active |
| W2 — AI Lead Scoring | `iX1Uvf0sQ2poYto3` | HTTP trigger from W1 | Active |
| W3 — Daily Ajay Digest | `YgTxi4sCi48lR2l2` | Cron `30 4 * * *` (04:30 UTC) | Active |

n8n is running in Docker on server. From inside Docker, host services are at `internal-host` (not `localhost`).
- Processing API from n8n: `https://internal-api`
- AI inference from n8n: `http://internal-host:11434/api/generate`

---

## Credentials & Secrets

> All secrets should live in `.env` at backend root. Listed here for documentation — do not commit values.

| Key | Value / Location |
|-----|-----------------|
| `HUBSPOT_ACCESS_TOKEN` | `***` (HubSpot EU1) |
| `RESEND_API_KEY` | `***` |
| `TELEGRAM_BOT_TOKEN` | In `.env` |
| `TELEGRAM_CHAT_ID` | In `.env` |
| `META_ACCESS_TOKEN` | `PLACEHOLDER_GET_FROM_AJAY` |
| Gmail IMAP password | `fapf miks wdkq jajt` (cvchaudhary@purelivingpro.co.uk) |
| Ajay email | `ajkum4r@gmail.com` |
| Hunny email | `chandervikas@gmail.com` |
| Rudra Digital email | `cvchaudhary@purelivingpro.co.uk` |
| Resend FROM address | `franchise@rudradigital.uk` |

---

## Source Code Locations

| Component | Path |
|-----------|------|
| Cloudflare Worker | `projects/chicking/web/worker/` |
| Worker route — POST lead | `web/worker/src/routes/leads.post.ts` |
| Worker route — GET leads | `web/worker/src/routes/leads.get.ts` |
| Worker route — PATCH lead | `web/worker/src/routes/leads.patch.ts` |
| Worker route — Export CSV | `web/worker/src/routes/leads.export.ts` |
| D1 schema (original) | `web/worker/schema.sql` |
| Worker config | `web/worker/wrangler.toml` |
| Landing page | `projects/chicking/web/landing/` |
| Landing — waitlist | `web/landing/src/pages/index.astro` |
| Landing — franchise | `web/landing/src/pages/franchise.astro` |
| Dashboard | `projects/chicking/web/dashboard/` |
| Dashboard — leads page | `web/dashboard/src/app/leads/page.tsx` |
| Dashboard — pipeline map | `web/dashboard/src/app/flow/page.tsx` |
| Dashboard — API client | `web/dashboard/src/lib/api.ts` |
| Dashboard — leads table | `web/dashboard/src/components/LeadsTable.tsx` |
| Dashboard — stats bar | `web/dashboard/src/components/StatsBar.tsx` |
| Processing API endpoint | `src/engine/api.py` → `POST /api/chicking/lead-intake` |
| LLM guidelines | `projects/chicking/llm-guidelines.yaml` |
| Open questions | `projects/chicking/ajay-questions.md` |
| Brand assets | `projects/chicking/assets/` |
| Reference documents | `projects/chicking/attachments/` (14 PDFs/XLSXs from Ajay) |

---

## Infrastructure Notes

**Cloudflare Worker deployment:**
```bash
cd projects/chicking/web/worker
npx wrangler deploy
```

**Landing page deployment:**
```bash
cd projects/chicking/web/landing
npm run build
npx wrangler pages deploy dist --project-name=chicking-mohali
```

**Dashboard deployment:**
```bash
cd projects/chicking/web/dashboard
npm run build
npx wrangler pages deploy out --project-name=chicking-dashboard
```

**D1 schema migrations (run via wrangler):**
```bash
# The 5 ALTER TABLE statements that expanded from 7 to 12 columns were run via:
npx wrangler d1 execute chicking-leads --remote --command="ALTER TABLE leads ADD COLUMN email TEXT"
npx wrangler d1 execute chicking-leads --remote --command="ALTER TABLE leads ADD COLUMN property TEXT"
npx wrangler d1 execute chicking-leads --remote --command="ALTER TABLE leads ADD COLUMN format TEXT"
npx wrangler d1 execute chicking-leads --remote --command="ALTER TABLE leads ADD COLUMN background TEXT"
npx wrangler d1 execute chicking-leads --remote --command="ALTER TABLE leads ADD COLUMN experience TEXT"
```

**Email setup (pending):**
1. Log into resend.com → Domains → Add `rudradigital.uk`
2. Add the TXT and CNAME records Resend provides into Cloudflare DNS for rudradigital.uk
3. Once verified, W3 digest and franchise confirmation emails will start landing

**Cloudflare Email Routing (pending):**
- Set up `franchise@rudradigital.uk` → forwards to `chandervikas@gmail.com`
- Allows leads to reply to their confirmation email and it reaches Hunny

---

## HubSpot Property Map

All custom properties created on the Contact object in EU1:

| Property Name | Label | Type | Writer |
|--------------|-------|------|--------|
| `enquiry_type` | Enquiry Type | string | W1/the processing engine |
| `investment_range` | Investment Range | string | W1/the processing engine |
| `business_background` | Business Background | string | W1/the processing engine |
| `city_of_interest` | City of Interest | string | W1/the processing engine |
| `chicking_pincode` | Pincode | string | W1/the processing engine |
| `location_score` | Location Score | number | W1/the processing engine |
| `lead_source_detail` | Lead Source Detail | string | W1/the processing engine |
| `chicking_property_status` | Property Status | string | W1/the processing engine |
| `chicking_outlet_format` | Outlet Format | string | W1/the processing engine |
| `chicking_franchise_experience` | Franchise Experience | string | W1/the processing engine |
| `chicking_lead_score` | AI Lead Score | number | W2 |
| `hs_lead_status` | Lead Status | string | W1 |
