"""Unit tests for the Passion margin logic.

Exercises the real margin-application path: mythicist_framing.score() accepts
a passion_margin parameter (§3.9) and applies it only when the article is
Passion-category — so a Passion fixture vs. a non-Passion fixture must score
differently by exactly the margin, not just echo the config default.
"""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.config import PASSION_MARGIN_DEFAULT
from families.mythicist_framing import score


class TestPassionMargin(unittest.TestCase):
    """Tests for Passion-margin application logic."""

    TEXT = "According to Richard Carrier, Jesus may never have existed."

    def test_default_margin_is_zero(self) -> None:
        """The shipped default applies no margin (calibration may override)."""
        self.assertEqual(PASSION_MARGIN_DEFAULT, 0)

    def test_margin_applied_to_passion_article_only(self) -> None:
        """A Passion article's contribution shifts by exactly the margin;
        the identical non-Passion article's does not."""
        margin = -2
        passion = score(
            self.TEXT, [], {"is_passion": True}, 0,
            embedder=None, passion_margin=margin,
        )
        non_passion = score(
            self.TEXT, [], {"is_passion": False}, 0,
            embedder=None, passion_margin=margin,
        )
        # Same article, same everything except the is_passion flag: the only
        # allowed difference is the margin itself (cap not reached here).
        self.assertEqual(passion["contribution"], non_passion["contribution"] + margin)
        self.assertTrue(passion["passion_margin_applied"])
        self.assertFalse(non_passion["passion_margin_applied"])

    def test_zero_margin_leaves_passion_and_non_passion_identical(self) -> None:
        """With the default 0 margin, is_passion changes nothing."""
        passion = score(
            self.TEXT, [], {"is_passion": True}, 0, embedder=None,
        )
        non_passion = score(
            self.TEXT, [], {"is_passion": False}, 0, embedder=None,
        )
        self.assertEqual(passion["contribution"], non_passion["contribution"])
        self.assertFalse(passion["passion_margin_applied"])
        self.assertFalse(non_passion["passion_margin_applied"])


if __name__ == "__main__":
    unittest.main()
