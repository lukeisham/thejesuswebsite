# =============================================================================
#   THE JESUS WEBSITE — PORT AVAILABILITY TEST
#   File:    tests/port_test.py
#   Version: 1.1.0
#   Purpose: Verifies all local ports (Admin API, MCP Server) are responding.
# =============================================================================

import socket
import logging
import sys
import os

# Ensure package context is recognized when running directly from CLI
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

def run_suite():
    logger.info("Starting Infrastructure Port Health Audit...")
    
    # Infrastructure targets defined in nginx.conf / deployment systemd files
    targets = [
        ("127.0.0.1", 8000, "Admin FastAPI Backend"),
        ("127.0.0.1", 8001, "MCP Read-Only Server")
    ]
    
    all_ok = True
    for host, port, name in targets:
        if not check_port(host, port, name):
            all_ok = False
            
    if all_ok:
        logger.info("Core infrastructure connectivity verified.")
    else:
        logger.warning("Incomplete infrastructure response detected.")

if __name__ == "__main__":
    run_suite()
