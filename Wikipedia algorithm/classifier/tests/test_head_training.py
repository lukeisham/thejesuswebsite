"""Unit tests for the numpy helpers that train the paragraph head."""

import unittest

import numpy as np

from scripts.head_training import (
    assign_folds,
    balanced_class_weights,
    fit_softmax_regression,
)


def three_clusters() -> tuple[np.ndarray, np.ndarray]:
    """Three well separated clusters, 20 rows each, on three axes."""
    rng = np.random.default_rng(0)
    centers = np.eye(3)
    features = np.vstack([
        centers[k] + 0.05 * rng.standard_normal((20, 3)) for k in range(3)
    ])
    return features, np.repeat(np.arange(3), 20)


class TestFitSoftmaxRegression(unittest.TestCase):
    def test_learns_separable_classes(self) -> None:
        features, classes = three_clusters()
        coef, intercept = fit_softmax_regression(
            features, classes, 3, l2=1e-4, n_iterations=400)
        predicted = (features @ coef.T + intercept).argmax(axis=1)
        self.assertTrue((predicted == classes).all())

    def test_same_input_gives_same_weights(self) -> None:
        features, classes = three_clusters()
        first = fit_softmax_regression(features, classes, 3, l2=1e-3, n_iterations=50)
        second = fit_softmax_regression(features, classes, 3, l2=1e-3, n_iterations=50)
        np.testing.assert_array_equal(first[0], second[0])
        np.testing.assert_array_equal(first[1], second[1])

    def test_stronger_penalty_gives_smaller_weights(self) -> None:
        features, classes = three_clusters()
        weak, _ = fit_softmax_regression(features, classes, 3, l2=1e-4, n_iterations=300)
        strong, _ = fit_softmax_regression(features, classes, 3, l2=1.0, n_iterations=300)
        self.assertLess(np.abs(strong).sum(), np.abs(weak).sum())

    def test_class_weights_move_the_boundary_toward_the_heavy_class(self) -> None:
        # Overlapping 1-D classes: class 1 is rare. A big weight on class 1
        # must make the model predict class 1 more often.
        rng = np.random.default_rng(1)
        features = np.concatenate([
            rng.normal(0.0, 1.0, 180), rng.normal(1.0, 1.0, 20),
        ])[:, None]
        classes = np.array([0] * 180 + [1] * 20)
        plain = fit_softmax_regression(features, classes, 2, l2=1e-3, n_iterations=400)
        heavy = fit_softmax_regression(
            features, classes, 2, l2=1e-3,
            class_weights=np.array([1.0, 9.0]), n_iterations=400)

        def count_class_one(model: tuple[np.ndarray, np.ndarray]) -> int:
            return int(((features @ model[0].T + model[1]).argmax(axis=1) == 1).sum())

        self.assertGreater(count_class_one(heavy), count_class_one(plain))


class TestBalancedClassWeights(unittest.TestCase):
    def test_rarer_class_gets_larger_weight(self) -> None:
        weights = balanced_class_weights(np.array([0, 0, 0, 1]), 2)
        self.assertGreater(weights[1], weights[0])

    def test_class_with_no_rows_gets_weight_one(self) -> None:
        weights = balanced_class_weights(np.array([0, 0, 1, 1]), 3)
        self.assertEqual(weights[2], 1.0)
        self.assertFalse(np.isnan(weights).any())


class TestAssignFolds(unittest.TestCase):
    def test_maps_fractions_to_fold_numbers(self) -> None:
        self.assertEqual(assign_folds([0.0, 0.19, 0.2, 0.99], 5), [0, 0, 1, 4])

    def test_never_returns_the_fold_count(self) -> None:
        self.assertEqual(assign_folds([1.0], 5), [4])


if __name__ == "__main__":
    unittest.main()
