"""Unit tests for scripts/paragraph_eval.py — the shared paragraph-level
confusion-matrix / precision-recall-F1 / restricted-accuracy harness added
in Phase 2 of the evaluation-harness work.

These tests are model-free (no StoreManager/ONNX/FAISS): they exercise the
pure-Python metric functions and the gold-set-three-tier.csv loader only,
matching the fast, dependency-free style of the rest of classifier/tests/.
"""

import unittest

from scripts.paragraph_eval import (
    collapse_label,
    build_confusion_matrix,
    collapse_confusion,
    precision_recall_f1,
    data_interp_restricted_accuracy,
    raw_label_distribution,
    neither_rate,
    load_three_tier_gold,
    COLLAPSED_CLASSES,
    THREE_TIER_LABEL_MAP,
)


class TestCollapseLabel(unittest.TestCase):
    def test_close_collapses_to_data(self) -> None:
        self.assertEqual(collapse_label("close"), "data")

    def test_data_stays_data(self) -> None:
        self.assertEqual(collapse_label("data"), "data")

    def test_interpretation_stays_interpretation(self) -> None:
        self.assertEqual(collapse_label("interpretation"), "interpretation")

    def test_neither_stays_neither(self) -> None:
        self.assertEqual(collapse_label("neither"), "neither")

    def test_other_collapses_to_neither(self) -> None:
        self.assertEqual(collapse_label("other"), "neither")


class TestConfusionMatrix(unittest.TestCase):
    def test_build_confusion_matrix_counts_pairs(self) -> None:
        pairs = [("data", "data"), ("data", "data"), ("data", "interpretation"),
                 ("interpretation", "interpretation")]
        cm = build_confusion_matrix(pairs)
        self.assertEqual(cm[("data", "data")], 2)
        self.assertEqual(cm[("data", "interpretation")], 1)
        self.assertEqual(cm[("interpretation", "interpretation")], 1)
        self.assertEqual(sum(cm.values()), 4)

    def test_collapse_confusion_folds_close_into_data(self) -> None:
        pairs = [("data", "close"), ("close", "data"), ("interpretation", "interpretation")]
        cm = build_confusion_matrix(pairs)
        collapsed = collapse_confusion(cm)
        # Both ("data","close") and ("close","data") become ("data","data").
        self.assertEqual(collapsed[("data", "data")], 2)
        self.assertEqual(collapsed[("interpretation", "interpretation")], 1)

    def test_collapse_confusion_folds_other_into_neither(self) -> None:
        cm = build_confusion_matrix([("data", "other")])
        collapsed = collapse_confusion(cm)
        self.assertEqual(collapsed[("data", "neither")], 1)


class TestPrecisionRecallF1(unittest.TestCase):
    def test_perfect_classifier(self) -> None:
        pairs = [("data", "data")] * 5 + [("interpretation", "interpretation")] * 5
        cm = build_confusion_matrix(pairs)
        stats = precision_recall_f1(cm, COLLAPSED_CLASSES)
        self.assertEqual(stats["data"]["precision"], 1.0)
        self.assertEqual(stats["data"]["recall"], 1.0)
        self.assertEqual(stats["data"]["f1"], 1.0)
        self.assertEqual(stats["data"]["support"], 5)

    def test_all_wrong_gives_zero(self) -> None:
        pairs = [("data", "interpretation")] * 3
        cm = build_confusion_matrix(pairs)
        stats = precision_recall_f1(cm, COLLAPSED_CLASSES)
        self.assertEqual(stats["data"]["precision"], 0.0)
        self.assertEqual(stats["data"]["recall"], 0.0)
        self.assertEqual(stats["data"]["support"], 3)

    def test_no_support_class_is_zero_not_error(self) -> None:
        pairs = [("data", "data")]
        cm = build_confusion_matrix(pairs)
        stats = precision_recall_f1(cm, COLLAPSED_CLASSES)
        self.assertEqual(stats["interpretation"]["precision"], 0.0)
        self.assertEqual(stats["interpretation"]["recall"], 0.0)
        self.assertEqual(stats["interpretation"]["support"], 0)


class TestDataInterpRestrictedAccuracy(unittest.TestCase):
    def test_excludes_gold_neither(self) -> None:
        pairs = [
            ("data", "data"),           # counted, correct
            ("interpretation", "data"),  # counted, wrong
            ("neither", "data"),         # excluded — gold is neither
            ("data", "neither"),         # excluded — pred is neither
        ]
        cm = collapse_confusion(build_confusion_matrix(pairs))
        result = data_interp_restricted_accuracy(cm)
        self.assertEqual(result["n"], 2)
        self.assertEqual(result["correct"], 1)
        self.assertEqual(result["accuracy"], 0.5)

    def test_empty_matrix_is_zero_not_error(self) -> None:
        cm = collapse_confusion(build_confusion_matrix([]))
        result = data_interp_restricted_accuracy(cm)
        self.assertEqual(result["n"], 0)
        self.assertEqual(result["accuracy"], 0.0)


class TestNeitherRate(unittest.TestCase):
    def test_neither_rate_computed_correctly(self) -> None:
        labels = ["data"] * 8 + ["neither"] * 2
        result = neither_rate(labels)
        self.assertEqual(result["neither_rate"], 0.2)
        self.assertEqual(result["total"], 10)
        self.assertEqual(result["neither_count"], 2)

    def test_empty_labels_no_zero_division(self) -> None:
        result = neither_rate([])
        self.assertEqual(result["neither_rate"], 0.0)
        self.assertEqual(result["total"], 0)

    def test_raw_label_distribution_keeps_close_visible(self) -> None:
        labels = ["data", "close", "close", "interpretation"]
        dist = raw_label_distribution(labels)
        self.assertEqual(dist["close"], 2)
        self.assertEqual(dist["data"], 1)


class TestLoadThreeTierGold(unittest.TestCase):
    """Sanity-check the gold-set-three-tier.csv loader against known facts
    about the file (measured 2026-07-30): 136 rows, tier distribution
    1=80, 2=17, 3=39."""

    def test_loads_136_rows(self) -> None:
        rows = load_three_tier_gold()
        self.assertEqual(len(rows), 136)

    def test_tier_map_produces_expected_label_counts(self) -> None:
        rows = load_three_tier_gold()
        counts = {"data": 0, "close": 0, "interpretation": 0}
        for r in rows:
            counts[r["gold_label"]] += 1
        self.assertEqual(counts["data"], 80)
        self.assertEqual(counts["close"], 17)
        self.assertEqual(counts["interpretation"], 39)

    def test_every_row_has_nonempty_text(self) -> None:
        rows = load_three_tier_gold()
        for r in rows:
            self.assertTrue(r["text"], msg=f"empty text for {r['article_title']}")

    def test_tier_label_map_is_the_documented_mapping(self) -> None:
        self.assertEqual(THREE_TIER_LABEL_MAP, {"1": "data", "2": "close", "3": "interpretation"})


if __name__ == "__main__":
    unittest.main()
