#!/usr/bin/env python3
"""Smoke tests for the Jev pilot scripts: parsing of both engines and the agreement maths."""
import sys
import unittest
from pathlib import Path

_ALGO_DIR = Path(__file__).resolve().parent.parent
if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

from scripts import jev_pilot_label, jev_pilot_report


class TestJevParsing(unittest.TestCase):
    def test_parse_jev_answer_reads_choice_and_probabilities(self):
        response = {
            "answers": {
                "tier": {
                    "type": "choice",
                    "choice": "close",
                    "confidence": 0.9,
                    "probabilities": {"data": 0.05, "close": 0.9, "interpretation": 0.05},
                }
            }
        }
        parsed = jev_pilot_label.parse_jev_answer(response)
        self.assertEqual(parsed["label"], "close")
        self.assertEqual(parsed["confidence"], 0.9)

    def test_parse_deepseek_labels_returns_empty_on_bad_json(self):
        good = {"choices": [{"message": {"content": '{"labels": ["Data", "close"]}'}}]}
        bad = {"choices": [{"message": {"content": "not json"}}]}
        self.assertEqual(jev_pilot_label.parse_deepseek_labels(good), ["data", "close"])
        self.assertEqual(jev_pilot_label.parse_deepseek_labels(bad), [])


class TestCorpusRows(unittest.TestCase):
    def test_corpus_rows_carry_title_index_and_text(self):
        rows = jev_pilot_label.load_corpus_rows()
        self.assertGreater(len(rows), 0)
        self.assertEqual(set(rows[0]), {"article_title", "paragraph_index", "text"})
        self.assertEqual(rows[0]["paragraph_index"], 0)


class TestAgreementMaths(unittest.TestCase):
    def test_kappa_is_one_for_identical_and_zero_for_chance(self):
        same = ["data", "close", "interpretation", "data"]
        self.assertEqual(jev_pilot_report.cohen_kappa(same, same), 1.0)
        # Always "data" against a mixed list agrees by chance only.
        mixed = ["data", "close", "data", "close"]
        self.assertEqual(jev_pilot_report.cohen_kappa(["data"] * 4, mixed), 0.0)

    def test_kappa_accepts_labels_outside_the_paragraph_set(self):
        states = ["clear_split", "one_sided", "clear_split", "muddled"]
        self.assertEqual(jev_pilot_report.cohen_kappa(states, states), 1.0)

    def test_accuracy_by_confidence_puts_each_record_in_one_band(self):
        records = [{"label": "data", "confidence": 0.5}, {"label": "close", "confidence": 0.99}]
        rows = jev_pilot_report.accuracy_by_confidence(["data", "data"], records)
        self.assertEqual(sum(count for _, count, _ in rows), 2)


if __name__ == "__main__":
    unittest.main()
