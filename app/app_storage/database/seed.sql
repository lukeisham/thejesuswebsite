-- Seed initial users for The Jesus Website
-- Emails should be updated to actual values by the user.

INSERT OR IGNORE INTO users (id, email, role) 
VALUES ('01J1ARV6X7NEX5V7NEMNTAXXXX', 'luke.isham@gmail.com', 'Admin');

INSERT OR IGNORE INTO users (id, email, role) 
VALUES ('01J1ARV6X7NEX5V7NEMNTAYYYY', 'contributor@example.com', 'Contributor');

-- Seed Root Point for Ardor Tree
-- ID: 01J1ARV6X7NEX5V7NEMNTAZZZZ (God)
INSERT OR IGNORE INTO records (id, parent_id, name, category, era, latitude, longitude, primary_verse)
VALUES ('01J1ARV6X7NEX5V7NEMNTAZZZZ', NULL, 'God', 'Theme', 'PreIncarnation', 0.0, 0.0, 'John 1:1');

-- Source link for John 1:1
INSERT OR IGNORE INTO bible_verses (id, book, chapter, verse)
VALUES (1, 'John', 1, 1);

-- Seed Second Point for Ardor Tree (Child of God/John 1:1)
-- ID: 01H1ARV6X7NEX5V7NEMNTAAAAA
INSERT OR IGNORE INTO records (id, parent_id, name, category, era, latitude, longitude, primary_verse)
VALUES ('01H1ARV6X7NEX5V7NEMNTAAAAA', '01J1ARV6X7NEX5V7NEMNTAZZZZ', 'Suffering Servant', 'Theme', 'Prophetic', 0.0, 0.0, 'Isaiah 53:3');

-- Source link for Isaiah 53:3
INSERT OR IGNORE INTO bible_verses (id, book, chapter, verse)
VALUES (2, 'Isaiah', 53, 3);
