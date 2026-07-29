"""Unit tests for the literary-analysis family."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.literary_analysis import score


class TestLiteraryAnalysis(unittest.TestCase):
    """Tests for literary-analysis scoring logic."""

    def test_fallback_when_store_none(self) -> None:
        result = score("text", {}, embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))


if __name__ == "__main__":
    unittest.main()
