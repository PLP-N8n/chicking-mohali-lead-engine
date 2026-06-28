-- 0003: persist W2 AI scoring back to D1 (was previously written only to HubSpot, so the
-- digest + dashboard could not show real tier counts). Apply to the live chicking-leads DB:
--   wrangler d1 execute chicking-leads --remote --file=migrations/0003_scoring_fields.sql
ALTER TABLE leads ADD COLUMN score          INTEGER;          -- 0..100, null = unscored
ALTER TABLE leads ADD COLUMN tier           TEXT;             -- HOT | WARM | COLD | NEEDS_REVIEW
ALTER TABLE leads ADD COLUMN priority_action TEXT;            -- short next-step text from the scorer
ALTER TABLE leads ADD COLUMN audit_status   TEXT;             -- PASS | FAIL (compliance auditor)
ALTER TABLE leads ADD COLUMN scored_at      INTEGER;          -- unixepoch when scoring landed

CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
