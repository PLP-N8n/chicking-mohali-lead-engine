# Chicking Franchise Lead Automation — Workflow Scaffold

> **Source of truth:** `docs/strategy/franchise-lead-automation-playbook.pdf` + `docs/strategy/Chicking_Launch_Playbook.pdf`, mapped to the current Chicking Mohali stack.
> **Scope:** Document the target end-to-end lead-automation workflow, mark what is already built vs. pending, list the **exact external input** that unblocks each pending stage, and deliver a buildable n8n skeleton for the `capture → score → route` stages that can be assembled today.
> **Do NOT commit this file as production code.** It is documentation + scaffold only.

---

## 1. Target Pipeline (per the Playbook)

```text
[CAPTURE]    Site franchise form  →  Cloudflare Worker API  →  D1  →  n8n webhook
                 │
                 ▼
[ENRICH]     Pincode → India Post lookup + Google Maps (competition / footfall / cannibalisation)
                 │
                 ▼
[SCORE]      Claude location brief  →  6-dimension 0–100 score  →  HOT / WARM / COOL tier
                 │
                 ▼
[ROUTE]      Slack + Telegram + WhatsApp alerts to Ajay / BD team
                 │
                 ▼
[NURTURE]    7-email + mirrored WhatsApp sequence over 21 days
                 │
                 ▼
[BOOKING]    Calendly  →  Pre-call brief  →  Discovery call  →  Fireflies transcript  →  LOI dispatch
                 │
                 ▼
[ONBOARD]    Signed LOI  →  Project checklist  →  Welcome series  →  Partner WhatsApp group
```

**Playbook rule:** zero manual intervention from form submit up to the discovery call.

---

## 2. Stage-by-Stage Status: BUILT / PENDING / UNBLOCK

