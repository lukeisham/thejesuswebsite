#!/usr/bin/env python3
"""Smoke tests for gate_metrics: the candidate gate numbers for tier-state predictions."""
import sys
import unittest
from pathlib import Path

_ALGO_DIR = Path(__file__).resolve().parent.parent
if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

from scripts import gate_metrics


class TestGateCandidates(unittest.TestCase):
    def test_always_majority_has_zero_kappa_and_low_macro_f1(self):
        gold = ["clear_split"] * 8 + ["one_sided"] * 2
        predicted = ["clear_split"] * 10
        metrics = gate_metrics.gate_candidates(gold, predicted)
        self.assertEqual(metrics["tier_accuracy"], 0.8)
        self.assertEqual(metrics["kappa"], 0.0)
        self.assertEqual(metrics["minority_recall"], 0.0)
        self.assertAlmostEqual(metrics["macro_f1"], (2 * 0.8 / 1.8 + 0) / 2, places=3)

    def test_perfect_prediction_scores_one(self):
        gold = ["clear_split", "one_sided", "muddled"]
        self.assertEqual(gate_metrics.macro_f1(gold, gold), 1.0)
        metrics = gate_metrics.gate_candidates(gold * 5, gold * 5)
        self.assertEqual(metrics["kappa"], 1.0)
        self.assertEqual(metrics["minority_recall"], 1.0)

    def test_per_label_recall_counts_each_gold_label(self):
        recall = gate_metrics.per_label_recall(
            ["a", "a", "b", "b"], ["a", "b", "b", "b"])
        self.assertEqual(recall, {"a": 0.5, "b": 1.0})

    def test_interval_brackets_the_point_estimate(self):
        gold = ["clear_split"] * 30 + ["muddled"] * 10
        predicted = ["clear_split"] * 28 + ["muddled"] * 2 + ["muddled"] * 8 + ["clear_split"] * 2
        metrics = gate_metrics.gate_candidates(gold, predicted)
        low, high = metrics["kappa_ci"]
        self.assertLessEqual(low, metrics["kappa"])
        self.assertGreaterEqual(high, metrics["kappa"])

    def test_no_minority_articles_gives_zero_minority_recall(self):
        self.assertEqual(gate_metrics.minority_recall(["clear_split"] * 3, ["clear_split"] * 3), 0.0)


if __name__ == "__main__":
    unittest.main()
