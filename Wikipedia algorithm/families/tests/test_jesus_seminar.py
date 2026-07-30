"""Unit tests for the jesus-seminar family."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.jesus_seminar import score


class TestJesusSeminar(unittest.TestCase):
    """Tests for jesus-seminar scoring logic."""

    def test_no_names_found(self) -> None:
        result = score("Jesus was a teacher.", [], 3, embedder=None)
        self.assertEqual(result["contribution"], 0)

    def test_funk_detected(self) -> None:
        result = score(
            "Robert Funk of the Jesus Seminar argued...", [],
            3, embedder=None,
        )
        self.assertIn("funk", result["names_found"])

    def test_crossan_detected(self) -> None:
        result = score(
            "John Dominic Crossan's analysis of the parables...", [],
            3, embedder=None,
        )
        self.assertIn("crossan", result["names_found"])


if __name__ == "__main__":
    unittest.main()
