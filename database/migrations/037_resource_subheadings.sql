-- Migration 037: Subheadings for resources.
-- A flag column (item_type) rather than a separate table — a subheading is a
-- row in the same list, sorts with sort_order, and drags with everything
-- else. Public rendering restarts item numbering under each subheading;
-- subheadings themselves are never numbered.

ALTER TABLE resources ADD COLUMN item_type TEXT NOT NULL DEFAULT 'item' CHECK (item_type IN ('item','subheading'));
