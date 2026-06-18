-- Migration 0002 — promote founders-club b2c fields out of the `notes` JSON blob
-- into real columns, and add referral tracking. Apply to the live chicking-leads DB:
--   wrangler d1 execute chicking-leads --remote --file=migrations/0002_founders_fields.sql
-- (assumes the b2b ALTERs — email/property/format/background/experience — are already live)

ALTER TABLE leads ADD COLUMN campaign       TEXT;
ALTER TABLE leads ADD COLUMN referral_code  TEXT;   -- this member's own shareable code
ALTER TABLE leads ADD COLUMN referred_by    TEXT;   -- the code they arrived with
ALTER TABLE leads ADD COLUMN instagram      TEXT;
ALTER TABLE leads ADD COLUMN whatsapp_optin INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_campaign      ON leads(campaign);
CREATE INDEX IF NOT EXISTS idx_leads_referral_code ON leads(referral_code);
CREATE INDEX IF NOT EXISTS idx_leads_referred_by   ON leads(referred_by);
