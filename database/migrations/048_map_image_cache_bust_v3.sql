-- Migration 048: Cache-bust four map image URLs (?v=3).
--
-- The roman-empire, levant, judea and galilee SVGs were regenerated. Their
-- roads, region boundaries and Lake Huleh are now projected from longitude
-- and latitude (api/scripts/generate-maps/geo-overlay.js) instead of drawn in
-- pixels. nginx serves /assets/ images with `Cache-Control: public, immutable`,
-- so a browser keeps the old file until the URL changes. The jerusalem SVG did
-- not change, so its URL stays as it is.
--
-- Usage (applied automatically by deploy.sh):
--   sqlite3 database/thejesuswebsite.db < database/migrations/048_map_image_cache_bust_v3.sql

UPDATE maps SET image_path = '/assets/images/maps/roman-empire.svg?v=3' WHERE map_key = 'roman-empire';
UPDATE maps SET image_path = '/assets/images/maps/levant.svg?v=3'       WHERE map_key = 'levant';
UPDATE maps SET image_path = '/assets/images/maps/judea.svg?v=3'        WHERE map_key = 'judea';
UPDATE maps SET image_path = '/assets/images/maps/galilee.svg?v=3'      WHERE map_key = 'galilee';
