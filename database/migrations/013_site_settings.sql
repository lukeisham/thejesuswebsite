-- Migration 013: Add site_settings singleton table.
-- Holds global site-branding values (title, description, default OG image)
-- previously hardcoded across frontend/index.html and page-generator.js.
-- CHECK (id = 1) enforces exactly one row can ever exist.

CREATE TABLE IF NOT EXISTS site_settings (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    title       TEXT NOT NULL DEFAULT 'The Jesus Website',
    description TEXT NOT NULL DEFAULT 'A comprehensive survey of the historical evidence for Jesus the Messiah, presenting about 300 historical data points from the four gospels.',
    og_image    TEXT
);

INSERT OR IGNORE INTO site_settings (id, title, description, og_image)
VALUES (
    1,
    'The Jesus Website',
    'A comprehensive survey of the historical evidence for Jesus the Messiah, presenting about 300 historical data points from the four gospels.',
    'https://thejesuswebsite.org/assets/images/jesus_walking_on_water.jpg'
);
