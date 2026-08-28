"""Unit tests for the balanced-debate family."""

import unittest

from families.balanced_debate import score, FAMILY_NAME


class TestBalancedDebate(unittest.TestCase):
    """Tests for balanced-debate scoring logic (deterministic, no model needed)."""

    def test_empty_interpretation_paragraphs(self) -> None:
        """No interpretation paragraphs → zero contribution."""
        result = score("Some text", [], embedder=None, store=None)
        self.assertEqual(result["contribution"], 0)

    def test_fallback_when_store_none(self) -> None:
        """Store is None → fallback returned."""
        result = score("text", ["interp para"], embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))
        self.assertEqual(result["contribution"], 0)


if __name__ == "__main__":
    unittest.main()
