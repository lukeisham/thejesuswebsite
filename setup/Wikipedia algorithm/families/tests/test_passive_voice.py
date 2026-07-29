"""Unit tests for the passive-voice detector."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.passive_voice import (
    count_passive_patterns,
    passive_ratio,
    passive_asymmetry,
)


class TestPassivePatterns(unittest.TestCase):
    """Tests for passive-voice regex patterns."""

    def test_simple_passive(self) -> None:
        text = "The temple was destroyed by the Romans."
        self.assertGreater(count_passive_patterns(text), 0)

    def test_present_perfect_passive(self) -> None:
        text = "The site has been excavated by archaeologists."
        self.assertGreater(count_passive_patterns(text), 0)

    def test_get_passive_with_gotten(self) -> None:
        text = "The manuscript had gotten lost during the siege."
        self.assertGreater(count_passive_patterns(text), 0)

    def test_no_passive(self) -> None:
        text = "Jesus travelled from Galilee to Jerusalem."
        self.assertEqual(count_passive_patterns(text), 0)

    def test_active_voice_not_passive(self) -> None:
        text = "The scholars argued that the dating was early."
        # "argued" is active here — no auxiliary before it.
        # "was early" is a copula, not passive.
        # But "was early" matches the pattern? Let's check.
        # "was\s+early" — "early" doesn't end in -ed/en/t... Hmm.
        # Actually pattern 1: \w+(?:ed|en|[aeiou]t|...)
        # "early" ends in "ly" — no match. Good.
        # "was argued" — no, "argued" follows "scholars" not an auxiliary.
        self.assertEqual(count_passive_patterns(text), 0)

    def test_by_agent_pattern(self) -> None:
        text = "was seen by scholars as evidence."
        self.assertGreater(count_passive_patterns(text), 0)

    def test_empty_text(self) -> None:
        self.assertEqual(count_passive_patterns(""), 0)
        self.assertEqual(count_passive_patterns("   "), 0)


class TestPassiveRatio(unittest.TestCase):
    """Tests for passive_ratio()."""

    def test_all_passive_sentences(self) -> None:
        text = (
            "The site was excavated by a French team. "
            "The findings were published in 2010. "
            "The artefacts had been removed earlier."
        )
        ratio = passive_ratio(text)
        self.assertAlmostEqual(ratio, 1.0, places=4)

    def test_no_passive(self) -> None:
        text = (
            "Jesus travelled to Jerusalem. "
            "He taught in the temple. "
            "The disciples followed him."
        )
        ratio = passive_ratio(text)
        self.assertEqual(ratio, 0.0)

    def test_mixed(self) -> None:
        text = (
            "The site was excavated in 1920. "
            "Jesus taught in Galilee. "
            "The manuscript was discovered in 1945."
        )
        ratio = passive_ratio(text)
        self.assertAlmostEqual(ratio, 2.0 / 3.0, places=4)

    def test_empty(self) -> None:
        self.assertEqual(passive_ratio(""), 0.0)


class TestPassiveAsymmetry(unittest.TestCase):
    """Tests for passive_asymmetry()."""

    def test_symmetric(self) -> None:
        view_a = "The miracle was described by the evangelist. The site was excavated recently."
        view_b = "The argument was presented by Ehrman. The theory was debated widely."
        result = passive_asymmetry(view_a, view_b)
        self.assertAlmostEqual(result["asymmetry"], 0.0, places=4)
        self.assertFalse(result["fires"])

    def test_asymmetric(self) -> None:
        view_a = (
            "The miracle was described by the evangelist. "
            "The event was recorded in the Gospel."
        )
        view_b = (
            "Scholars argue the event was literary. "
            "Critics point to later dating evidence. "
            "Modern historians evaluate the sources."
        )
        result = passive_asymmetry(view_a, view_b)
        self.assertGreater(result["asymmetry"], 0.0)


if __name__ == "__main__":
    unittest.main()
