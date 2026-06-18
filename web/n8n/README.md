# n8n workflow exports (secret-scrubbed)

The Chicking pipeline runs on n8n (docker, v2.5.1) which is **live, not deployed from this
repo**. These are **secret-scrubbed snapshots** of the live workflows, kept here so the repo
has a durable record (the live-not-in-repo gap has caused stale-state confusion before).
Secrets (`<ANTHROPIC_KEY>`, `<HUBSPOT_TOKEN>`, `<RESEND_KEY>`, `<ADMIN_SECRET>`,
`bot<TELEGRAM_TOKEN>`, `<W2_WEBHOOK_SECRET>`) are redacted — restore real values from the
live workflow / env before importing.

| File | Workflow | n8n ID |
|------|----------|--------|
| `W1-lead-intake.json` | Chicking — W1: Lead Intake | `oV8cNY5gg5IkA2XL` |
| `W2-ai-scoring.json`  | Chicking — W2: AI Lead Scoring | `iX1Uvf0sQ2poYto3` |
| `W3-digest.json`      | Chicking — W3: Daily Ajay Digest | `YgTxi4sCi48lR2l2` |

## Changes — 2026-06-18 (post cross-model review + E2E)
- **W1:** made `Gayatri — Process Lead` non-blocking. `Auth Check` now fans out to
  `Respond to Form` + `Trigger W2 Scoring` + Gayatri (parallel); Gayatri is a dead-end with
  `onError=continueRegularOutput`. Previously its 422 from the HQ API killed the whole
  pipeline (no response, no W2 scoring). The user now gets an instant "thank you" and W2 runs
  regardless of the HQ logging side-effect.
- **W2:** (1) `Is HOT?` now requires **tier==HOT AND audit PASS** (no more false HOT alerts
  on a failed audit). (2) New `Write Score to D1` node — fans out from `LLM Auditor`, PATCHes
  `score`/effective-`tier`/`priority_action`/`audit_status` back to D1 so the digest +
  dashboard read deterministic data instead of guessing. (3) New `Is B2B?` gate after
  `Auth Check` — b2c founders-club leads skip investor scoring (`Respond B2C`) and are no
  longer mis-scored / polluting HubSpot. (4) **Auditor prompt fixed** — it was auto-failing
  any lead whose capital was stated as other than "Rs60 Lakhs+", so well-capitalised leads
  (e.g. "1 Cr") wrongly became NEEDS_REVIEW and never HOT. Now it audits the scorer's
  brand-claim wording, not the applicant's own capital.
- **W3:** added `Authorization: Bearer <ADMIN_SECRET>` to both `Fetch B2B/B2C Leads` nodes —
  the worker's admin API is now authenticated, so the digest was silently 401'ing.

All verified live end-to-end 2026-06-18: strong b2b → HOT + alert + D1 writeback; audit-fail
→ NEEDS_REVIEW, no false alert; b2c → skips scoring. See `docs/review/`.

## Known follow-ups
- HQ endpoint `POST /api/chicking/lead-intake` returns 422 ("Input should be a valid string")
  — the Gayatri logging side-effect is non-blocking now but still failing; fix the HQ schema.
- Move hardcoded node secrets into the n8n credential store (P2).
- Replay job for leads saved but not forwarded (P1, roadmap).
