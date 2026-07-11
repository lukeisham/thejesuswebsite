-- Migration 018: Bump jerusalem map image to ?v=4.
--
-- The jerusalem SVG was regenerated with a reframed bbox that centres
-- the walled Old City as the central third of the viewBox, leaving room
-- for the Mount of Olives, Gethsemane, Bethphage, Golgotha, and the
-- Kidron Valley.  A Bethany off-map indicator (arrow + distance label)
-- was added at the eastern edge.
--
-- New bbox: lon 35.216–35.248, lat 31.7625–31.7895
-- (Δlon = Δlat / cos 31.78° for square ground distances on the
--  1000×1000 viewBox).
--
-- Bumping the version query string forces every client past the nginx
-- `Cache-Control: public, immutable` policy to fetch the new artwork.
--
-- Usage (applied automatically by deploy.sh):
--   sqlite3 database/thejesuswebsite.db < database/migrations/018_jerusalem_map_v4.sql

UPDATE maps SET image_path = '/assets/images/maps/jerusalem.svg?v=4' WHERE map_key = 'jerusalem';
