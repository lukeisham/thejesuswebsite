-- Migration 036: Site-wide holding pen for resources.
-- A flag column rather than a nullable list_key (which would require a SQLite
-- table rebuild). Parked items keep their last list_key so a pen chip can
-- show where the item came from — nothing may treat list_key alone as proof
-- of membership; every list query must also test in_holding_pen = 0.

ALTER TABLE resources ADD COLUMN in_holding_pen INTEGER NOT NULL DEFAULT 0 CHECK (in_holding_pen IN (0,1));

CREATE INDEX IF NOT EXISTS idx_resources_holding_pen ON resources (in_holding_pen);
