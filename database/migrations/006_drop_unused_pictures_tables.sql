-- Migration 006: Drop unused picture child tables.
-- All five frontend detail renderers parse [figure ...] shortcodes from body
-- text; no reader queries evidence_pictures, response_pictures, essay_pictures,
-- blog_pictures, or historiography_pictures. The tables are dead code and
-- duplicate the figure-shortcode image mechanism already in use.
-- Indexes drop automatically with the tables.

DROP TABLE IF EXISTS evidence_pictures;
DROP TABLE IF EXISTS response_pictures;
DROP TABLE IF EXISTS essay_pictures;
DROP TABLE IF EXISTS blog_pictures;
DROP TABLE IF EXISTS historiography_pictures;
