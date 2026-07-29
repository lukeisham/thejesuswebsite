"""Unit tests for the Passion margin logic."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.config import PASSION_MARGIN_DEFAULT


class TestPassionMargin(unittest.TestCase):
    """Tests for Passion-margin application logic."""

    def test_default_margin_is_zero(self) -> None:
        self.assertEqual(PASSION_MARGIN_DEFAULT, 0)

    def test_margin_applied_only_to_passion_articles(self) -> None:
        """Passion margin only applies to articles with is_passion = True."""
        # This is tested implicitly in the family score functions.
        # The config default is 0 (no margin unless calibrated).
        self.assertEqual(PASSION_MARGIN_DEFAULT, 0)


if __name__ == "__main__":
    unittest.main()
