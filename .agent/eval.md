# Sitemap Synchronization Evaluation (`eval.md`)
# Version: 1.1.0

This document provides the evaluation protocol for the `sync_sitemap` skill. When an agent or developer triggers the synchronization process, they must verify the following:

## 1. Version Increment Check
- **Action:** Read the YAML frontmatter of `documentation/site_map.md`.
- **Criteria:** The `version:` field must be strictly greater than it was prior to execution (e.g., `1.0.0` -> `1.0.1`).

## 2. Tree Merger Integrity
- **Action:** Open `documentation/site_map.md`.
- **Criteria:** 
  - There should be exactly **one** comprehensive `'```text'` block containing the entire filesystem tree.
  - The tree must start at the root index `/` or top-level directories (`backend/`, `frontend/`, etc.).
  - There should be no internal markdown headings (e.g., `### 1. Backend`) interrupting the ASCII hierarchy.

## 3. Completeness Verification
- **Action:** Cross-reference any newly added files in `documentation/module_sitemap.md` (such as test suites or new configuration files) against the new tree in `site_map.md`.
- **Criteria:** The new files must be accurately parsed and appear in their correct hierarchical location inside `site_map.md`.

*If all criteria are met, the skill execution is deemed successful.*
