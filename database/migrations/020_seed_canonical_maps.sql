-- Migration 020: Seed the five canonical maps + bump jerusalem to ?v=6.
--
-- Two things, both idempotent:
--
-- 1. Seed the canonical map rows. database/seed.sql inserts these five
--    rows, but nothing in the deploy pipeline ever runs seed.sql, so a
--    database created from schema.sql alone has an empty maps table —
--    the admin editor and public maps pages then correctly render their
--    "No maps available" empty states, which presents as "maps not
--    showing up". INSERT OR IGNORE keys off the maps.map_key UNIQUE
--    constraint, so databases that already have the rows are untouched
--    (their admin-edited names/descriptions are preserved).
--
-- 2. Bump the jerusalem image to ?v=6. The jerusalem SVG was replaced
--    with the hand-drawn AD 30 plan (parchment background, dashed wall
--    circuits, Kidron/Hinnom watercourses). Bumping the version query
--    string forces every client past the nginx
--    `Cache-Control: public, immutable` policy to fetch the new artwork.
--
-- Usage (applied automatically by deploy.sh):
--   sqlite3 database/thejesuswebsite.db < database/migrations/020_seed_canonical_maps.sql

INSERT OR IGNORE INTO maps (map_key, map_name, description, image_path) VALUES
  ('roman-empire', 'Roman Empire', 'The Roman Empire in the first century AD, showing the broader Mediterranean context of the New Testament.', '/assets/images/maps/roman-empire.svg?v=2'),
  ('levant',       'The Levant',  'The Levant region during the first century, covering the areas of ancient Israel, Syria, and surrounding territories.', '/assets/images/maps/levant.svg?v=2'),
  ('judea',        'Judea',       'The region of Judea during the time of Jesus, including key locations like Jerusalem, Bethlehem, and Jericho.', '/assets/images/maps/judea.svg?v=2'),
  ('galilee',      'Galilee',     'The region of Galilee, where Jesus spent most of his ministry, including Capernaum, Nazareth, and the Sea of Galilee.', '/assets/images/maps/galilee.svg?v=2'),
  ('jerusalem',    'Jerusalem',   'A first-century plan of Jerusalem showing the Temple Mount, First and Second Walls, Kidron and Hinnom Valleys, Mount of Olives, and the districts of the Upper City, Lower City, and City of David.', '/assets/images/maps/jerusalem.svg?v=6');

UPDATE maps SET image_path = '/assets/images/maps/jerusalem.svg?v=6' WHERE map_key = 'jerusalem';
