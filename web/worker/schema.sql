-- Canonical schema for the chicking-leads D1 database.
-- NOTE: the live DB grew via ALTER TABLE over time (b2b franchise fields, then
-- founders-club b2c fields). This file is the full current shape for a fresh install;
-- for the existing live DB apply the incremental migrations in ./migrations/.
CREATE TABLE IF NOT EXISTS leads (
  id          TEXT    PRIMARY KEY,
  type        TEXT    NOT NULL CHECK(type IN ('b2c','b2b')),
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  city        TEXT,
  investment  TEXT,
  status      TEXT    NOT NULL DEFAULT 'new'
                      CHECK(status IN ('new','contacted','qualified','dropped')),
  notes       TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  -- b2b franchise fields (added via ALTER TABLE)
  email       TEXT,
  property    TEXT,
  format      TEXT,
  background  TEXT,
  experience  TEXT,
  -- founders-club b2c fields (added via ALTER TABLE — migrations/0002)
  campaign       TEXT,
  referral_code  TEXT,   -- this member's own shareable code
  referred_by    TEXT,   -- the code they arrived with
  instagram      TEXT,
  whatsapp_optin INTEGER NOT NULL DEFAULT 0,
  -- W2 AI scoring writeback (migrations/0003) — deterministic data for digest + dashboard
  score           INTEGER,         -- 0..100, null = unscored
  tier            TEXT,            -- HOT | WARM | COLD | NEEDS_REVIEW
  priority_action TEXT,
  audit_status    TEXT,            -- PASS | FAIL
  scored_at       INTEGER,
  -- forwarding state (migrations/0004) — durable so a lead saved while n8n is down isn't lost
  forward_status  TEXT NOT NULL DEFAULT 'pending',  -- pending | ok | failed
  forwarded_at    INTEGER,
  forward_error   TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_type          ON leads(type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at    ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_campaign      ON leads(campaign);
CREATE INDEX IF NOT EXISTS idx_leads_referral_code ON leads(referral_code);
CREATE INDEX IF NOT EXISTS idx_leads_referred_by   ON leads(referred_by);
CREATE INDEX IF NOT EXISTS idx_leads_tier          ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_forward_status ON leads(forward_status);
CREATE INDEX IF NOT EXISTS idx_leads_phone         ON leads(type, phone);
