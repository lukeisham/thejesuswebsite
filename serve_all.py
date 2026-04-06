
import uvicorn
import os
import sys
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Add the project root to sys.path for internal imports
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, 'admin', 'backend'))

# Import the admin API app
from admin.backend.admin_api import app as api_app

# Create a container app
app = api_app # We use the existing app as the base

# Add CORS for local testing across ports if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the root directory as static files for the public site and admin frontend
# This is mounted LAST so that API routes take precedence
app.mount("/", StaticFiles(directory=ROOT_DIR, html=True), name="static")

if __name__ == "__main__":
    print("Starting Unified Test Server on http://localhost:8000")
    print(" - Public Site: http://localhost:8000/index.html")
    print(" - Admin Site:  http://localhost:8000/admin/frontend/admin.html")
    print(" - Admin API:   http://localhost:8000/api/admin/...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
