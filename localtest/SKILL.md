---
name: local_site_test
description: Orchestrates opening, testing, and troubleshooting a local instance of The Jesus Website on port 8000.
version: 1.0
---

# Skill: Local Site Testing & Troubleshooting

This skill provides a structured workflow for launching the unified test server (`serve_all.py`) and verifying its integrity.

## 1. Prerequisites Check
Before launching, ensure the environment is ready:
- **Port 8000**: Must be free. Check with `lsof -i :8000`.
- **Virtual Environment**: Should be active. Check for `venv/` directory.
- **Dependencies**: `pip3 install -r requirements.txt` if not already satisfied.

## 2. Launching the Server
Execute the unified server script from the project root:
```bash
python3 serve_all.py
```
Wait for the message: `Starting Unified Test Server on http://localhost:8000`.

## 3. Verification Workflow
1. **Infrastructure Ping**: Run `python3 localtest/scripts/troubleshoot.py` to check if the FastAPI backend and static mounts are accessible.
2. **Visual Spot Check**: Navigate to `http://localhost:8000/index.html`.
3. **Admin Check**: Navigate to `http://localhost:8000/admin/frontend/admin.html`.

## 4. Troubleshooting Steps
If the website does not load properly, follow these actions:

### A. Port Conflict
If `serve_all.py` errors with "Address already in use":
- **Action**: Run `lsof -i :8000`.
- **Action**: Kill the process using `kill -9 <PID>`.

### B. Missing Database
If the site loads but shows "Database not found" errors:
- **Action**: Verify `database/thejesuswebsite.db` exists.
- **Action**: Run the database setup script in `frontend/core/setup_db.js`.

### C. Logic/Routing Errors
Check the `logs/` directory for tracebacks:
- **Action**: `tail -f logs/admin_api.log`.
- **Action**: Run `python3 localtest/scripts/troubleshoot.py --deep` to verify individual API endpoints.

## 5. User Feedback Prompts
If the agent is stuck or needs manual intervention:
- "Please confirm if Port 8000 is occupied by another non-Jesus-Website process."
- "I detected a 404 on the Admin static mount. Should I verify the directory structure of /admin/frontend/?"
- "The server is running but the browser cannot connect. Is there a local firewall or proxy active?"
