# Plan: Fix Dashboard JSON Parsing Bug

## 1. Introduction
**Purpose & End-Goal**: The goal of this task is to fix a bug where creating a new record in the Dashboard results in a frontend crash: `Error: Unexpected token 'F', "Failed to "... is not valid JSON"`. The root cause is the frontend strictly attempting to parse a plain-text error message (starting with "Failed to...") as JSON.

**Vibe-Coding Rules Integration**: 
*   **JS (Strict Interface, Error Translation):** `frontend/private/js/edit_records.js` must be updated to be "smarter" at handling fetch errors. It should correctly translate and catch non-JSON text responses rather than blindly passing them to `.json()`.
*   **Rust (Type Safety, No-Panic):** `app/app_core/src/types/record/record.rs` and the endpoint (`app/app_ui/src/api_records.rs`) must ensure any `RecordError`s triggered by `RecordGatekeeper` (e.g., validations) map safely and predictably.
*   **HTML/CSS (Does the page still function?):** Ensure no functionality is lost during these rewrites and that crucial logic blocks are wrapped in `// START` / `// END` tags.

## 2. Bite-Sized Tasks for GeminiFlash
1.  **Task 2.1: Verify & Locate Frontend JS Logic.** Inspect `frontend/private/js/edit_records.js` (specifically `publishOrUpdate()`) to verify it exists and handles the `POST /api/v1/records/publish` request. If missing, create the necessary fetch logic as per the architecture guidelines.
2.  **Task 2.2: Implement Smarter JS Error Translation.** Refactor the fetch response handling in `edit_records.js`. Check the `Content-Type` headers or use a `try`/`catch` block around `response.json()`. Fallback to `response.text()` if the backend sends a plain text string instead of JSON. Ensure the user sees a UI-friendly error message in the Dashboard.
3.  **Task 2.3: Verify Backend Endpoint.** Inspect `app/app_ui/src/api_records.rs` (specifically `handle_publish_record`) to ensure the route exists and is correctly mapping the `PublishRecordRequest` DTO to `Record::try_new()`.

## 3. Most Difficult Task(s) for Gemini 3.1 Pro (High)
*   **Task 3.1: Diagnosing the Validation Root Cause.** While GeminiFlash improves the JS error interface, Gemini 3.1 Pro must investigate *why* a "Failed to..." error is being triggered in the first place. Based on `RecordGatekeeper` in `record.rs`, potential triggers include: name length > 80, empty description, or invalid PNG "Magic Bytes". Furthermore, recent schema changes (such as the newly added `parent_id`) could be failing `TryFrom` mappings or triggering SQLite schema constraints. 3.1 Pro must trace the struct and DTO relationships to resolve the underlying failure causing the backend to reject the payload.

## 4. Audit Table Check for GeminiFlash

| Task | Verification Steps | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **Verify edit_records.js** | Open `frontend/private/js/edit_records.js` and locate `publishOrUpdate()`. | Function exists and targets `/api/v1/records/publish`. | [x] |
| **Smarter JS Error Handling** | Trigger an invalid record creation in the Dashboard (e.g. empty name) and intercept the network response. | Frontend smoothly catches the plain-text error, does not throw a JSON parsing exception, and alerts the user. | [x] |
| **Verify api_records.rs** | Open `app/app_ui/src/api_records.rs` and locate `handle_publish_record()`. | Endpoint exists and uses `Record::try_new()` for validation. | [x] |
| **Review Gatekeeper Logs** | Intentionally fail a validation (e.g. upload a non-PNG file). | The server returns `RecordError::InvalidImage` and the frontend surfaces it safely in the UI. | [x] |
| **Sticky Comments** | Check `edit_records.js` for vibe-coding comment wrappers. | Crucial logic blocks are surrounded by `// START [FUNCTION_NAME]` and `// END` tags. | [x] |
