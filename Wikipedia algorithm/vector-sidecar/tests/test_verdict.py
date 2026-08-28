"""Unit tests for vector-sidecar/app.py's compute_verdict().

compute_verdict() isolates the nearest-neighbour-label rule from the FastAPI
route, so it can be exercised directly without a running server, model, or
FAISS store. Follows the project's unittest pattern (matching
classifier/tests/, not a pytest-only style).
"""

import unittest
import sys
from pathlib import Path

# Put the vector-sidecar directory on the path so `import app` resolves and
# app's own flat imports (embedder, families, store) work too.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import compute_verdict


class TestComputeVerdict(unittest.TestCase):
    """Tests for the nearest-neighbour-label verdict rule."""

    def test_strong_fire_on_positive_nearest(self) -> None:
        """Nearest positive at/above T_STRONG (0.70) → strong_fire."""
        verdict = compute_verdict([
            {"type": "positive", "similarity": 0.90},
        ])
        self.assertEqual(verdict.label, "strong_fire")
        self.assertEqual(verdict.nearest_neighbour_type, "positive")
        self.assertEqual(verdict.similarity, 0.90)

    def test_fire_on_positive_between_thresholds(self) -> None:
        """Positive between T_FIRE (0.55) and T_STRONG → fire."""
        verdict = compute_verdict([
            {"type": "positive", "similarity": 0.60},
        ])
        self.assertEqual(verdict.label, "fire")
        self.assertEqual(verdict.nearest_neighbour_type, "positive")

    def test_no_fire_on_weak_positive(self) -> None:
        """Positive below T_FIRE → no_fire."""
        verdict = compute_verdict([
            {"type": "positive", "similarity": 0.40},
        ])
        self.assertEqual(verdict.label, "no_fire")
        self.assertEqual(verdict.nearest_neighbour_type, "positive")

    def test_strong_negative_kills_verdict(self) -> None:
        """A negative nearest at/above NN_NEGATIVE_THRESHOLD (0.75) never
        fires, even when a strong positive is also present."""
        verdict = compute_verdict([
            {"type": "negative", "similarity": 0.80},
            {"type": "positive", "similarity": 0.95},
        ])
        self.assertEqual(verdict.label, "no_fire")
        self.assertEqual(verdict.nearest_neighbour_type, "negative")
        self.assertEqual(verdict.similarity, 0.80)

    def test_weak_negative_does_not_kill_verdict(self) -> None:
        """A negative below the suppression threshold is ignored — the
        nearest positive's similarity drives the verdict."""
        verdict = compute_verdict([
            {"type": "negative", "similarity": 0.50},
            {"type": "positive", "similarity": 0.85},
        ])
        self.assertEqual(verdict.label, "strong_fire")
        self.assertEqual(verdict.nearest_neighbour_type, "negative")
        self.assertEqual(verdict.similarity, 0.85)

    def test_no_positive_results(self) -> None:
        """Only negatives present (none strong enough to suppress) → no_fire."""
        verdict = compute_verdict([
            {"type": "negative", "similarity": 0.50},
        ])
        self.assertEqual(verdict.label, "no_fire")
        self.assertEqual(verdict.nearest_neighbour_type, "negative")
        self.assertEqual(verdict.similarity, 0.50)


if __name__ == "__main__":
    unittest.main()
