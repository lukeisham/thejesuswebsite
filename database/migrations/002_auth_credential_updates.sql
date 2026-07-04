-- Auth credential management: add last-used tracking and user_handle index.
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/002_auth_credential_updates.sql

ALTER TABLE credentials ADD COLUMN last_used_at TEXT;

CREATE INDEX IF NOT EXISTS idx_credentials_user_handle ON credentials(user_handle);
