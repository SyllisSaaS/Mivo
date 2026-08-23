-- =============================================================
-- Mivo — database schema
--
-- Apply with:  npm run db:setup
-- Safe to re-run: every statement is idempotent.
--
-- No secrets, API keys or passwords belong in this database
-- beyond the owner's bcrypt password hash (in `admins`).
-- =============================================================

-- ---- Owner accounts -----------------------------------------
-- There is exactly one row in practice. No public registration
-- exists; rows are created by scripts/db-setup.mjs from env vars.
CREATE TABLE IF NOT EXISTS admins (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- ---- Sessions -----------------------------------------------
-- A session cookie is only valid while a matching non-revoked,
-- unexpired row exists here. This makes logout a real revocation
-- rather than just clearing a cookie in the browser.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         UUID PRIMARY KEY,
  admin_id   BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_hash    TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx
  ON admin_sessions (admin_id, expires_at DESC);

-- ---- Enquiries ----------------------------------------------
-- Private business data. Created by the public form, readable
-- only by an authenticated owner session.
CREATE TABLE IF NOT EXISTS enquiries (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  business_name TEXT,
  email         TEXT NOT NULL,
  website       TEXT,
  social        TEXT,
  project_type  TEXT NOT NULL,
  description   TEXT NOT NULL,
  features      TEXT,
  page_count    TEXT,
  budget        TEXT,
  deadline      TEXT,
  branding      TEXT,
  content_state TEXT,
  lead_source   TEXT,
  status        TEXT NOT NULL DEFAULT 'NEW',
  quoted_value  NUMERIC(10, 2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  ip_hash       TEXT,
  CONSTRAINT enquiries_status_check CHECK (status IN (
    'NEW', 'REVIEWING', 'QUOTED', 'NEGOTIATING', 'WON',
    'IN_PROGRESS', 'COMPLETED', 'LOST', 'ARCHIVED'
  ))
);

CREATE INDEX IF NOT EXISTS enquiries_created_idx ON enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_status_idx  ON enquiries (status);

-- ---- Internal notes -----------------------------------------
-- Admin-only. Never rendered on any public page.
CREATE TABLE IF NOT EXISTS enquiry_notes (
  id          BIGSERIAL PRIMARY KEY,
  enquiry_id  BIGINT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enquiry_notes_enquiry_idx
  ON enquiry_notes (enquiry_id, created_at DESC);

-- ---- Projects -----------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  client_name   TEXT,
  enquiry_id    BIGINT REFERENCES enquiries(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'LEAD',
  start_date    DATE,
  deadline      DATE,
  value         NUMERIC(10, 2),
  deposit_paid  BOOLEAN NOT NULL DEFAULT false,
  final_paid    BOOLEAN NOT NULL DEFAULT false,
  repo_url      TEXT,
  live_url      TEXT,
  domain        TEXT,
  hosting       TEXT,
  maintenance   BOOLEAN NOT NULL DEFAULT false,
  folder_ref    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_status_check CHECK (status IN (
    'LEAD', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS', 'CLIENT_REVIEW',
    'READY_TO_LAUNCH', 'COMPLETED', 'MAINTENANCE', 'CANCELLED'
  ))
);

CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);

-- ---- Analytics events ---------------------------------------
-- Anonymous, aggregate-only. No cookies, no identifiers, no IPs.
CREATE TABLE IF NOT EXISTS analytics_events (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  path          TEXT,
  referrer_host TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx
  ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx
  ON analytics_events (name);

-- ---- Audit log ----------------------------------------------
-- Security trail for admin activity. Never exposed publicly.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  detail      TEXT,
  ip_hash     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

-- ---- Rate limiting ------------------------------------------
-- Shared counter store so limits hold across serverless instances.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         BIGSERIAL PRIMARY KEY,
  bucket     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_bucket_idx
  ON rate_limit_hits (bucket, created_at DESC);
