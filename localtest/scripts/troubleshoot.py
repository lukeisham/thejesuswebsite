# =============================================================================
#   THE JESUS WEBSITE — LOCAL TROUBLESHOOTING TOOL
#   File:    localtest/scripts/troubleshoot.py
#   Version: 1.0.0
#   Purpose: Automated health check for the local unified server.
# =============================================================================

import os
import socket
import sys

import requests

# Configuration
TEST_PORT = 8000
BASE_URL = f"http://localhost:{TEST_PORT}"
ENDPOINTS = [
    ("/", "Public Landing Page"),
    ("/timeline", "Timeline Page"),
    ("/admin/frontend/admin.html", "Admin Portal"),
    (
        "/api/health",
        "API Health Endpoint",
    ),  # Assuming /api/health exists or will be added
]


def check_port_open(port):
    """Checks if a port is listening on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def check_endpoints():
    """Tries to fetch key endpoints and reports status."""
    print(f"--- Probing unified server at {BASE_URL} ---")
    all_pass = True

    for path, description in ENDPOINTS:
        url = f"{BASE_URL}{path}"
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"[PASS] {description}: HTTP 200")
            elif response.status_code == 404:
                print(f"[FAIL] {description}: HTTP 404 (File not found)")
                all_pass = False
            else:
                print(f"[WARN] {description}: HTTP {response.status_code}")
                all_pass = False
        except requests.exceptions.ConnectionError:
            print(
                f"[CRITICAL] {description}: Connection Refused. Is the server running?"
            )
            return False
        except Exception as e:
            print(f"[ERROR] {description}: {str(e)}")
            all_pass = False

    return all_pass


def main():
    print("Starting Jesus Website Local Health Check...")

    if not check_port_open(TEST_PORT):
        print(f"!!! Error: Port {TEST_PORT} is NOT listening.")
        print("    Try running: python3 serve_all.py")
        sys.exit(1)

    print(f"Confirming Port {TEST_PORT} is active...")

    if check_endpoints():
        print("\nSUMMARY: All core local endpoints are responding correctly.")
    else:
        print("\nSUMMARY: One or more local test checks failed. Review the logs above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
