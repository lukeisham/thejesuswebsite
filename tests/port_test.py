# =============================================================================
#   THE JESUS WEBSITE — INFRASTRUCTURE AVAILABILITY TEST
#   File:    tests/port_test.py
#   Version: 2.0.0
#   Purpose: Verifies Admin API responding on port and MCP Server process
#            presence. The MCP server uses stdio transport (no port binding)
#            per deployment/mcp.service, so process presence is checked
#            instead of a TCP socket. MCP failure is non-fatal — it is an
#            external-agent-facing service not always running during dev.
# =============================================================================

import os
import socket
import sys

import psutil

# Ensure package context recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging for tests
logger = setup_logger(__file__, is_test=True)


def check_port(host, port, service_name):
    """
    Attempts to establish a socket connection to a specific port.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(2.0)
        try:
            s.connect((host, port))
            logger.info(f"SUCCESS: {service_name} responding on {host}:{port}")
            return True
        except (socket.timeout, ConnectionRefusedError):
            logger.error(f"FAILURE: {service_name} NOT responding on {host}:{port}")
            return False


def check_mcp_process(process_name="mcp_server.py"):
    """
    Checks if the MCP server process is running.
    The MCP server uses stdio transport (no port binding), so we verify
    its availability by looking for the running process instead.

    This is non-fatal — the MCP server is launched on-demand by AI agent
    clients and may not be running during local development or CI.
    """
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = proc.info.get("cmdline") or []
            if any(process_name in part for part in cmdline):
                logger.info(
                    f"SUCCESS: MCP Read-Only Server process running (PID {proc.info['pid']})"
                )
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    logger.warning("MCP Read-Only Server process NOT found (non-fatal — stdio service)")
    return False


def run_suite():
    logger.info("Starting Infrastructure Availability Audit...")

    all_ok = True

    # 1. Port check: Admin FastAPI Backend on 8000 (hard requirement)
    if not check_port("127.0.0.1", 8000, "Admin FastAPI Backend"):
        all_ok = False

    # 2. Process check: MCP Read-Only Server (stdio transport, no port)
    #    Non-fatal — launched on-demand by MCP clients (Claude Desktop, etc.)
    check_mcp_process()

    if all_ok:
        logger.info("Core infrastructure connectivity verified.")
        return True
    else:
        logger.error("FAILURE: One or more critical services are not responding.")
        return False


if __name__ == "__main__":
    ok = run_suite()
    sys.exit(0 if ok else 1)
