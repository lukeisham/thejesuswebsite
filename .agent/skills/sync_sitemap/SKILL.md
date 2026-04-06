---
name: sync_sitemap
version: 1.1.0
description: Synchronizes the master site_map.md with any structural changes made to module_sitemap.md.
---

# Skill: sync_sitemap

## 1. Triggers

`EXECUTE_IF`:
  - `User_Command` == `"/sync_sitemap"`
  - OR `User_Intent` CONTAINS "update sitemap"
  - OR `File_Modified("documentation/module_sitemap.md")` == `True`

## 2. Execution Logic

### Step 1: Execute Synchronization Script
- **Action**: Run Python executable.
- **Command**: `python .agent/scripts/sync_sitemap.py`
- **Internal Script Operations**:
  1. Parse `module_sitemap.md` for `**Files to create Structure:**` blocks.
  2. Map individual file fragments into a unified path dictionary.
  3. Extract and increment the semantic `version` string in `site_map.md` frontmatter.
  4. Render the unified path dictionary into a single, heading-less ASCII tree.
  5. Overwrite the corresponding target block within `site_map.md`.

### Step 2: Verification Protocol
- **Condition**: Script `Exit_Code` == `0`.
- **Action**: Load evaluation criteria.
- **Source**: `.agent/eval.md`
- **Validation Rules**:
  - `ASSERT( Version(site_map.md) > Version_Previous(site_map.md) )`
  - `ASSERT( Block_Count(ASCII_Trees, site_map.md) == 1 )`
  - `ASSERT( Verification(All_Files_Present) == True )`

## 3. Terminal States & Outputs

`IF` Evaluation == `PASS`:
  - **State**: `SYNC_SUCCESS`
  - **Action**: Provide user with confirmation message including the newly generated `version` number.

`IF` Evaluation == `FAIL`:
  - **State**: `SYNC_ERROR`
  - **Action**: Read script trace/logs, report the specific failure criteria to the user, and await manual debugging instructions.
