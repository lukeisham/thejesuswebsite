-- Migration 016: Add lat/lng columns to map_pins for geographic anchor support.
--
-- Pins can now be placed by real-world coordinates rather than eyeballed
-- image percentages.  When lat/lng are supplied, the API derives x/y via
-- the shared equirectangular projection in api/lib/map-geo.js.
--
-- Columns are nullable so legacy percentage-only pins stay valid.
-- A re-anchor script (api/scripts/reanchor-pins.js) lets admins
-- recompute x/y from lat/lng after any base-map regeneration.
--
-- Usage (applied automatically by deploy.sh):
--   sqlite3 database/thejesuswebsite.db < database/migrations/016_map_pins_latlng.sql

ALTER TABLE map_pins ADD COLUMN lat REAL;
ALTER TABLE map_pins ADD COLUMN lng REAL;
