"""Unit tests for the mythicist-framing family."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.mythicist_framing import score


class TestMythicistFraming(unittest.TestCase):
    """Tests for mythicist-framing scoring logic."""

    def test_no_names_found(self) -> None:
        """No mythicist names in text → zero contribution."""
        result = score(
            "Jesus was a historical figure.", [],
            {}, 0, embedder=None,
        )
        self.assertEqual(result["contribution"], 0)
        self.assertEqual(result["name_count"], 0)

    def test_carrier_detected(self) -> None:
        """Carrier name in text → fires."""
        result = score(
            "According to Richard Carrier, Jesus may never have existed.", [],
            {}, 3, embedder=None,
        )
        self.assertGreaterEqual(result["name_count"], 1)
        self.assertIn("carrier", result["names_found"])

    def test_imbalance_surcharge_when_no_debate(self) -> None:
        """Imbalance surcharge applied when balanced-debate = 0."""
        result = score(
            "Richard Carrier argues that Jesus was a mythical figure.", [],
            {}, 0, embedder=None,
        )
        self.assertTrue(result.get("imbalance_applied", False))


if __name__ == "__main__":
    unittest.main()
