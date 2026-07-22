-- Migration 034: Add thumbnail_path to evidence.
-- Populated server-side by the upload route when Sharp successfully resizes
-- an uploaded image to an 80px-wide thumbnail (see api/routes/uploads.js).
-- Nullable: existing records and any upload where thumbnail generation fails
-- render the dashed placeholder instead.

ALTER TABLE evidence ADD COLUMN thumbnail_path TEXT;
