"""Unit tests for the trained paragraph head and its use in the labeler."""

import json
import tempfile
import unittest
from pathlib import Path

import numpy as np

from classifier import labeler
from classifier.config import LABEL_DATA, LABEL_INTERPRETATION, LABEL_OTHER
from classifier.labeler import classify_paragraphs, positional_flags, split_paragraphs
from classifier.paragraph_head import (
    ParagraphHead,
    load_paragraph_head,
    parse_paragraph_head,
)

# Two classes on two axes: axis 0 is "data", axis 1 is "interpretation".
TWO_CLASS_PAYLOAD = {
    "classes": [LABEL_DATA, LABEL_INTERPRETATION],
    "coef": [[5.0, 0.0], [0.0, 5.0]],
    "intercept": [0.0, 0.0],
}


class TestParagraphHead(unittest.TestCase):
    def setUp(self) -> None:
        self.head = parse_paragraph_head(TWO_CLASS_PAYLOAD)

    def test_predict_labels_picks_class_with_largest_score(self) -> None:
        embeddings = np.array([[1.0, 0.0], [0.0, 1.0], [0.2, 0.9]])
        self.assertEqual(
            self.head.predict_labels(embeddings),
            [LABEL_DATA, LABEL_INTERPRETATION, LABEL_INTERPRETATION],
        )

    def test_predict_proba_rows_sum_to_one(self) -> None:
        proba = self.head.predict_proba(np.array([[1.0, 0.0], [0.3, 0.3]]))
        np.testing.assert_allclose(proba.sum(axis=1), [1.0, 1.0])

    def test_predict_labels_of_no_embeddings_is_empty(self) -> None:
        self.assertEqual(self.head.predict_labels(np.empty((0, 2))), [])

    def test_wrong_embedding_size_raises(self) -> None:
        with self.assertRaises(ValueError):
            self.head.predict_proba(np.ones((1, 3)))

    def test_intercept_shift_makes_the_class_win_more_often(self) -> None:
        borderline = np.array([[0.9, 1.0]])  # interpretation wins by a little
        self.assertEqual(self.head.predict_labels(borderline), [LABEL_INTERPRETATION])
        boosted = self.head.with_intercept_shift(LABEL_DATA, 2.0)
        self.assertEqual(boosted.predict_labels(borderline), [LABEL_DATA])

    def test_intercept_shift_leaves_the_original_head_unchanged(self) -> None:
        self.head.with_intercept_shift(LABEL_DATA, 2.0)
        np.testing.assert_array_equal(self.head.intercept, [0.0, 0.0])

    def test_intercept_shift_of_unknown_class_raises(self) -> None:
        with self.assertRaises(ValueError):
            self.head.with_intercept_shift("close", 1.0)

    def test_missing_key_raises(self) -> None:
        with self.assertRaises(ValueError):
            parse_paragraph_head({"classes": ["data"], "coef": [[1.0]]})

    def test_shape_mismatch_raises(self) -> None:
        bad = dict(TWO_CLASS_PAYLOAD, intercept=[0.0])
        with self.assertRaises(ValueError):
            parse_paragraph_head(bad)

    def test_load_reads_weights_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "head.json"
            path.write_text(json.dumps(TWO_CLASS_PAYLOAD), encoding="utf-8")
            head = load_paragraph_head(path)
        self.assertEqual(head.classes, (LABEL_DATA, LABEL_INTERPRETATION))
        self.assertEqual(head.embedding_dim, 2)

    def test_load_missing_file_names_the_training_script(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(FileNotFoundError) as ctx:
                load_paragraph_head(Path(tmp) / "absent.json")
        self.assertIn("train_paragraph_head.py", str(ctx.exception))


class FakeEmbedder:
    """Maps a paragraph to a fixed vector: 'FACT' -> data, 'VIEW' -> interp."""

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        return np.array([
            [1.0, 0.0] if "FACT" in text else [0.0, 1.0] for text in texts
        ])


class FakeStoreManager:
    embedder = FakeEmbedder()

    def query_all_batch(self, *args, **kwargs):
        raise AssertionError("The head must not query the stores.")


class TestClassifyWithHead(unittest.TestCase):
    ARTICLE = "\n\n".join([
        "Lede FACT paragraph.",
        "Body FACT paragraph.",
        "Body VIEW paragraph.",
        "References",
        "After references VIEW paragraph.",
    ])

    def setUp(self) -> None:
        self._original_loader = labeler.load_paragraph_head
        labeler.load_paragraph_head = lambda: parse_paragraph_head(TWO_CLASS_PAYLOAD)

    def tearDown(self) -> None:
        labeler.load_paragraph_head = self._original_loader

    def test_body_paragraphs_get_head_labels(self) -> None:
        labelled = classify_paragraphs(
            self.ARTICLE, FakeStoreManager(), scoring_rule="head")
        self.assertEqual(
            [p["label"] for p in labelled],
            [LABEL_OTHER, LABEL_DATA, LABEL_INTERPRETATION,
             LABEL_OTHER, LABEL_OTHER],
        )

    def test_positional_paragraphs_are_marked(self) -> None:
        labelled = classify_paragraphs(
            self.ARTICLE, FakeStoreManager(), scoring_rule="head")
        self.assertEqual(
            [p["is_positional"] for p in labelled],
            [True, False, False, True, True],
        )

    def test_scores_hold_class_probabilities_for_body_paragraphs(self) -> None:
        labelled = classify_paragraphs(
            self.ARTICLE, FakeStoreManager(), scoring_rule="head")
        scores = labelled[1]["scores"]
        self.assertEqual(set(scores), {LABEL_DATA, LABEL_INTERPRETATION})
        self.assertAlmostEqual(sum(scores.values()), 1.0)
        self.assertGreater(scores[LABEL_DATA], scores[LABEL_INTERPRETATION])
        self.assertEqual(labelled[0]["scores"], {})

    def test_article_with_only_a_lede_needs_no_embedding(self) -> None:
        labelled = classify_paragraphs(
            "Only a lede.", FakeStoreManager(), scoring_rule="head")
        self.assertEqual([p["label"] for p in labelled], [LABEL_OTHER])


class TestPositionalFlags(unittest.TestCase):
    def test_lede_and_reference_section_are_flagged(self) -> None:
        paragraphs = split_paragraphs(
            "Lede.\n\nBody one.\n\nBody two.\n\nReferences\n\nCitation text.")
        self.assertEqual(
            positional_flags(paragraphs), [True, False, False, True, True])

    def test_article_without_references_flags_only_the_lede(self) -> None:
        paragraphs = split_paragraphs("Lede.\n\nBody one.\n\nBody two.")
        self.assertEqual(positional_flags(paragraphs), [True, False, False])


if __name__ == "__main__":
    unittest.main()