| Stage | Playbook Activity | BUILT | PENDING | External Input / Change That Unblocks It |
|---|---|---|---|---|
| **1. Capture** | Multi-channel form intake; duplicate check; UTM capture; pincode + decision-maker; immediate SMS/WhatsApp ack. | ✅ Landing page `chicking-mohali.pages.dev/franchise` live with 9-field B2B form (name, phone, email, city, property, format, investment, background, experience).<br>✅ Cloudflare Worker `POST /api/leads` validates, writes to D1, and fires n8n webhook via `ctx.waitUntil`.<br>✅ D1 `leads` table has 12 columns (7 original + 5 added via `ALTER TABLE`).<br>✅ n8n **W1 Lead Intake Relay** (`oV8cNY5gg5IkA2XL`) receives webhook and forwards to internal services.<br>✅ HubSpot contact create/update on every lead. | ❌ **Pincode** not collected on the form (playbook requires it for India Post + Google Maps lookup).<br>❌ **UTM source/medium/campaign/content** not captured (needed for ROI measurement).<br>❌ **Decision-maker flag** (`is_decision_maker`) not captured.<br>❌ Franchise form still packs extra fields into a legacy `notes` JSON bundle. | Form + Worker update only; **no new API key**. Add pincode, UTM params, `is_decision_maker` to `web/landing/src/pages/franchise.astro` and `web/worker/src/routes/leads.post.ts`. |
| **2. Enrichment** | India Post pincode → city/district/state. Google Maps Nearby Search for QSR competition (KFC/McD/Popeyes/BK/etc.) within 1/2/3 km. Footfall proxies (malls, metro, colleges, hospitals, cinemas). Cannibalisation check against 62 existing TFIL outlets. Territory check vs 7 states. Claude synthesises 200-word Location Viability Brief. | ⚠️ **Partial.** Worker/Gayatri does pincode → city lookup via `postalpincode.in` and assigns a **static location score** (Mohali/Chandigarh/Ludhiana/Amritsar = 85; Jalandhar/Patiala/Zirakpur = 65; base = 40).<br>✅ City normalised and stored in HubSpot. | ❌ No **Google Maps Nearby Search** for competition counts per radius band.<br>❌ No **footfall proxy** scoring.<br>❌ No **cannibalisation check** against existing Chicking outlets.<br>❌ No AI-generated 200-word Location Viability Brief. | 1. **Google Maps API key** with Places + Nearby Search enabled + billing.<br>2. **ANTHROPIC_API_KEY** for Claude location-intelligence brief synthesis.<br>3. **Ajay's 62 existing outlet coordinates** (lat/lng list or pincode list). |
| **3. Scoring** | 6-dimension weighted score: Location Viability (25) + Budget Fit (20) + Professional Background (15) + City Tier (15) + Response Speed (15) + Form Completeness (10). +15 bonus for operational-experience keywords. Routing: HOT ≥75, WARM 45–74, COOL <45. | ✅ n8n **W2 AI Lead Scoring** (`iX1Uvf0sQ2poYto3`) runs after every lead.<br>✅ Generator → Auditor pattern with local **Ollama minimax-m3**.<br>✅ Score stored in HubSpot `chicking_lead_score`; tier `HOT/WARM/COLD` used for Telegram routing. | ⚠️ Current score is a qualitative LLM rubric, **not the playbook's deterministic 6-dimension formula**.<br>❌ Location-viability sub-score is static, not derived from Maps data. | **ANTHROPIC_API_KEY** (Claude Sonnet) + **Google Maps API results** to compute the deterministic score. Can build a placeholder deterministic layer now using static fields and upgrade to live Maps data later. |
| **4. Routing** | HOT lead → instant Slack + WhatsApp alert to Ajay + BD Head; WARM → nurture; COOL → newsletter. | ✅ Telegram alert on every new lead.<br>✅ Telegram **HOT lead** priority alert from W2.<br>✅ Telegram **audit-failure** alert. | ❌ **Slack** channel integration.<br>❌ **WhatsApp Business API** alerts to Ajay/BD team. | 1. **Slack webhook URL** for `#franchise-leads` (or equivalent channel).<br>2. **WhatsApp Business account number** + Interakt/AiSensy BSP account. |
| **5. Email / WhatsApp Sequences** | 7-email sequence (Day 0, 2, 5, 8, 12, 17, 21). WhatsApp mirror 2h after email open. Pause on reply, booking, or Calendly click. 48h non-open triggers subject-line A/B retry. | ❌ **W4 Follow-up Engine** not started.<br>⚠️ Confirmation email is drafted in Gayatri but not sent (Resend domain blocked). | ❌ Sequence engine.<br>❌ Day 8 AI city-opportunity paragraph.<br>❌ Open-pixel tracking + A/B retry. | 1. **Resend domain verification** for `rudradigital.uk` (TXT + CNAME in Cloudflare DNS).<br>2. **ANTHROPIC_API_KEY** for Day 8 paragraph and any AI-written sequence variants.<br>3. **Calendly link** from Ajay.<br>4. **Meta WhatsApp template approval** for 5 templates via Interakt/AiSensy. |
| **6. Booking / Discovery** | Calendly booking → Claude pre-call brief 30 min before call → Google Meet → Fireflies transcript → parsed summary → CRM deal update → LOI dispatch. | ❌ Not started. | ❌ Calendly integration.<br>❌ Pre-call brief generator.<br>❌ Call transcript parser.<br>❌ LOI / DocuSign workflow. | 1. **Calendly account** + webhook URL.<br>2. **Fireflies.ai or Otter.ai** API key.<br>3. **DocuSign / PandaDoc / DigiLocker** account + LOI template.<br>4. **ANTHROPIC_API_KEY** for pre-call brief + transcript parser. |
| **7. Onboarding** | Signed LOI → Notion/ClickUp project → 5-email onboarding welcome series → private WA group → win-back data feed. | ❌ Not started. | ❌ Full onboarding automation. | 1. Project-management tool account (Notion/ClickUp).<br>2. WhatsApp group admin rights.<br>3. Onboarding email templates. |

---

## 3. Current Production Flow (verified)

```text
Landing form (Astro / Cloudflare Pages)
        │ POST /api/leads
        ▼
Cloudflare Worker — validate, write D1, fire-and-forget n8n webhook
        │
        ├─► D1 chicking-leads  (source of truth)
        │
        └─► n8n W1 Webhook /webhook/chicking-lead-intake
                │
                ├──► Internal lead-intake service (phone normalise, pincode lookup, HubSpot sync,
                │      Telegram alert, Resend email draft, WhatsApp draft)
                │
                └──► n8n W2 AI Lead Scoring (parallel)
                       • Ollama Generator: score + tier + reasoning
                       • Ollama Auditor: PASS / FAIL
                       • HubSpot patch chicking_lead_score
                       • Telegram HOT alert
                       • (email send blocked by Resend domain)

n8n W3 Daily Digest (cron 04:30 UTC)
        • Fetches B2B + B2C leads from Worker API
        • Generator → Auditor produces HTML digest
        • Resend to ajkum4r@gmail.com ← BLOCKED by domain
        • Telegram confirmation / audit-failure alert
```

