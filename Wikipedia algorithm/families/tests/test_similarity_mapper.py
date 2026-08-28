"""Unit tests for the similarity-to-contribution mapper."""

import unittest

from families.similarity_mapper import (
    nearest_neighbour_score,
    count_distinct_fires,
    count_strong_hits,
    apply_cap,
)


class TestNearestNeighbourScore(unittest.TestCase):
    """Tests for the nearest-neighbour-label rule."""

    def test_empty_results(self) -> None:
        self.assertEqual(nearest_neighbour_score([]), 0.0)

    def test_negative_nearest_kills_score(self) -> None:
        """Nearest neighbour is negative and above threshold → score = 0."""
        results = [
            {"type": "negative", "similarity": 0.85},
            {"type": "positive", "similarity": 0.60},
        ]
        self.assertEqual(nearest_neighbour_score(results), 0.0)

    def test_negative_nearest_below_threshold_ignored(self) -> None:
        """Negative nearest below threshold — does not kill the score."""
        results = [
            {"type": "negative", "similarity": 0.50},
            {"type": "positive", "similarity": 0.70},
        ]
        # Below NN_NEGATIVE_THRESHOLD (0.75), so only positives count.
        expected = 0.70  # mean of 0.70
        self.assertAlmostEqual(nearest_neighbour_score(results), expected, places=4)

    def test_all_positives(self) -> None:
        results = [
            {"type": "positive", "similarity": 0.80},
            {"type": "positive", "similarity": 0.60},
        ]
        expected = 0.70
        self.assertAlmostEqual(nearest_neighbour_score(results), expected, places=4)

    def test_no_positives(self) -> None:
        results = [
            {"type": "negative", "similarity": 0.55},
            {"type": "negative", "similarity": 0.50},
        ]
        # Nearest is negative but below threshold → no kill.
        # But there are no positives → score = 0.
        self.assertEqual(nearest_neighbour_score(results), 0.0)


class TestDistinctFireCounting(unittest.TestCase):
    """Tests for count_distinct_fires()."""

    def test_no_fires(self) -> None:
        scored = [
            {"fires": False},
            {"fires": False},
        ]
        self.assertEqual(count_distinct_fires(scored), 0)

    def test_simple_fire_count(self) -> None:
        scored = [
            {"fires": True, "matched_exemplar_id": "a"},
            {"fires": True, "matched_exemplar_id": "b"},
            {"fires": False},
        ]
        self.assertEqual(count_distinct_fires(scored), 2)

    def test_deduplication_by_exemplar(self) -> None:
        """Same exemplar firing twice → counted once."""
        scored = [
            {"fires": True, "matched_exemplar_id": "a"},
            {"fires": True, "matched_exemplar_id": "a"},
            {"fires": True, "matched_exemplar_id": "b"},
        ]
        self.assertEqual(count_distinct_fires(scored), 2)

    def test_no_deduplication(self) -> None:
        scored = [
            {"fires": True, "matched_exemplar_id": "a"},
            {"fires": True, "matched_exemplar_id": "a"},
        ]
        self.assertEqual(count_distinct_fires(scored, deduplicate_by_exemplar=False), 2)

    def test_none_exemplar_id(self) -> None:
        """Exemplar ID is None — each counts separately."""
        scored = [
            {"fires": True, "matched_exemplar_id": None},
            {"fires": True, "matched_exemplar_id": None},
        ]
        self.assertEqual(count_distinct_fires(scored), 2)


class TestStrongHitCounting(unittest.TestCase):
    """Tests for count_strong_hits()."""

    def test_no_strong(self) -> None:
        scored = [{"is_strong": False}, {"is_strong": False}]
        self.assertEqual(count_strong_hits(scored), 0)

    def test_some_strong(self) -> None:
        scored = [
            {"is_strong": True},
            {"is_strong": False},
            {"is_strong": True},
        ]
        self.assertEqual(count_strong_hits(scored), 2)


class TestApplyCap(unittest.TestCase):
    """Tests for apply_cap()."""

    def test_positive_cap(self) -> None:
        self.assertEqual(apply_cap(10, 6), 6)
        self.assertEqual(apply_cap(3, 6), 3)

    def test_negative_cap(self) -> None:
        self.assertEqual(apply_cap(-10, -6), -6)
        self.assertEqual(apply_cap(-3, -6), -3)

    def test_zero_cap(self) -> None:
        self.assertEqual(apply_cap(5, 0), 5)


if __name__ == "__main__":
    unittest.main()
