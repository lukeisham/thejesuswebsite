"""Trained paragraph head: a small linear classifier on paragraph embeddings.

The store-based scorers compare a paragraph with exemplar stores and pick a
class from four similarity scores. Those scores hold little signal about
the class (issue #231). The head reads the full embedding of the paragraph
instead. It is a softmax regression: one weight row and one bias per class.

`scripts/train_paragraph_head.py` trains the weights and writes them to
`classifier/paragraph-head.json`. This module only loads that file and
predicts. It needs numpy only.
"""

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

from .config import PARAGRAPH_HEAD_PATH


@dataclass(frozen=True)
class ParagraphHead:
    """Weights of the trained head.

    Attributes:
        classes: Label for each weight row, for example "data".
        coef: Array of shape (n_classes, embedding_dim).
        intercept: Array of shape (n_classes,).
    """

    classes: tuple[str, ...]
    coef: np.ndarray
    intercept: np.ndarray

    @property
    def embedding_dim(self) -> int:
        return int(self.coef.shape[1])

    def predict_proba(self, embeddings: np.ndarray) -> np.ndarray:
        """Return class probabilities, shape (n_paragraphs, n_classes)."""
        if embeddings.ndim != 2 or embeddings.shape[1] != self.embedding_dim:
            raise ValueError(
                f"Expected embeddings of shape (n, {self.embedding_dim}), "
                f"got {embeddings.shape}."
            )
        logits = embeddings @ self.coef.T + self.intercept
        logits = logits - logits.max(axis=1, keepdims=True)
        exp = np.exp(logits)
        return exp / exp.sum(axis=1, keepdims=True)

    def with_intercept_shift(self, label: str, shift: float) -> "ParagraphHead":
        """Return a copy whose intercept for `label` is raised by `shift`.

        A positive shift makes that class win more often. This raises its
        recall and lowers its precision. The training script uses it to set
        the recall of the interpretation class.

        Raises:
            ValueError: If `label` is not one of the head's classes.
        """
        if label not in self.classes:
            raise ValueError(f"Unknown class {label!r}; have {self.classes}.")
        shifted = self.intercept.copy()
        shifted[self.classes.index(label)] += shift
        return ParagraphHead(
            classes=self.classes, coef=self.coef, intercept=shifted,
        )

    def predict_labels(self, embeddings: np.ndarray) -> list[str]:
        """Return the most likely label for each embedding."""
        if len(embeddings) == 0:
            return []
        winners = self.predict_proba(embeddings).argmax(axis=1)
        return [self.classes[i] for i in winners]


def parse_paragraph_head(payload: dict) -> ParagraphHead:
    """Build a head from the JSON payload that the training script writes.

    Raises:
        ValueError: If the payload has no weights, or the shapes disagree.
    """
    try:
        classes = tuple(payload["classes"])
        coef = np.asarray(payload["coef"], dtype=np.float64)
        intercept = np.asarray(payload["intercept"], dtype=np.float64)
    except KeyError as exc:
        raise ValueError(f"Paragraph head payload lacks {exc}.") from exc

    if coef.ndim != 2 or coef.shape[0] != len(classes):
        raise ValueError(
            f"coef shape {coef.shape} does not match {len(classes)} classes."
        )
    if intercept.shape != (len(classes),):
        raise ValueError(
            f"intercept shape {intercept.shape} does not match "
            f"{len(classes)} classes."
        )
    return ParagraphHead(classes=classes, coef=coef, intercept=intercept)


@lru_cache(maxsize=None)
def load_paragraph_head(path: Path = PARAGRAPH_HEAD_PATH) -> ParagraphHead:
    """Load the trained head from disk. The result is cached per path.

    Raises:
        FileNotFoundError: If the weights file does not exist. Run
            `python scripts/train_paragraph_head.py` to create it.
    """
    if not path.exists():
        raise FileNotFoundError(
            f"Paragraph head weights not found: {path}. "
            f"Run 'python scripts/train_paragraph_head.py' first."
        )
    with open(path, "r", encoding="utf-8") as fh:
        return parse_paragraph_head(json.load(fh))
