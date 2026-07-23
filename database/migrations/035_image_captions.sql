-- Migration 035: Add captions for dedicated in-page images.
-- evidence.image_caption separates the visible caption from image_alt
-- (alt describes the image for someone who can't see it; caption adds
-- context or attribution for everyone — these were previously conflated).
-- challenges.challenge_picture_alt / challenge_picture_caption give the
-- long-write-only challenge_picture column an alt and a caption at all.

ALTER TABLE evidence ADD COLUMN image_caption TEXT;
ALTER TABLE challenges ADD COLUMN challenge_picture_alt TEXT;
ALTER TABLE challenges ADD COLUMN challenge_picture_caption TEXT;
