# =============================================================================
#   THE JESUS WEBSITE — HELPER API
#   File:    backend/scripts/helper_api.py
#   Version: 1.1.0
#   Purpose: Shared logic for secure external API connection calls.
#
#   DATA FLOW:
#     Called by pipeline scripts (e.g., pipeline_wikipedia.py) when they need
#     to reach a live external data source (Wikipedia REST API, Google Trends,
#     RSS feeds, etc.).
#
#   USAGE NOTE:
#     Import make_request() directly into any pipeline that needs HTTP access.
#     This module is stateless and safe to call repeatedly.
#
#   QUIRKS:
#     - Returns None (not an exception) on total failure so the calling pipeline
#       can gracefully continue to the next record rather than crash entirely.
#     - Single-line comments on //url patterns are disabled in minify_js to
#       avoid stripping embedded URLs from content strings.
# =============================================================================

import logging
import time
import requests

# Set up basic logging for monitoring API connections
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Standard user agent for The Jesus Website automated jobs
DEFAULT_USER_AGENT = "TheJesusWebsite/1.0.0 (https://github.com/thejesuswebsite; bot)"
DEFAULT_TIMEOUT_SECONDS = 15
MAX_RETRIES = 3

def make_request(url: str, method: str = "GET", params: dict = None, headers: dict = None, json_data: dict = None) -> dict:
    """
    Executes a secure HTTP request, automatically handling retries, timeouts, and logging.
    
    Args:
        url (str): The target URL endpoint.
        method (str): HTTP method (e.g., 'GET', 'POST'). Defaults to 'GET'.
        params (dict): URL query parameters.
        headers (dict): Custom HTTP headers.
        json_data (dict): JSON payload for POST/PUT requests.
        
    Returns:
        dict: The parsed JSON response, or None if the request fully failed.
    """
    request_headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    
    if headers:
        request_headers.update(headers)
        
    attempt = 0
    backoff_time = 2  # Start with 2 seconds backoff
    
    while attempt < MAX_RETRIES:
        try:
            logger.info(f"API Request: {method} {url} (Attempt {attempt + 1}/{MAX_RETRIES})")
            
            response = requests.request(
                method=method,
                url=url,
                params=params,
                headers=request_headers,
                json=json_data,
                timeout=DEFAULT_TIMEOUT_SECONDS
            )
            
            response.raise_for_status()
            
            # Return parsed JSON
            return response.json()
            
        except requests.exceptions.HTTPError as http_error:
            # Handle rate limiting (429) specifically
            if response.status_code == 429:
                logger.warning(f"Rate limited (429) by {url}. Waiting before retry...")
                time.sleep(backoff_time * 2)
            else:
                logger.error(f"HTTP Error {response.status_code}: {http_error}")
                
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection Error when reaching {url}")
            
        except requests.exceptions.Timeout:
            logger.error(f"Timeout Error after {DEFAULT_TIMEOUT_SECONDS}s when reaching {url}")
            
        except ValueError:
            logger.error(f"Invalid JSON response from {url}")
            return None # If it's not JSON, we fail early rather than retrying usually
            
        except Exception as e:
            logger.error(f"Unexpected connection error: {e}")
            
        attempt += 1
        if attempt < MAX_RETRIES:
            logger.info(f"Retrying in {backoff_time} seconds...")
            time.sleep(backoff_time)
            backoff_time *= 2  # Exponential backoff
            
    logger.error(f"Failed to fetch {url} after {MAX_RETRIES} attempts.")
    return None