**Existing n8n workflows**

| Workflow | ID | Trigger | Status |
|---|---|---|---|
| W1 — Lead Intake Relay | `oV8cNY5gg5IkA2XL` | Webhook POST `/webhook/chicking-lead-intake` | Active |
| W2 — AI Lead Scoring | `iX1Uvf0sQ2poYto3` | HTTP trigger from W1 | Active |
| W3 — Daily Ajay Digest | `YgTxi4sCi48lR2l2` | Cron `30 4 * * *` (04:30 UTC) | Active |

---

## 4. Buildable n8n Skeleton: Capture → Score → Route

This is the **minimum viable node graph** that can be built **now** with existing credentials (Ollama on `172.17.0.1:11434`, HubSpot, Telegram). It mirrors the current W1 + W2 flow and exposes clean extension points for Google Maps, Claude, Slack, and Calendly.

### 4.1 Node-by-Node Outline

```text
[1] Webhook — "Chicking Lead Intake"
    Method: POST
    Path: /webhook/chicking-lead-intake
    Response mode: responseNode
    Body expected: { id, type, name, phone, city, investment, email, property,
                     format, background, experience, created_at }

[2] HTTP Request — "Forward to Internal Intake"
    Method: POST
    URL: http://172.17.0.1:8000/api/chicking/lead-intake   (or equivalent internal service)
    Body: {{ JSON.stringify($json) }}

[3] Respond to Webhook — "Acknowledge Worker"
    Status Code: 200
    Response Body: { "ok": true }
    Note: connected in parallel to [1], so the Worker gets 200 immediately.

[4] HTTP Request — "Trigger W2 Scoring"
    Method: POST
    URL: https://<n8n-host>/webhook/chicking-lead-score
    Body: {{ JSON.stringify($json) }}
    Note: fire-and-forget branch from [2]; W1 does not wait.

────────────────────────────────────────────────────────────

[5] Webhook — "W2 Score Trigger"
    Method: POST
    Path: /webhook/chicking-lead-score
    Authentication: none (internal)

[6] Ollama Chat Model — "Score Generator"
    Base URL: http://172.17.0.1:11434/api/generate
    Model: minimax-m3
    Temperature: 0.3
    System prompt: B2B scoring rubric from docs/llm-guidelines.yaml
    User prompt: Lead JSON + verified facts + scoring rules
    Output parser: JSON { score, tier, reasoning, priority_action }

[7] Ollama Chat Model — "Score Auditor"
    Base URL: http://172.17.0.1:11434/api/generate
    Model: minimax-m3
    Temperature: 0.1
    System prompt: Auditor instructions from docs/llm-guidelines.yaml
    User prompt: Generator output
    Output parser: PASS or FAIL: <reason>

[8] IF — "Audit OK?"
    Condition: {{ $json.audit.startsWith('PASS') }}
    ├─ FALSE → [9] Telegram — "Audit Failure Alert" → stop
    └─ TRUE  → [10] HubSpot — "Search Contact by Phone"

[10] HubSpot — "Search Contact by Phone"
    Operation: Contact → search
    Filter: phone equals {{ $json.phone }}

[11] IF — "Contact Exists?"
    Condition: {{ $json.results.length > 0 }}
    ├─ TRUE  → [12a] HubSpot — "Update Contact" (score/tier/reasoning)
    └─ FALSE → [12b] HubSpot — "Create Contact" (with score/tier/reasoning)

[13] IF — "HOT Lead?"
    Condition: {{ $json.score >= 75 OR $json.tier == 'HOT' }}
    ├─ TRUE  → [14] Telegram — "HOT Lead Alert"
    └─ FALSE → [15] No Operation — "Done"

[14] Telegram — "HOT Lead Alert"
    Text: 🔥 HOT LEAD: {{ $json.name }} — {{ $json.city }} — Score {{ $json.score }}/100
    Chat ID: from TELEGRAM_CHAT_ID env

[15] Respond to Webhook — "200 OK to W1"
    Status Code: 200
```

