-- Migration 039: Republish Wikipedia articles after an accidental delete-all.
--
-- The admin "Delete All Articles" button was used on wikipedia_articles
-- (removing all 255 scored/published rows), then wiki-bulk-paste.txt was
-- re-uploaded via the admin Bulk Upload form. That form only creates rows
-- from title/url/rank — no signal scores — and defaults published_draft to 0
-- unless "Publish all" is ticked (it wasn't), so all 255 replacement rows
-- landed as unpublished drafts. GET /api/wikipedia filters to
-- published_draft = 1, so the public /debate/wikipedia page had nothing to
-- show. This is a one-time reconciliation to republish them; the next
-- deploy's Wikipedia scoring import (--publish --purge-missing) matches
-- these rows by URL and backfills their real signal contributions.
UPDATE wikipedia_articles
SET published_draft = 1;
