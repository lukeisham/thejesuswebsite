-- Migration 043: Drop the dead evidence_resource_lists junction table.
--
-- The evidence_resource_lists table and its four model-level operators
-- (addToEvidence, removeFromEvidence, getResourcesForEvidence,
-- reorderEvidenceResources) were defined but never wired to any route,
-- admin page, or frontend feature. A comprehensive grep across api/routes/,
-- admin/, frontend/, and mcp-server/ confirmed zero live consumers.
-- The table has always been empty (verified: SELECT COUNT(*) = 0 on the
-- production VPS). Dropping it removes orphaned schema and dead code.
-- Safe to run on fresh databases (IF EXISTS handles the new-schema case).
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/043_drop_evidence_resource_lists.sql

DROP INDEX IF EXISTS idx_evidence_resource_lists;
DROP TABLE IF EXISTS evidence_resource_lists;
