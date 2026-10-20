#!/usr/bin/env python3
"""Smoke tests for train_agreement_head: the label rules and the Jev label grouping."""
import sys
import unittest
from pathlib import Path

import numpy as np

_ALGO_DIR = Path(__file__).resolve().parent.parent
if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

from scripts import train_agreement_head as agreement
from scripts.train_paragraph_head import N_FOLDS, Article, fold_numbers


def jev_record(label: str, confidence: float) -> dict:
    return {"label": label, "confidence": confidence}


class TestAgreedLabels(unittest.TestCase):
    def test_keeps_only_confident_agreement(self):
        jev = {
            ("A", 0): jev_record("data", 0.95),
            ("A", 1): jev_record("interpretation", 0.95),  # engines disagree
            ("A", 2): jev_record("interpretation", 0.5),  # agree, not confident
        }
        labels = agreement.agreed_labels("A", ["data", "data", "interpretation"], jev)
        self.assertEqual(labels, ["data", "other", "other"])

    def test_missing_jev_record_raises(self):
        with self.assertRaises(ValueError):
            agreement.agreed_labels("A", ["data"], {})


class TestLabelRules(unittest.TestCase):
    JEV = {("A", 0): jev_record("interpretation", 0.95), ("A", 1): jev_record("data", 0.4)}

    def test_jev_rule_keeps_confident_jev_label_even_when_deepseek_differs(self):
        labels = agreement.training_labels("A", ["data", "data"], self.JEV, "jev")
        self.assertEqual(labels, ["interpretation", "other"])

    def test_deepseek_rule_keeps_every_label_and_folds_close_into_data(self):
        labels = agreement.training_labels("A", ["close", "interpretation"], self.JEV, "deepseek")
        self.assertEqual(labels, ["data", "interpretation"])

    def test_unknown_rule_raises(self):
        with self.assertRaises(ValueError):
            agreement.training_labels("A", ["data"], self.JEV, "other-rule")


class TestGroupJevLabels(unittest.TestCase):
    def test_orders_each_articles_labels_by_paragraph_index(self):
        jev = {
            ("A", 1): jev_record("interpretation", 0.9),
            ("A", 0): jev_record("data", 0.9),
            ("B", 0): jev_record("data", 0.9),
        }
        grouped = agreement.group_jev_labels(jev)
        self.assertEqual(grouped, {"A": ["data", "interpretation"], "B": ["data"]})

    def test_gap_in_paragraph_indexes_raises(self):
        with self.assertRaises(ValueError):
            agreement.group_jev_labels({("A", 0): jev_record("data", 0.9), ("A", 2): jev_record("data", 0.9)})


def make_article(title: str, n: int = 2) -> Article:
    return Article(
        title=title, embeddings=np.zeros((n, 3)), llm_labels=["data"] * n,
        positional=[False] * n, gold_state="clear_split", aligned=True,
    )


class TestTrainingArticles(unittest.TestCase):
    def test_jev_rule_swaps_in_confident_labels_and_keeps_the_gold_state(self):
        jev = {("A", 0): jev_record("data", 0.9), ("A", 1): jev_record("interpretation", 0.3)}
        (prepared,) = agreement.training_articles([make_article("A")], jev, {}, "jev")
        self.assertEqual(prepared.llm_labels, ["data", "other"])
        self.assertEqual(prepared.gold_state, "clear_split")

    def test_deepseek_rule_marks_a_count_mismatch_as_not_aligned(self):
        (prepared,) = agreement.training_articles(
            [make_article("A", n=2)], {}, {"A": ["data"]}, "deepseek")
        self.assertFalse(prepared.aligned)


class TestFoldNumbers(unittest.TestCase):
    def test_every_article_gets_a_fold_in_range_and_the_same_one_each_time(self):
        articles = [make_article(f"Article {i}") for i in range(40)]
        folds = fold_numbers(articles)
        self.assertTrue(all(0 <= f < N_FOLDS for f in folds))
        self.assertEqual(folds, fold_numbers(list(articles)))


if __name__ == "__main__":
    unittest.main()
