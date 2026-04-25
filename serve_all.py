import uvicorn
import os
from dotenv import load_dotenv
import sys
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

load_dotenv()

# 1. Path Setup
# Add the project root to sys.path for internal imports
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, 'admin', 'backend'))

# 2. Import the existing Admin API
# This ensures all your existing API routes are preserved
from admin.backend.admin_api import app as api_app

# Create a container app (using the existing app as the base)
app = api_app 

# --- MIDDLEWARE SECTION ---

# 3. Trusted Host Middleware (FIX FOR 400 ERROR)
# This allows the app to recognize requests coming from your domain and Cloudflare
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]
)

# 4. CORS Middleware (PREVIOUS FUNCTIONALITY)
# Remains exactly as you had it for local testing and cross-origin access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STATIC FILES SECTION ---

# 5. Static File Mounting (PREVIOUS FUNCTIONALITY)
# Mounted LAST so that specific API routes in api_app take precedence over file lookups
app.mount("/", StaticFiles(directory=ROOT_DIR, html=True), name="static")

if __name__ == "__main__":
    # Local debugging configuration
    print("Starting Unified Test Server on http://localhost:8000")
    print(" - Public Site: http://localhost:8000/index.html")
    print(" - Admin Site:  http://localhost:8000/admin/frontend/admin.html")
    print(" - Admin API:   http://localhost:8000/api/admin/...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    