### 4.2 Importable JSON Skeleton

Paste this into **n8n → Workflow → Import from JSON**. Replace placeholder credential IDs after import.

```json
{
  "name": "Chicking — Capture to Score to Route (Skeleton)",
  "nodes": [
    {
      "parameters": {
        "path": "chicking-lead-intake",
        "responseMode": "responseNode"
      },
      "name": "W1 Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://172.17.0.1:8000/api/chicking/lead-intake",
        "sendBody": true,
        "contentType": "json",
        "body": "={{ JSON.stringify($json) }}"
      },
      "name": "Forward to Internal Intake",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "statusCode": 200,
        "responseBody": "{\"ok\":true}"
      },
      "name": "W1 Acknowledge",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [450, 500]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://<n8n-host>/webhook/chicking-lead-score",
        "sendBody": true,
        "contentType": "json",
        "body": "={{ JSON.stringify($json) }}"
      },
      "name": "Trigger W2 Scoring",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [650, 500]
    },
    {
      "parameters": {
        "path": "chicking-lead-score",
        "responseMode": "responseNode"
      },
      "name": "W2 Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 700]
    },
    {
      "parameters": {
        "model": "minimax-m3",
        "options": { "temperature": 0.3, "num_predict": 4096 },
        "messages": {
          "message": [
            {
              "role": "system",
              "content": "You are an AI franchise lead scorer for Chicking Mohali. Use the brand rules and scoring rubric in docs/llm-guidelines.yaml. Return ONLY valid JSON: {score,tier,reasoning,priority_action}. No preamble."
            },
            {
              "role": "user",
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        }
      },
      "name": "Score Generator",
      "type": "n8n-nodes-base.ollamaChatModel",
      "typeVersion": 1,
      "position": [450, 700],
      "credentials": {
        "ollamaApi": {
          "id": "YOUR_OLLAMA_CRED_ID",
          "name": "Ollama (ThinkCentre)"
        }
      }
    },
    {
      "parameters": {
        "model": "minimax-m3",
        "options": { "temperature": 0.1, "num_predict": 256 },
        "messages": {
          "message": [
            {
              "role": "system",
              "content": "You are a strict brand compliance auditor for Chicking Mohali. You audit the SCORER'S wording for brand-claim violations, NOT the applicant's data. Respond EXACTLY: PASS or FAIL: <one sentence reason>. AUTO-FAIL on ANY: halal reference; any payback/ROI/returns/EBITDA/earnings/profit figure or promise; guaranteed or fixed returns; a specific franchise fee/cost stated as a brand claim (the only allowed franchise-investment phrasing is 'Rs60 Lakhs+'); first/only-in-North-India claim; unconfirmed opening date; more than 1 exclamation mark; more than 1 emoji. DO NOT fail for referencing the applicant's own capital, budget, or investment capacity; that is lead data, not a brand claim."
            },
            {
              "role": "user",
              "content": "={{ JSON.stringify($json) }}"
            }
          ]
        }
      },
      "name": "Score Auditor",
      "type": "n8n-nodes-base.ollamaChatModel",
      "typeVersion": 1,
      "position": [650, 700],
      "credentials": {
        "ollamaApi": {
          "id": "YOUR_OLLAMA_CRED_ID",
          "name": "Ollama (ThinkCentre)"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const audit = $json.audit || '';\nreturn audit.startsWith('PASS') ? [{pass:true}] : [{pass:false, reason:audit}];"
      },
      "name": "Audit OK?",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [850, 700]
    },
    {
      "parameters": {
        "chatId": "={{ $env.TELEGRAM_CHAT_ID }}",
        "text": "⚠️ W2 Audit FAIL: {{ $json.reason }}"
      },
      "name": "Telegram Audit Fail",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [1050, 600]
    },
    {
      "parameters": {
        "operation": "search",
        "filterGroupsUi": {
          "filterGroups": [
            {
              "filters": [
                {
                  "propertyName": "phone",
                  "operator": { "value": "EQ" },
                  "value": "={{ $json.phone }}"
                }
              ]
            }
          ]
        }
      },
      "name": "HubSpot Search Phone",
      "type": "n8n-nodes-base.hubspot",
      "typeVersion": 3,
      "position": [1050, 800]
    },
    {
      "parameters": {
        "jsCode": "return ($json.results || []).length > 0 ? [{exists:true}] : [{exists:false}];"
      },
      "name": "Contact Exists?",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1250, 800]
    },
    {
      "parameters": {
        "operation": "update",
        "contactId": "={{ $json.results[0].id }}",
        "properties": {
          "chicking_lead_score": "={{ $json.score }}",
          "hs_lead_status": "={{ $json.tier }}"
        }
      },
      "name": "HubSpot Patch Score",
      "type": "n8n-nodes-base.hubspot",
      "typeVersion": 3,
      "position": [1450, 700]
    },
    {
      "parameters": {
        "operation": "create",
        "properties": {
          "firstname": "={{ $json.name }}",
          "phone": "={{ $json.phone }}",
          "email": "={{ $json.email }}",
          "chicking_lead_score": "={{ $json.score }}",
          "hs_lead_status": "={{ $json.tier }}"
        }
      },
      "name": "HubSpot Create Contact",
      "type": "n8n-nodes-base.hubspot",
      "typeVersion": 3,
      "position": [1450, 900]
    },
    {
      "parameters": {
        "jsCode": "const s = Number($json.score || 0);\nconst t = $json.tier || '';\nreturn (s >= 75 || t === 'HOT') ? [{hot:true}] : [{hot:false}];"
      },
      "name": "Is HOT?",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1650, 800]
    },
    {
      "parameters": {
        "chatId": "={{ $env.TELEGRAM_CHAT_ID }}",
        "text": "🔥 HOT LEAD: {{ $json.name }} — {{ $json.city }} — Score {{ $json.score }}/100"
      },
      "name": "Telegram HOT Alert",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [1850, 700]
    },
    {
      "parameters": {
        "statusCode": 200
      },
      "name": "W2 Done",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1850, 900]
    }
  ],
  "connections": {
    "W1 Webhook": {
      "main": [
        [
          { "node": "Forward to Internal Intake", "type": "main", "index": 0 },
          { "node": "W1 Acknowledge", "type": "main", "index": 0 }
        ]
      ]
    },
    "Forward to Internal Intake": {
      "main": [
        [{ "node": "Trigger W2 Scoring", "type": "main", "index": 0 }]
      ]
    },
    "Trigger W2 Scoring": {
      "main": [[]]
    },
    "W2 Webhook": {
      "main": [
        [{ "node": "Score Generator", "type": "main", "index": 0 }]
      ]
    },
    "Score Generator": {
      "main": [
        [{ "node": "Score Auditor", "type": "main", "index": 0 }]
      ]
    },
    "Score Auditor": {
      "main": [
        [{ "node": "Audit OK?", "type": "main", "index": 0 }]
      ]
    },
    "Audit OK?": {
      "main": [
        [{ "node": "Telegram Audit Fail", "type": "main", "index": 0 }],
        [{ "node": "HubSpot Search Phone", "type": "main", "index": 0 }]
      ]
    },
    "HubSpot Search Phone": {
      "main": [
        [{ "node": "Contact Exists?", "type": "main", "index": 0 }]
      ]
    },
    "Contact Exists?": {
      "main": [
        [{ "node": "HubSpot Patch Score", "type": "main", "index": 0 }],
        [{ "node": "HubSpot Create Contact", "type": "main", "index": 0 }]
      ]
    },
    "HubSpot Patch Score": {
      "main": [
        [{ "node": "Is HOT?", "type": "main", "index": 0 }]
      ]
    },
    "HubSpot Create Contact": {
      "main": [
        [{ "node": "Is HOT?", "type": "main", "index": 0 }]
      ]
    },
    "Is HOT?": {
      "main": [
        [{ "node": "Telegram HOT Alert", "type": "main", "index": 0 }],
        [{ "node": "W2 Done", "type": "main", "index": 0 }]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "tags": []
}
```

