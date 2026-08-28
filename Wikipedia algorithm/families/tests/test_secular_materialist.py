"""Unit tests for the secular-materialist family."""

import unittest

from families.secular_materialist import score


class TestSecularMaterialist(unittest.TestCase):
    """Tests for secular-materialist scoring logic."""

    def test_out_of_scope(self) -> None:
        result = score(
            "Some text", {"is_miracle": False, "is_passion": False},
            embedder=None, store=None,
        )
        self.assertEqual(result["contribution"], 0)
        self.assertTrue(result.get("out_of_scope"))

    def test_fallback_when_store_none(self) -> None:
        result = score(
            "Miracle text", {"is_miracle": True},
            embedder=None, store=None,
        )
        self.assertTrue(result.get("fallback", False))


if __name__ == "__main__":
    unittest.main()
