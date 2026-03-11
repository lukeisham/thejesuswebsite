# System Architecture Review Plan (GeminiFlash Implementation)

**Goal**: Audit the `system_data_architecture.html` for technical accuracy, optimize its visual diagrams, and verify the backend-to-frontend pipeline on the live VPS.

---

## 🛠 Pre-requisites
- [ ] SSH access to the VPS.
- [ ] Write access to `app/app_ui/src/api_system.rs`.
- [ ] Knowledge of SQLite table schemas for the 10 categories.

## ✅ Success Criteria
- [ ] No technical discrepancies between `api_system.rs` and the glossary documentation.
- [ ] ASCII diagrams accurately reflect the `Arc<AppState>` locking and serialization process.
- [ ] live `/api/v1/system/feed` confirmed working on VPS via `curl`.
- [ ] Dashboard "System Data" button verified in a live browser.

---

## 📦 Batched Tasks

### Batch 0: pre-loading

[x] Read app/app_ui/src/api_system.rs and save all struct definitions to its temporary memory.
[x] Read system_data_architecture.html and extract all headers.

### Batch 1: Technical Audit & Gap Analysis
*Focus: Ensure the documentation matches the ground-truth code.*
- [x] **Task 1.1: Code-to-Doc Audit** - Generate a Markdown table with three columns: Struct Field Name (Rust), Documentation Name (HTML), and Status (Match/Mismatch).
- [x] **Task 1.2: Meta-data Injection** - Check if the feed response includes (or should include) row counts or "last updated" timestamps for each category.
- [x] **Task 1.3: Capability Analysis** - Identify if any data category (e.g., `work_queue`) lacks a "clear" or "retry" API endpoint that should be added/documented.

### Batch 2: Visual & Process Clarity (ASCII Art)
*Focus: Make the diagrams high-resolution (architecturally speaking).*
- [x] **Task 2.1: Flow Detail** - Update "System Feed Data Flow" to show the `Arc` locking and `serde_json` serialization steps.
- [x] **Task 2.2: ID Mapping** - Update the "10 Categories" diagram to show the primary key / identifier for each table (e.g., `contact_id`, `trace_id`).
- [x] **Task 2.3: Integration** - Update `frontend/private/system_data_architecture.html` with refined diagrams and verify CSS alignment.
Use this as a structural reference = [Database] --(SQL)--> [Arc<AppState>] --(Serde)--> [JSON Response]

### Batch 3: Live Verification (Deployment)
*Focus: Confirm the pipeline is "hot" and working.*
- [x] **Task 3.1: Commit & Push** - Prompt user: `git add .`, `git commit -m "doc audit & diagram update"`, `git push` by generating a single-block shell script containing the git and curl commands so the user can copy-paste it once."
- [ ] **Task 3.2: VPS "Direct" Check** - Provide instructions for SSH + `curl http://localhost:8080/api/v1/system/feed`.
- [ ] **Task 3.3: Dashboard UI Check** - Ask user to click "System Data" and check for console errors (404/500).

### Batch 4: Troubleshooting Playbook (The "Guesses")
*Focus: Rapid response if "Batch 3" fails.*
- [ ] **Hypothesis 1: SQLite Lock** - Check logs for "database is locked". **Action:** `tail -n 100 /var/log/thejesuswebsite.log | grep -i error`. = IF database is locked	THEN Run fuser to find the process holding the lock.
- [ ] **Hypothesis 2: DB Path Error** - Check `.env` on VPS for `DATABASE_URL` accuracy. **Action:** `ls -l [path_from_env]` = IF 401 Unauthorized THEN Verify JWT_SECRET in .env matches the VPS environment.
- [ ] **Hypothesis 3: Auth/CORS** - Check if the `/private/` route is stripping cookies. **Action:** Check browser network tab for `401 Unauthorized`= IF Connection Refused	THEN Check if rocket or actix is actually running on port 8080.

### Batch 5: Summary & Knowledge Update
*Focus: Close the loop.*
- [ ] **Task 5.1: Synthesis** - Report on any "hidden" dependencies found during the audit.
- [ ] **Task 5.2: Walkthrough** - Update the project's primary `walkthrough.md` with the verified system data flow.
