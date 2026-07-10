-- Migration 015: Bump jerusalem map image to ?v=3.
--
-- The jerusalem SVG was regenerated with a first-century plan traced from
-- the Britannica 1911 "Plan of Jerusalem" (public domain) and OpenBible.info
-- topography (CC BY 4.0).  All structures are now drawn in projected bbox
-- coordinates so geo-anchored pins land correctly.
--
-- Bumping the version query string forces every client past the nginx
-- `Cache-Control: public, immutable` policy to fetch the new artwork.
-- (See api/scripts/generate-maps/index.js for the generator pipeline.)
--
-- Usage (applied automatically by deploy.sh):
--   sqlite3 database/thejesuswebsite.db < database/migrations/015_jerusalem_map_v3.sql

UPDATE maps SET image_path = '/assets/images/maps/jerusalem.svg?v=3' WHERE map_key = 'jerusalem';
