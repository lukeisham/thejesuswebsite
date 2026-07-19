-- Drop the about_pages table and its updated_at trigger. The about-page
-- admin/backend feature (api/routes/about.js, api/models/about.model.js)
-- has been removed — it had a full draft-workflow CRUD API but no admin UI
-- and no consumers (Issue #70). frontend/about.html remains as a static page.

DROP TRIGGER IF EXISTS about_pages_updated_at;
DROP TABLE IF EXISTS about_pages;
