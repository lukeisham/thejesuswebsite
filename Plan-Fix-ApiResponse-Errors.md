# Plan: Fix ApiResponse Errors

## 1. Introduction
**Purpose & End-Goal**: The goal of this task is to resolve the compiler errors (`use of undeclared type ApiResponse`) outputted by `cargo check` in the `app_ui` crate. These errors were introduced when the frontend/backend JSON bug was fixed, as the `ApiResponse` wrapper was implemented without importing its definition into several API modules. The end-goal is a clean `cargo check` run.

**Vibe-Coding Rules Integration**: 
*   **Rust (Type Safety, No-Panic):** Ensure that the correct type (`app_core::types::ApiResponse`) is explicitly imported into the file scope, maintaining the strict type safety requirements.
*   **Rust (Don't drop code during rewrites!):** We will only insert the missing `use` statement at the very top of the files (before user comments). No existing logic or handlers will be altered or dropped.

## 2. Bite-Sized Tasks for GeminiFlash
1.  **Task 2.1: Fix `api_blog.rs` and `api_news.rs`**: Add `use app_core::types::ApiResponse;` to the very top of these files, before any comments.
2.  **Task 2.2: Fix `api_tools.rs` and `api_users.rs`**: Add `use app_core::types::ApiResponse;` to the very top of these files, before any comments.

## 3. Most Difficult Task(s) for Gemini 3.1 Pro (High)
*   **Task 3.1: Final Validation and Compilation Audit**: Run `cargo check` directly in the current working tree to verify that resolving the `ApiResponse` imports eliminates the `E0433` errors without surfacing any downstream type mismatch errors. Ensure all endpoints correctly compile. 

## 4. Audit Table Check for GeminiFlash

| Task | Verification Steps | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **Fix api_blog.rs** | Open `app/app_ui/src/api_blog.rs` and verify the import block. | `use app_core::types::ApiResponse;` is present at the very top of the file. | [x] |
| **Fix api_news.rs** | Open `app/app_ui/src/api_news.rs` and verify the import block. | `use app_core::types::ApiResponse;` is present at the very top of the file. | [x] |
| **Fix api_tools.rs** | Open `app/app_ui/src/api_tools.rs` and verify the import block. | `use app_core::types::ApiResponse;` is present at the very top of the file. | [x] |
| **Fix api_users.rs** | Open `app/app_ui/src/api_users.rs` and verify the import block. | `use app_core::types::ApiResponse;` is present at the very top of the file. | [x] |
| **Verify Compilation** | Run `cargo check` in the workspace root. | The check completes successfully safely resolving all prior `E0433` errors. | [ ] |
