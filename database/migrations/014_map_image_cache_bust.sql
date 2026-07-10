-- Migration 014: Cache-bust map image URLs (?v=2).
--
-- The five map SVGs were regenerated with real Natural Earth geography
-- (maps-real-geography plan), but nginx serves /assets/ images with
-- `Cache-Control: public, immutable` and a 1-year lifetime, so browsers
-- that ever loaded the old sketch maps keep them indefinitely — a force
-- refresh doesn't help because the image src is set by JS after load.
-- Appending a version query string changes the URL, forcing every client
-- to fetch the regenerated files. Bump ?v= again whenever the SVGs are
-- regenerated (see api/scripts/generate-maps/index.js).
--
-- Usage (applied automatically by deploy.sh):
--   sqlite3 database/thejesuswebsite.db < database/migrations/014_map_image_cache_bust.sql

UPDATE maps SET image_path = '/assets/images/maps/roman-empire.svg?v=2' WHERE map_key = 'roman-empire';
UPDATE maps SET image_path = '/assets/images/maps/levant.svg?v=2'       WHERE map_key = 'levant';
UPDATE maps SET image_path = '/assets/images/maps/judea.svg?v=2'        WHERE map_key = 'judea';
UPDATE maps SET image_path = '/assets/images/maps/galilee.svg?v=2'      WHERE map_key = 'galilee';
UPDATE maps SET image_path = '/assets/images/maps/jerusalem.svg?v=2'    WHERE map_key = 'jerusalem';
