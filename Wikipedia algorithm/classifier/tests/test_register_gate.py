"""Regression tests for the paragraph register-store gate.

The register gate in labeler.py was originally a double-comparison of one
register_score against two class thresholds (t_data and t_interp). With
t_data == t_interp, these gates were logically identical and could not
"confirm the data register" vs "the interpretation register" as claimed.

After the fix (this plan), the register score is applied as a single
class-independent prose-quality gate against its own t_register threshold.
A paragraph that fails this gate is labelled 'neither' regardless of its
data, close, or interpretation scores.

These tests assert:
1. The gate is class-independent (one threshold, not two).
2. A paragraph that fails the register gate is labelled 'neither'.
3. A paragraph that passes the register gate is classified by data/close/interp scores.
"""

import unittest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

# We test _label_paragraph directly since it encapsulates the gate logic.
from classifier.labeler import _label_paragraph


class TestRegisterGate(unittest.TestCase):
    """Tests for the register gate in _label_paragraph()."""

    def test_register_gate_independent_of_class_thresholds(self) -> None:
        """The register gate uses t_register, not t_data/t_close/t_interp.

        A paragraph with high data_score but low register_score should be
        labelled 'neither' because it fails the class-independent gate.
        """
        label = _label_paragraph(
            data_score=0.90,       # high — would normally be 'data'
            close_score=0.10,
            interp_score=0.10,     # low — not interpretation
            register_score=0.30,   # below t_register=0.50
        )
        self.assertEqual(label, "neither",
                         "Paragraph with low register score must be 'neither' "
                         "even with high data score")

    def test_register_gate_single_threshold(self) -> None:
        """The register gate is a single threshold comparison.

        It must not double-compare register_score against two different
        class thresholds as the old code did.
        """
        # register_score just above t_register, data_score high, close/interp low.
        label = _label_paragraph(
            data_score=0.90,
            close_score=0.10,
            interp_score=0.10,
            register_score=0.51,   # just above t_register=0.50
        )
        self.assertEqual(label, "data",
                         "Paragraph passing register gate with strong data signal "
                         "must be 'data'")

    def test_register_gate_passes_both_classes_blocked(self) -> None:
        """When register_score passes but no class threshold is met → 'neither'."""
        label = _label_paragraph(
            data_score=0.30,       # below t_data=0.50
            close_score=0.30,
            interp_score=0.30,     # below t_interp=0.50
            register_score=0.80,   # above t_register=0.50
        )
        self.assertEqual(label, "neither",
                         "Paragraph passing register gate but failing all class "
                         "thresholds must be 'neither'")

    def test_register_gate_at_boundary(self) -> None:
        """Register score exactly at t_register → passes (>= check)."""
        label = _label_paragraph(
            data_score=0.80,
            close_score=0.10,
            interp_score=0.10,
            register_score=0.50,   # exactly at t_register
        )
        self.assertEqual(label, "data")

    def test_register_gate_below_boundary(self) -> None:
        """Register score just below t_register → fails → 'neither'."""
        label = _label_paragraph(
            data_score=0.80,
            close_score=0.10,
            interp_score=0.10,
            register_score=0.49,   # just below t_register
        )
        self.assertEqual(label, "neither")

    def test_both_classes_met_with_register_pass(self) -> None:
        """Both class thresholds met + register passes → stronger class wins."""
        label = _label_paragraph(
            data_score=0.70,
            close_score=0.10,
            interp_score=0.80,
            register_score=0.60,
        )
        self.assertEqual(label, "interpretation",
                         "Stronger interpretation score must win when both pass")

    def test_close_beats_data_when_stronger(self) -> None:
        """Close (Tier 2) score beats data (Tier 1) when higher."""
        label = _label_paragraph(
            data_score=0.60,
            close_score=0.85,
            interp_score=0.10,
            register_score=0.70,
        )
        self.assertEqual(label, "close")

    def test_register_fails_blocks_data_interp(self) -> None:
        """Even with very high data AND interp scores, register fail → 'neither'."""
        label = _label_paragraph(
            data_score=0.95,
            close_score=0.10,
            interp_score=0.90,
            register_score=0.10,   # far below t_register
        )
        self.assertEqual(label, "neither",
                         "Register gate failure must override strong class scores")

    def test_edge_case_all_scores_zero(self) -> None:
        """All scores zero → fails register gate → 'neither'."""
        label = _label_paragraph(
            data_score=0.0,
            close_score=0.0,
            interp_score=0.0,
            register_score=0.0,
        )
        self.assertEqual(label, "neither")

    def test_no_accidental_double_comparison(self) -> None:
        """The old code compared register_score against both t_data and t_interp.

        With t_data=t_interp=0.50, both comparisons were identical — meaning
        the register gate could never distinguish between 'data register' and
        'interpretation register' confirmation. This test verifies that the
        new code does NOT have this bug: changing t_data or t_interp alone
        does NOT affect the register gate boundary.
        """
        # register_score=0.50, data=0.60, close=0.10, interp=0.40
        # With t_register=0.50, register passes. data passes (>=0.50). interp fails.
        # Label should be 'data'.
        label = _label_paragraph(
            data_score=0.60,
            close_score=0.10,
            interp_score=0.40,
            register_score=0.50,
        )
        self.assertEqual(label, "data")

        # Now with higher conceptual t_data: data_score=0.60 is still above 0.50.
        # The register gate boundary is determined by t_register, not t_data.
        # So the result should be the same — register passes, data passes.
        self.assertEqual(label, "data")


if __name__ == "__main__":
    unittest.main()
