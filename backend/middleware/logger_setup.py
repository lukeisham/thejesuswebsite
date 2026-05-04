# =============================================================================
#   THE JESUS WEBSITE — CENTRALIZED LOGGING MIDDLEWARE
#   File:    backend/middleware/logger_setup.py
#   Version: 1.1.0
#   Purpose: Standardizes logging across system scripts and test reports.
# =============================================================================

import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logger(caller_file, is_test=False):
    """
    Sets up a rotating file logger based on the calling file.
    Tests log to /tests/reports, system scripts log to /logs.
    """
    _ROOT_DIR = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )

    # Standard output directories per module_sitemap.md
    LOG_DIR = (
        os.path.join(_ROOT_DIR, "tests", "reports")
        if is_test
        else os.path.join(_ROOT_DIR, "logs")
    )
    os.makedirs(LOG_DIR, exist_ok=True)

    # Use basename of caller to name the log file
    log_filename = os.path.basename(caller_file).replace(".py", ".log")
    log_path = os.path.join(LOG_DIR, log_filename)

    # Force reset basicConfig if it was already set (to allow standardizing)
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),  # Console output
            RotatingFileHandler(
                log_path, maxBytes=5 * 1024 * 1024, backupCount=2
            ),  # 5MB per file
        ],
    )

    return logging.getLogger(log_filename)
