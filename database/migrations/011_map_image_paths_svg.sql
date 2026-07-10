-- Migration 011: Update map image_path references from .webp to .svg.
--
-- The canonical map images are now generated as SVG assets stored under
-- frontend/assets/images/maps/. This migration flips the five seeded
-- map rows to reference the new SVG paths.
--
-- Run with:
--   sqlite3 database/thejesuswebsite.db < database/migrations/011_map_image_paths_svg.sql

UPDATE maps SET image_path = '/assets/images/maps/roman-empire.svg' WHERE map_key = 'roman-empire';
UPDATE maps SET image_path = '/assets/images/maps/levant.svg'       WHERE map_key = 'levant';
UPDATE maps SET image_path = '/assets/images/maps/judea.svg'        WHERE map_key = 'judea';
UPDATE maps SET image_path = '/assets/images/maps/galilee.svg'      WHERE map_key = 'galilee';
UPDATE maps SET image_path = '/assets/images/maps/jerusalem.svg'    WHERE map_key = 'jerusalem';
