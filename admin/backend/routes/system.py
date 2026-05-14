# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: SYSTEM
#   File:    admin/backend/routes/system.py
#   Version: 1.0.0
#   Purpose: System config, health checks, MCP proxy, test runner, service
#            restart, and placeholder endpoints.
# =============================================================================

import os
import subprocess
import sys
import threading
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from .shared import get_db_connection, logger, verify_token

router = APIRouter()


# -----------------------------------------------------------------------------
# System Config
# -----------------------------------------------------------------------------
@router.get("/api/admin/system/config")
async def get_system_config(admin_data: dict = Depends(verify_token)):
    """
    Returns all rows from system_config as a JSON object of key/value pairs.
    Consumed by plan_dashboard_system and plan_dashboard_news_sources.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_config ORDER BY key")
        rows = cursor.fetchall()
        conn.close()

        # Build a flat key/value dict
        config = {row["key"]: row["value"] for row in rows}
        return config
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch system config: " + str(e)
        )


@router.put("/api/admin/system/config")
async def update_system_config(
    body: Dict[str, Any], admin_data: dict = Depends(verify_token)
):
    """
    Upserts system_config key/value pairs.
    Accepts a JSON body of key/value pairs. Each key is upserted individually.
    Returns 200 on success.
    """
    if not body:
        raise HTTPException(status_code=400, detail="Request body must not be empty.")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()

        for key, value in body.items():
            key_str = str(key)
            value_str = str(value) if value is not None else None
            cursor.execute(
                """
                INSERT INTO system_config (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                """,
                (key_str, value_str, now),
            )

        conn.commit()
        conn.close()
        return {
            "message": "System config updated successfully",
            "keys": list(body.keys()),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to update system config: " + str(e),
        )


# -----------------------------------------------------------------------------
# Health Checks
# -----------------------------------------------------------------------------
@router.get("/api/admin/health_check")
async def health_check_admin(admin_data: dict = Depends(verify_token)):
    """
    Returns system health including DeepSeek API status, VPS CPU/memory,
    database status, and uptime. Consumed by plan_dashboard_system.
    """
    import time as time_module

    health: Dict[str, Any] = {
        "status": "ok",
        "service": "The Jesus Website Admin API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # --- Database check ---
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM records")
        record_count = cursor.fetchone()["count"]
        conn.close()
        health["database"] = {"status": "connected", "record_count": record_count}
    except Exception as e:
        health["database"] = {"status": "error", "error": str(e)}
        health["status"] = "degraded"

    # --- DeepSeek API check ---
    deepseek_key = os.getenv("DEEPSEEK_KEY", "")
    if deepseek_key:
        health["deepseek_api"] = {"status": "configured"}
    else:
        health["status"] = "degraded"  # mark overall health as degraded
        health["deepseek_api"] = {
            "status": "unavailable",
            "error": "DEEPSEEK_KEY not set in .env",
        }

    # --- VPS resource usage (best-effort, available on Linux/macOS) ---
    try:
        import psutil

        cpu_percent = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        health["resources"] = {
            "cpu_percent": cpu_percent,
            "memory": {
                "total_gb": round(mem.total / (1024**3), 1),
                "used_gb": round(mem.used / (1024**3), 1),
                "percent": mem.percent,
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 1),
                "used_gb": round(disk.used / (1024**3), 1),
                "percent": disk.percent,
            },
            "uptime_seconds": time_module.time() - psutil.boot_time(),
        }
    except ImportError:
        health["resources"] = {
            "status": "unavailable",
            "error": "psutil not installed — install with: pip install psutil",
        }
    except Exception as e:
        health["resources"] = {"status": "error", "error": str(e)}

    # --- ESV API check ---
    esv_key = os.getenv("ESV_KEY", "")
    if esv_key:
        health["esv_api"] = {"status": "configured"}
    else:
        health["esv_api"] = {
            "status": "unavailable",
            "error": "ESV_KEY not set in .env",
        }

    # --- Security audit ---
    from admin.backend.auth_utils import login_attempts
    from backend.middleware.rate_limiter import request_counts as rate_requests

    now_ts = time_module.time()

    # Failed login attempts
    failed_logins = 0
    locked_ips = 0
    top_offenders = []
    for ip, record in login_attempts.items():
        count = record.get("count", 0)
        locked_until = record.get("lockout_until", 0)
        if locked_until > now_ts:
            locked_ips += 1
            top_offenders.append(
                {
                    "ip": ip,
                    "attempts": count,
                    "locked_remaining_s": round(locked_until - now_ts),
                }
            )
        elif count > 0:
            failed_logins += count

    # Rate limiter stats
    rate_limited_ips = 0
    total_tracked_ips = len(rate_requests)
    now_limit = time_module.time()
    for ip, (count, first_ts) in rate_requests.items():
        if count >= 30 and (now_limit - first_ts) < 60:
            rate_limited_ips += 1

    # Admin's own JWT expiry
    jwt_exp = admin_data.get("exp", 0)
    jwt_remaining_s = max(0, jwt_exp - int(now_ts))
    jwt_status = (
        "active"
        if jwt_remaining_s > 3600
        else "expiring"
        if jwt_remaining_s > 0
        else "expired"
    )

    health["security"] = {
        "session": {
            "status": jwt_status,
            "expires_in_s": jwt_remaining_s,
        },
        "authentication": {
            "failed_login_attempts": failed_logins,
            "locked_ips": locked_ips,
            "top_offenders": top_offenders[:5],
        },
        "rate_limiter": {
            "tracked_ips": total_tracked_ips,
            "currently_throttled": rate_limited_ips,
        },
        "api_keys": {
            "deepseek": bool(os.getenv("DEEPSEEK_KEY", "")),
            "esv": bool(os.getenv("ESV_KEY", "")),
        },
    }

    return health


@router.get("/api/admin/mcp/health")
async def mcp_health(admin_data: dict = Depends(verify_token)):
    """
    Proxies MCP server status (online/offline/degraded, tool count, error count,
    last request timestamp). Consumed by plan_dashboard_system.

    The MCP server is expected to run on a local port (e.g. 8001) or be
    configured via MCP_SERVER_URL in .env. If unreachable, returns degraded status.
    """
    mcp_url = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8001/health")

    try:
        import requests as req

        resp = req.get(mcp_url, timeout=5)
        if resp.status_code == 200:
            mcp_data = resp.json()
            return {
                "status": "online",
                "mcp": mcp_data,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
        else:
            return {
                "status": "degraded",
                "mcp": {"http_status": resp.status_code},
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        return {
            "status": "offline",
            "mcp": {"error": str(e)},
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }


# -----------------------------------------------------------------------------
# Test Suite Runner
# -----------------------------------------------------------------------------
@router.post("/api/admin/tests/run")
async def run_test_suite(
    suite: str = Query("all"),
    admin_data: dict = Depends(verify_token),
):
    """
    Spawns test suites as subprocesses and returns their output.

    Query params:
        suite — 'all' (default), 'api', 'agent', or 'port'

    Suite-to-script mapping:
        all   → port_test.py + security_audit.py + agent_readability_test.py
        api   → port_test.py + security_audit.py
        agent → agent_readability_test.py
        port  → port_test.py

    Returns { status, results: [{ name, passed, message }], summary }.
    Consumed by test_execution_logic.js in the System dashboard.
    """
    valid_suites = {"all", "api", "agent", "port"}
    if suite not in valid_suites:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid suite. Must be one of: {', '.join(sorted(valid_suites))}.",
        )

    # Determine which test scripts to run
    tests_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests")
    script_map = {
        "port_test.py": "Port Availability",
        "security_audit.py": "Security Baseline Audit",
        "agent_readability_test.py": "Agent Readability",
    }

    scripts_to_run = []
    if suite in ("all", "api", "port"):
        scripts_to_run.append("port_test.py")
    if suite in ("all", "api"):
        scripts_to_run.append("security_audit.py")
    if suite in ("all", "agent"):
        scripts_to_run.append("agent_readability_test.py")

    results = []
    passed_count = 0
    total_count = len(scripts_to_run)

    for script in scripts_to_run:
        script_path = os.path.join(tests_dir, script)
        script_label = script_map.get(script, script)

        if not os.path.exists(script_path):
            results.append(
                {
                    "name": script_label,
                    "passed": False,
                    "message": f"Test script not found: {script_path}",
                }
            )
            continue

        try:
            proc = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.join(os.path.dirname(__file__), "..", "..", ".."),
            )
            passed = proc.returncode == 0
            if passed:
                passed_count += 1

            # Separate output lines by result type for a clear structured message
            output_lines = [
                line.strip()
                for line in (proc.stdout + proc.stderr).splitlines()
                if line.strip()
            ]
            passes = []
            failures = []
            for line in output_lines:
                upper = line.upper()
                if any(kw in upper for kw in ("FAILURE", "ERROR", "FAIL")):
                    failures.append(line)
                elif any(kw in upper for kw in ("SUCCESS", "PASSED", "STABLE")):
                    passes.append(line)

            # Build a readable message — failures first so they're noticed
            parts = []
            if failures:
                parts.append("FAILURES:")
                parts.extend("  " + f for f in failures)
            if passes:
                parts.append("PASSES:")
                parts.extend("  " + p for p in passes)

            message = "\n".join(parts) if parts else "\n".join(output_lines[-5:])

            results.append(
                {
                    "name": script_label,
                    "passed": passed,
                    "message": message,
                }
            )
        except subprocess.TimeoutExpired:
            results.append(
                {
                    "name": script_label,
                    "passed": False,
                    "message": "Test timed out after 30 seconds.",
                }
            )
        except Exception as exc:
            results.append(
                {
                    "name": script_label,
                    "passed": False,
                    "message": f"Subprocess error: {exc}",
                }
            )

    summary = f"{passed_count}/{total_count} test suites passed"
    return {
        "status": "completed"
        if passed_count == total_count
        else "completed_with_failures",
        "results": results,
        "summary": summary,
    }


# -----------------------------------------------------------------------------
# Placeholder Endpoints
# -----------------------------------------------------------------------------
@router.post("/api/admin/docs/open")
async def open_docs_editor(admin_data: dict = Depends(verify_token)):
    """
    PLACEHOLDER — returns 501 Not Implemented.
    The frontend handleViewEditDocs() already handles non-2xx responses
    gracefully via its catch block and surfaceError().

    Future plan: implement a documentation editing session that returns
    a URL to a live docs editor.
    """
    raise HTTPException(
        status_code=501,
        detail="Documentation editor is not yet implemented.",
    )


@router.post("/api/admin/agents/generate")
async def generate_agents(admin_data: dict = Depends(verify_token)):
    """
    PLACEHOLDER — returns 501 Not Implemented.
    The frontend handleGenerateAgents() already handles non-2xx responses
    gracefully via its catch block and surfaceError().

    Future plan: implement an agent generation workflow that spawns new
    AI agents based on architectural documentation and returns a count
    of agents created.
    """
    raise HTTPException(
        status_code=501,
        detail="Agent generation workflow is not yet implemented.",
    )


# -----------------------------------------------------------------------------
# Service Restart
# -----------------------------------------------------------------------------
@router.post("/api/admin/services/restart")
async def restart_services(admin_data: dict = Depends(verify_token)):
    """
    Initiates a restart of the admin.service systemd unit.

    Design: The endpoint returns HTTP 200 immediately, then spawns a
    daemon thread that sleeps 1 second (allowing the HTTP response to
    flush to the client) before running `sudo systemctl restart admin.service`.

    The frontend handleRestartServices() waits 3 seconds after receiving
    the response before calling location.reload(), which gives the systemd
    unit enough time to cycle.

    Consumed by agent_generation_controls.js in the System dashboard.
    """

    def _do_restart():
        """Daemon thread: wait for response to flush, then restart."""
        import time as _time

        _time.sleep(1.0)
        try:
            subprocess.run(
                ["sudo", "systemctl", "restart", "admin.service"],
                capture_output=True,
                text=True,
                timeout=5,
            )
        except Exception as exc:
            logger.error(f"Service restart failed: {exc}")

    thread = threading.Thread(target=_do_restart, daemon=True)
    thread.start()

    return {
        "message": "Services restart initiated.",
        "service": "admin.service",
    }
