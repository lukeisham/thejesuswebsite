-- Seed data for the five canonical interactive maps.
-- Pins are added later via the admin editor (pins reference evidence rows).

INSERT OR IGNORE INTO maps (map_key, map_name, description, image_path) VALUES
  ('roman-empire', 'Roman Empire', 'The Roman Empire in the first century AD, showing the broader Mediterranean context of the New Testament.', '/assets/images/maps/roman-empire.svg?v=2'),
  ('levant',       'The Levant',  'The Levant region during the first century, covering the areas of ancient Israel, Syria, and surrounding territories.', '/assets/images/maps/levant.svg?v=2'),
  ('judea',        'Judea',       'The region of Judea during the time of Jesus, including key locations like Jerusalem, Bethlehem, and Jericho.', '/assets/images/maps/judea.svg?v=2'),
  ('galilee',      'Galilee',     'The region of Galilee, where Jesus spent most of his ministry, including Capernaum, Nazareth, and the Sea of Galilee.', '/assets/images/maps/galilee.svg?v=2'),
  ('jerusalem',    'Jerusalem',   'A detailed map of Jerusalem at the time of Jesus, showing the Temple Mount, key gates, and surrounding areas.', '/assets/images/maps/jerusalem.svg?v=2');
