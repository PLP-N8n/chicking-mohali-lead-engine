-- 0004: durable forwarding state so a lead saved while n8n is down isn't silently lost.
-- A scheduled (cron) replay re-forwards anything stuck. Apply to the live DB:
--   wrangler d1 execute chicking-leads --remote --file=migrations/0004_forward_tracking.sql
ALTER TABLE leads ADD COLUMN forward_status TEXT NOT NULL DEFAULT 'pending';  -- pending | ok | failed
ALTER TABLE leads ADD COLUMN forwarded_at   INTEGER;
ALTER TABLE leads ADD COLUMN forward_error  TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_forward_status ON leads(forward_status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(type, phone);  -- speeds the dedup lookup