### 4.3 Extension Points for Later APIs

| Extension Point | Node Insertion | Required Credential |
|---|---|---|
| Google Maps competition scan | After W2 Webhook, before Score Generator | `GOOGLE_MAPS_API_KEY` (Places + Nearby Search) |
| Anthropic location brief | After Maps scan, before Score Generator | `ANTHROPIC_API_KEY` |
| Deterministic 6-dimension scoring | Replace `Score Generator` logic or add a Code node before it | Maps viability_score + form fields |
| Slack routing | Parallel to Telegram HOT Alert | Slack webhook URL |
| WhatsApp BD alert | Parallel to Slack | Interakt / AiSensy API key |
| Email sequence engine | New workflow W4 triggered by W2 output | Resend API key + verified `franchise@rudradigital.uk` |
| Calendly booking | New workflow W5 triggered by Calendly webhook | Calendly account + webhook URL |
| Pre-call brief / transcript parser | Inside W5 | `ANTHROPIC_API_KEY` + Fireflies API key |

---

## 5. Playbook Scoring Formula & Routing Matrix

Use this as the deterministic target. The current LLM rubric (from `docs/llm-guidelines.yaml`) can remain as a qualitative override layer until the deterministic layer is live.

| Dimension | Max Pts | Scoring Logic |
|---|---|---|
| Location Viability | 25 | `viability_score * 0.25`. HIGH verdict = 25; MEDIUM = 15; LOW = 5. |
| Budget Fit | 20 | ₹75L+ = 20; ₹60–75L = 15; ₹40–60L = 8; < ₹40L = 2. |
| Professional Background | 15 | F&B / hospitality / franchise / FMCG = 15; business owner = 10; other = 5. |
| City Tier | 15 | Tier 1 (Delhi, Chandigarh, Jaipur, Lucknow) = 15; Tier 2 (Mohali, Amritsar, Agra, Meerut) = 10; Tier 3 = 5. |
| Response Speed & Engagement | 15 | Replies within 24h = 15; opens Day 0 email = 10; no open = 2. |
| Form Completeness | 10 | All fields + specific location = 10; most fields = 6; minimal = 2. |
| **Bonus: Operational Experience** | **+15** | NLP detects `hotel`, `restaurant`, `F&B`, `FMCG`, `franchise`, `retail chain` in background/notes. |

