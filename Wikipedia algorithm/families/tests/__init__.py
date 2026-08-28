"""Tests for the vector signal families."""

import sys
from pathlib import Path

# Put the algorithm root on sys.path once for this whole test package instead
# of repeating a 3-line insert at the top of every test module. Discovery
# imports this __init__.py before the test modules whenever the package is
# discovered as a package, e.g.:
#   python3 -m unittest discover -s "Wikipedia algorithm/families/tests" \
#       -t "Wikipedia algorithm" -p "test_*.py"
# (Same insert, same parent.parent.parent depth as the old per-file lines.)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
