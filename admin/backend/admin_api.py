# =============================================================================
#   THE JESUS WEBSITE — ADMIN API ENTRY POINT
#   File:    admin/backend/admin_api.py
#   Version: 1.0.0
#   Purpose: Uvicorn entry point. Imports create_app() from routes/__init__.py
#            and exposes it as `app` for `uvicorn admin_api:app`.
# =============================================================================

import os
import sys

# Add project root to sys.path so that `backend.*` and top-level module
# imports resolve correctly from inside admin/backend/routes/.
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from routes import create_app  # noqa: E402

app = create_app()
