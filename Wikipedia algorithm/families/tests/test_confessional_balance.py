"""Unit tests for the confessional-balance family."""

import unittest

from families.confessional_balance import score


class TestConfessionalBalance(unittest.TestCase):
    """Tests for confessional-balance scoring logic."""

    def test_no_critical_names(self) -> None:
        result = score("Jesus was a teacher.", [], embedder=None)
        self.assertEqual(result["contribution"], 0)

    def test_ehrman_no_evangelical_contrast_inside_interp(self) -> None:
        """Ehrman cited in interpretation section without evangelical contrast → −1."""
        result = score(
            "Bart Ehrman argues that the text was altered.",
            ["interpretation"], embedder=None,
        )
        self.assertEqual(result["contribution"], -1)

    def test_ehrman_with_wright_contrast(self) -> None:
        """Ehrman cited with N.T. Wright contrast → 0."""
        result = score(
            "Ehrman argues X, but N.T. Wright counters Y.",
            ["interpretation"], embedder=None,
        )
        self.assertEqual(result["contribution"], 0)

    def test_critical_outside_interpretation(self) -> None:
        """Critical name outside interpretation → −3."""
        result = score(
            "Bart Ehrman has written extensively on this.",
            ["data"], embedder=None,
        )
        self.assertEqual(result["contribution"], -3)


if __name__ == "__main__":
    unittest.main()
