-- Migration 051: Store the picture size and a 720 px display copy for evidence.
--
-- Need: the evidence page guesses the primary picture as 720 x 480, so a picture
-- of another shape moves the text when it loads, and every visitor downloads the
-- 1440 px file. Storing the true size lets the page reserve the right box, and the
-- display copy lets small screens load a smaller file.
--
-- Fix: three nullable columns on evidence. A row without them keeps today's
-- behaviour. The backfill script (api/scripts/backfill-evidence-images.js) fills
-- them for existing rows.
--
-- Run: applied by deploy.sh with the other migrations.

ALTER TABLE evidence ADD COLUMN image_width INTEGER;
ALTER TABLE evidence ADD COLUMN image_height INTEGER;
ALTER TABLE evidence ADD COLUMN image_display_path TEXT;
