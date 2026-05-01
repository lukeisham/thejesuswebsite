# =============================================================================
#   THE JESUS WEBSITE — AUTH UTILITIES
#   File:    admin/backend/auth_utils.py
#   Version: 1.1.0
#   Purpose: JWT generation and Brute Force defense.
# =============================================================================

import os
import time
from datetime import datetime, timedelta

import jwt
from dotenv import load_dotenv

# Load env variables from the local .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

# Brute force defense state mechanism
# In production with multiple workers, this should be backed by Redis.
# For single-instance VPS, in-memory dictionary is sufficient.
login_attempts = {}


class AuthUtils:
    @staticmethod
    def check_brute_force(ip_address: str):
        """
        Check if the IP is currently locked out.
        Returns (is_safe: bool, message: str)
        """
        now = time.time()
        record = login_attempts.get(ip_address, {"count": 0, "lockout_until": 0})

        if record["lockout_until"] > now:
            return False, "Too many login attempts. IP locked out temporarily."
        return True, ""

    @staticmethod
    def record_attempt(ip_address: str, success: bool):
        """
        Records an authentication attempt, implements slight delay on failure,
        and manages 5-strike lockout rules.
        """
        now = time.time()
        record = login_attempts.get(ip_address, {"count": 0, "lockout_until": 0})

        if success:
            # Reset on successful login
            if ip_address in login_attempts:
                del login_attempts[ip_address]
        else:
            record["count"] += 1
            if record["count"] >= 5:
                # Lockout for 5 minutes (300 seconds)
                record["lockout_until"] = now + 300
                record["count"] = 0
            login_attempts[ip_address] = record

            # Inject a small artificial delay to deter rapid automated brute forcing
            time.sleep(1)

    @staticmethod
    def verify_password(password: str) -> bool:
        """
        Verifies the provided password against the .env ADMIN_PASSWORD.
        """
        # In a generic multi-user system we'd hash this, but since it's a single
        # admin password loaded via ENV, strict string matching is secure.
        return password == ADMIN_PASSWORD

    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta | None = None):
        """
        Generates a JSON Web Token (JWT) tracking session expiration.
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=12)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_access_token(token: str):
        """
        Decodes and verifies a JWT token. Returns payload or None if invalid.
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
