-- Migration 049: Drop the ip_hash column from analytics.
--
-- Need: the column held an unsalted SHA-256 of each visitor's IPv4 address.
-- Such a hash can be reversed by trying every address, so it was a stored IP
-- in practice. No route, model or page reads it. Unique visitors are counted
-- from session_id, and the country comes from the address at request time.
--
-- Fix: drop the column. The stored hashes are erased and cannot be recovered.
-- The route no longer computes the hash. No index, trigger or view uses the
-- column, so DROP COLUMN is allowed.
--
-- ALTER TABLE ... DROP COLUMN has no IF EXISTS in SQLite, so this file is not
-- re-runnable. deploy.sh records it in schema_migrations and runs it once.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/049_drop_analytics_ip_hash.sql

ALTER TABLE analytics DROP COLUMN ip_hash;