**Routing Matrix**

| Score | Tier | Action | SLA |
|---|---|---|---|
| 75–100 | HOT | Slack + WhatsApp alert to Ajay + BD Head. Calendly link in Day 0 email. Personal follow-up call within 24h. | 24h |
| 60–74 | WARM (High) | 7-email sequence + webinar invite. BD call within 5 days. | 5 days |
| 45–59 | WARM (Standard) | 7-email sequence + monthly webinar. BD review at Day 21. | 21 days |
| 25–44 | COOL | Monthly newsletter. Re-qualification email at Day 90. | 90 days |
| 0–24 | UNQUALIFIED | Annual touchpoint list only. Review after 6 months. | 6 months |

---

## 6. CRM Custom Fields Required by the Playbook

These fields should exist on the HubSpot Contact object. The built fields are already populated by W1/W2; the pending fields need the enrichment + sequence stages.

| Field | Type | Source / Writer |
|---|---|---|
| `franchise_city` | text | Pincode lookup / W1 |
| `franchise_pincode` | text | Form (pending) |
| `budget_range` | dropdown | Form / W1 |
| `location_type_pref` | dropdown | Form / W1 |
| `chicking_lead_score` | number | W2 (built) |
| `hs_lead_status` / `routing_tier` | dropdown | W2 (built) |
| `viability_score` | number | Google Maps + Claude (pending) |
| `viability_verdict` | dropdown | Claude (pending) |
| `location_brief` | multi-line text | Claude (pending) |
| `recommended_format` | dropdown | Claude (pending) |
| `email_sequence_day` | number | W4 (pending) |
| `next_email_date` | date | W4 (pending) |
| `is_decision_maker` | dropdown | Form (pending) |
| `utm_source` / `utm_medium` / `utm_campaign` | text | Form + URL (pending) |
| `call_summary` | multi-line text | Fireflies + Claude (pending) |
| `objections_raised` | multi-line text | Fireflies + Claude (pending) |
| `budget_confirmed` | text | Fireflies + Claude (pending) |
| `loi_view_count` | number | DocuSign webhook (pending) |

---

## 7. External Inputs Checklist

