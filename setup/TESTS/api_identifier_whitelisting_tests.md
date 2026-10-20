## Validation: SQL Identifier Whitelisting

**Plan:** sql-identifier-whitelisting.md  
**Date:** 2026-07-19

### Manual checks

- [ ] Run `npm test` and verify all existing tests still pass (no regression).
- [ ] Run the new/updated identifier-whitelisting tests; verify every whitelist-validation test passes.
- [ ] Grep the codebase to confirm all call sites of the four helpers pass only hardcoded string literals (e.g., `getLinked("evidence_mla_sources", "evidence_id", ...)` not computed/variable names).
- [ ] Manually invoke each helper with a valid identifier and an invalid identifier; confirm valid cases work and invalid cases throw an Error with a clear message.

### Code-review checks

- [ ] **SQL-4** — Verify each whitelist is derived from actual call sites and the database schema; no caller is missed.
- [ ] **SQL-4** — Verify error messages clearly indicate which identifier type failed and which whitelist it violated (e.g., "Unknown junction table: bad_name").
- [ ] **JS-2** — Verify validation happens early in each function, before any database operation; no silent failures.
- [ ] **SR-1** — Verify each modified file is single-purpose (one module per file).
- [ ] **JS-1** — Verify whitelist Sets/arrays and validation logic are self-documenting (clear variable names, no cryptic comments needed).
- [ ] **SQL-1** — Verify all SQL statements still use `db.prepare()` and bound parameters; no interpolation introduced by the whitelisting changes.
