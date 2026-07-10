-- Migration 012: Add device (UA) and geo (country) columns to analytics.
-- Also creates the geoip_blocks table for MaxMind GeoLite2 Country CSV imports.

-- Device data (parsed from user-agent header at record time).
ALTER TABLE analytics ADD COLUMN device_type TEXT;
ALTER TABLE analytics ADD COLUMN browser TEXT;
ALTER TABLE analytics ADD COLUMN os TEXT;

-- Country data (resolved from IP hash's source IP at record time).
ALTER TABLE analytics ADD COLUMN country TEXT;

-- GeoIP lookup table — populated by api/scripts/import-geoip.js from the
-- MaxMind GeoLite2 Country CSV (free account required).
-- network_start_ip / network_end_ip are unsigned 32-bit integer representations
-- of IPv4 CIDR ranges (arithmetic conversion, not JS bitwise — avoids overflow).
CREATE TABLE IF NOT EXISTS geoip_blocks (
    network_start_ip INTEGER NOT NULL,
    network_end_ip   INTEGER NOT NULL,
    geoname_id       INTEGER,
    country_iso_code TEXT,
    country_name     TEXT
);

CREATE INDEX IF NOT EXISTS idx_geoip_start ON geoip_blocks (network_start_ip);