| Input | Why Needed | Owner / Source | Status |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Claude location-intelligence brief, Day 8 city paragraph, pre-call brief, transcript parser | Hunny / Anthropic dashboard | Not configured |
| Google Maps API key with **Nearby Search** enabled | Competition counts + footfall proxies within 1/2/3 km; pincode geocoding | Hunny / Google Cloud | Not configured |
| **Ajay's 62 existing outlet coordinates** | Cannibalisation check (flag if proposed location within 2.5 km of existing Chicking outlet) | Ajay Kumar | Pending |
| **Mohali Walks opening date** | Required for Day 5 case-study email and Day 21 call CTA without auditor FAIL | Ajay / ops team | Pending confirmation |
| **Calendly account / link** | Discovery call booking; pre-call brief trigger; Day 21 CTA | Ajay Kumar | Pending |
| Resend domain verification (`rudradigital.uk`) | Sends confirmation email + daily digest | Hunny / Resend + Cloudflare DNS | Blocked |
| Slack `#franchise-leads` webhook | Hot-lead routing to BD team | Hunny / Slack | Pending |
| WhatsApp Business account number | B2C acknowledgements + BD hot-lead alerts | Ajay Kumar | Pending |
| Meta WhatsApp template approval | 5 templates (welcome, nudge, city brief, call invite, LOI reminder) | Hunny / Interakt or AiSensy | Pending |
| Fireflies.ai / Otter.ai API key | Call transcript parsing | Hunny | Pending |
| DocuSign / PandaDoc / DigiLocker account | LOI dispatch + signing | Hunny / Ajay | Pending |
| Meta Ads access token | Lead-source attribution for scoring | Ajay Kumar | Pending (`PLACEHOLDER_GET_FROM_AJAY`) |

---

## 8. Files to Update Once Inputs Arrive

| File | Change |
|---|---|
| `web/landing/src/pages/franchise.astro` | Add pincode input, UTM capture, decision-maker dropdown. Remove notes-JSON packing once Worker fields are stable. |
| `web/worker/src/routes/leads.post.ts` | Accept and persist `pincode`, `utm_*`, `is_decision_maker`. Update D1 insert statement. |
| `web/worker/schema.sql` | Document 12-column schema + new pincode/UTM columns. |
| `docs/llm-guidelines.yaml` | Add Maps-based scoring prompt and 6-dimension point table if deterministic scoring becomes policy. |
| Internal lead-intake service | Add Google Maps nearby-search integration and Claude location-brief generator. |
| n8n W2 workflow | Swap or augment Ollama scoring with deterministic Maps + Claude brief layer. |

---

## 9. Outcome

- **Goal:** Produce a single implementation document that maps the franchise lead-automation playbook to the current Chicking Mohali stack, marks every built vs. pending stage, lists the exact external inputs that unblock the pending stages, and provides a buildable n8n skeleton for `capture → score → route`.
- **Deliverable path:** `/home/hunny/ventures/chicking/docs/workflow/README.md`
- **Verification checked:**
  - Read `docs/strategy/franchise-lead-automation-playbook.pdf` and extracted the 7-stage pipeline, 6-dimension scoring formula, routing matrix, prompts, and tech-stack requirements.
  - Read `docs/strategy/Chicking_Launch_Playbook.pdf` for Mohali Walks context, target unit position, opening milestones, and financial guardrails.
  - Cross-referenced `docs/workflows.md`, `docs/architecture.md`, `docs/state.md`, `docs/stack.md`, `docs/brand.md`, `docs/llm-guidelines.yaml`, and `docs/ajay-questions.md` for currently built components and pending blockers.
  - Inspected `web/landing/src/pages/franchise.astro` and `web/worker/src/routes/leads.post.ts` to confirm current field capture, notes-JSON backwards-compat, and webhook payload shape.
  - Confirmed existing n8n workflow IDs (W1 `oV8cNY5gg5IkA2XL`, W2 `iX1Uvf0sQ2poYto3`, W3 `YgTxi4sCi48lR2l2`) from `docs/stack.md`.
- **Business impact:** Prevents building the nurture/booking/onboarding engine before its prerequisites are known. The team can now prioritise sourcing the 5 critical inputs (`ANTHROPIC_API_KEY`, Google Maps API key, outlet coordinates, opening date, Calendly) before starting W4, W5, and full enrichment.
- **Next action:** Hunny to source the external inputs listed in Section 7; once `ANTHROPIC_API_KEY` + Google Maps key + outlet coordinates are available, build the enrichment layer and update n8n W2 to compute the playbook's deterministic 6-dimension score.
