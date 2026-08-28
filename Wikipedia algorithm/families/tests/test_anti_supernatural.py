"""Unit tests for the anti-supernatural family."""

import unittest

from families.anti_supernatural import score


class TestAntiSupernatural(unittest.TestCase):
    """Tests for anti-supernatural scoring logic."""

    def test_out_of_scope_when_not_miracle_or_passion(self) -> None:
        """Article not in Miracle or Passion scope → 0."""
        result = score(
            "Some text", {"is_miracle": False, "is_passion": False},
            embedder=None, store=None,
        )
        self.assertEqual(result["contribution"], 0)
        self.assertTrue(result.get("out_of_scope"))

    def test_fallback_when_store_none(self) -> None:
        """Store is None → fallback."""
        result = score(
            "Miracle text", {"is_miracle": True},
            embedder=None, store=None,
        )
        self.assertTrue(result.get("fallback", False))

    def test_passion_margin_not_applied_when_not_passion(self) -> None:
        """Passion margin only applies to Passion articles."""
        result = score(
            "text", {"is_miracle": True, "is_passion": False},
            embedder=None, store=None,
        )
        self.assertFalse(result.get("passion_margin_applied", False))


if __name__ == "__main__":
    unittest.main()
