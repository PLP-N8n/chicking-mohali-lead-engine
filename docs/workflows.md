# Chicking Mohali — n8n Workflows

All workflows run in n8n self-hosted at `https://<n8n-host>` (Docker on ThinkCentre).
From Docker, host services are at `172.17.0.1` (not localhost).

---

## W1 — Lead Intake Relay

**Workflow ID:** `oV8cNY5gg5IkA2XL`  
**Trigger:** Webhook POST at `https://<n8n-host>/webhook/chicking-lead-intake`  
**Called by:** Cloudflare Worker (fire-and-forget via `ctx.waitUntil`)

### Node sequence

```
[Webhook] → [Gayatri API call] → [Respond to webhook]
                                → [Trigger W2 Scoring]  ← parallel branch
```

**Node: Webhook**
- Method: POST
- Authentication: none (internal trigger from Worker)
- Receives: full lead JSON from Worker (id, type, name, phone, city, investment, email, property, format, background, experience, created_at)

**Node: Gayatri API call**
- HTTP POST to `http://172.17.0.1:8000/api/chicking/lead-intake`
- Body: full lead JSON
- Gayatri does: HubSpot sync, Telegram alert, Resend email, WhatsApp draft

**Node: Respond to webhook**
- Returns 200 OK to Worker (unblocks Worker response to the user)

**Node: Trigger W2 Scoring** (parallel with Respond)
- HTTP POST to n8n W2 webhook
- Body: full lead data
- Fire-and-forget: W1 does not wait for W2 result

---

## W2 — AI Lead Scoring

**Workflow ID:** `iX1Uvf0sQ2poYto3`  
**Trigger:** HTTP webhook from W1  
**Runs:** After every new lead

### Node sequence

```
[Score Trigger]
      │
      ▼
[LLM Generator] ──── Ollama minimax-m3
      │               System prompt: llm-guidelines.yaml b2b section + scoring rubric
      │               Returns JSON: {score, tier, reasoning, priority_action}
      ▼
[Parse Score] ──── Extracts score (0-100), tier (HOT/WARM/COLD), reasoning
      │
      ▼
[LLM Auditor] ──── Ollama minimax-m3 (independent call)
      │              System prompt: llm-guidelines.yaml auditor section
      │              Input: Generator output
      │              Returns: "PASS" or "FAIL: <reason>"
      │
      ▼
[Audit OK?] ──── branches on PASS vs FAIL
      │
      ├── FAIL ──► [Telegram Audit Fail] → stop
      │
      └── PASS
            │
            ▼
      [HubSpot Search] ──── find contact by phone
            │
            ▼
      [HubSpot Patch] ──── update chicking_lead_score, tier, reasoning
            │
            ▼
      [Is HOT?] ──── score >= 80 or tier == "HOT"
            │
            ├── YES ──► [Telegram HOT Alert]
            │           "🔥 HOT LEAD: {name} — {city} — Score {score}/100"
            │
            └── NO  ──► (done)
            │
            ▼
      [Respond] ──── 200 OK to W1
```

### Scoring rubric (from llm-guidelines.yaml)

| Tier | Score | Criteria |
|------|-------|---------|
| HOT | 80-100 | Location identified, capital readiness confirmed (₹60L+), QSR/retail background, actively engaged |
| WARM | 40-79 | Location scouting, capital available, responsive |
| COLD | 0-39 | Enquiry only, wrong city, no financial commitment, unresponsive |

---

## W3 — Daily Ajay Digest

**Workflow ID:** `YgTxi4sCi48lR2l2`  
**Trigger:** Cron `30 4 * * *` = 04:30 UTC = 10:00am IST  
**Recipient:** ajkum4r@gmail.com

### Node sequence

```
[Daily 10am IST Cron]
      │
      ├──► [Fetch B2B leads] ──── GET /api/leads?type=b2b&since=720  (last 30 days)
      │
      └──► [Fetch B2C leads] ──── GET /api/leads?type=b2c&since=720  (parallel)
      │
      ▼
[Merge Data] ──── combines B2B + B2C arrays
      │
      ▼
[LLM Digest Generator] ──── Ollama minimax-m3
      │                       System prompt: llm-guidelines.yaml ajay_digest section
      │                       Input: full lead arrays + today's date
      │                       Returns: HTML email with 6 sections
      │
      ▼
[LLM Auditor] ──── Ollama minimax-m3 (independent call)
      │              Validates: facts, tone, no unconfirmed promises
      │              Returns: PASS or FAIL: <reason>
      │
      ▼
[Audit OK?]
      │
      ├── FAIL ──► [Telegram Audit Fail] → stop (digest not sent)
      │
      └── PASS
            │
            ▼
      [Email Ajay via Resend]
            FROM: franchise@rudradigital.uk   ← BLOCKED until domain verified
            TO:   ajkum4r@gmail.com
            Subject: "Chicking Mohali — Daily Pipeline Report {date}"
            Body: HTML digest from Generator
            │
            ▼
      [Telegram Digest Sent] ──── confirms to Hunny that digest was sent
```

### Digest sections (per llm-guidelines.yaml)

1. **B2B Pipeline** — HOT / WARM / COLD counts with city breakdown
2. **Overdue WARM leads** — location not updated in 7+ days
3. **Re-engagement needed** — COLD leads untouched 21+ days
4. **B2C Waitlist** — total signups, city breakdown, persona breakdown
5. **Actions required today** — prioritised list for Ajay
6. **Revenue forecast** — HOT+WARM pipeline value

---

## LLM Node Configuration (all Ollama nodes)

```
Base URL:  http://172.17.0.1:11434/api/generate
Model:     minimax-m3
Temperature: 0.3 (Generator) / 0.1 (Auditor — strict validation)
num_predict: 4096
```

**System prompt structure for Generator nodes:**
```
You are an AI assistant for Chicking Mohali franchise operations.

Brand Voice: {brand_voice from llm-guidelines.yaml}
Verified Facts: {verified_facts from llm-guidelines.yaml}
B2B Context: {b2b section from llm-guidelines.yaml}

[task-specific instructions]

Respond ONLY with valid JSON. No preamble. No explanation.
```

**System prompt structure for Auditor nodes:**
```
{auditor section from llm-guidelines.yaml}

Review the following output:
{generator_output}

Respond with exactly:
PASS
or
FAIL: <one sentence reason>
```

---

## Generator → Auditor Pattern

This pattern is used in W2 and W3. The Auditor is always a fresh LLM call with no knowledge of the Generator's reasoning — it only sees the output. This prevents the Generator from "convincing" the Auditor.

Auto-fail triggers (Auditor will always FAIL on):
- Any halal reference (Mohali is NOT halal-certified)
- Any investment figure other than ₹60 Lakhs+
- Any payback period, returns, ROI, or EBITDA figure (earnings claims — Meta + SEBI FUTP)
- Outlet count below 400 or stated as exact without `+` qualifier
- Opening date stated without confirmed source
- "First/only/exclusive in North India" or any existing North-India footprint claim
- Offensive or culturally insensitive content
