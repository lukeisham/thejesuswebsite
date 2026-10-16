"""Numpy-only helpers that train the paragraph head.

`scripts/train_paragraph_head.py` calls these. The helpers hold no state and
read no files, so the unit tests can call them with small arrays.

scikit-learn is not a dependency of this project (SR-2). The fit below is a
softmax regression with L2 penalty, trained by accelerated gradient descent.
"""

import numpy as np


def fit_softmax_regression(
    features: np.ndarray,
    class_indexes: np.ndarray,
    n_classes: int,
    l2: float,
    class_weights: np.ndarray | None = None,
    n_iterations: int = 1500,
) -> tuple[np.ndarray, np.ndarray]:
    """Fit a multinomial logistic regression with Nesterov gradient descent.

    The loss is the weighted mean cross-entropy plus (l2 / 2) times the
    squared size of the weights. The intercepts are not penalised. The fit
    starts from zero and uses no random numbers, so the same input always
    gives the same weights.

    Args:
        features: Array of shape (n_rows, dim).
        class_indexes: Integer class of each row, shape (n_rows,).
        n_classes: Number of classes.
        l2: Strength of the L2 penalty on the weights.
        class_weights: Weight of each class, shape (n_classes,). Default: 1.
        n_iterations: Number of gradient steps.

    Returns:
        Tuple (coef, intercept) with shapes (n_classes, dim) and (n_classes,).
    """
    n_rows, dim = features.shape
    if class_weights is None:
        class_weights = np.ones(n_classes)
    row_weights = class_weights[class_indexes]
    row_weights = row_weights / row_weights.mean()

    targets = np.zeros((n_rows, n_classes))
    targets[np.arange(n_rows), class_indexes] = 1.0

    # The gradient is smooth. Its Lipschitz constant is at most
    # 0.5 * (largest row weight) * (largest eigenvalue of the feature
    # covariance, with the intercept column added) + l2.
    augmented = np.hstack([features, np.ones((n_rows, 1))])
    covariance = augmented.T @ augmented / n_rows
    lipschitz = 0.5 * row_weights.max() * np.linalg.eigvalsh(covariance)[-1] + l2
    step = 1.0 / lipschitz

    coef = np.zeros((n_classes, dim))
    intercept = np.zeros(n_classes)
    prev_coef, prev_intercept = coef.copy(), intercept.copy()

    for k in range(1, n_iterations + 1):
        momentum = (k - 1) / (k + 2)
        look_coef = coef + momentum * (coef - prev_coef)
        look_intercept = intercept + momentum * (intercept - prev_intercept)

        logits = features @ look_coef.T + look_intercept
        logits -= logits.max(axis=1, keepdims=True)
        probs = np.exp(logits)
        probs /= probs.sum(axis=1, keepdims=True)

        residual = (probs - targets) * row_weights[:, None] / n_rows
        grad_coef = residual.T @ features + l2 * look_coef
        grad_intercept = residual.sum(axis=0)

        prev_coef, prev_intercept = coef, intercept
        coef = look_coef - step * grad_coef
        intercept = look_intercept - step * grad_intercept

    return coef, intercept


def balanced_class_weights(class_indexes: np.ndarray, n_classes: int) -> np.ndarray:
    """Weight each class by the inverse of its frequency.

    A class with no rows gets weight 1, so the array never holds a
    division by zero.
    """
    counts = np.bincount(class_indexes, minlength=n_classes).astype(float)
    counts[counts == 0] = np.nan
    weights = len(class_indexes) / (n_classes * counts)
    return np.nan_to_num(weights, nan=1.0)


def assign_folds(fractions: list[float], n_folds: int) -> list[int]:
    """Turn stable per-article numbers in [0, 1) into fold numbers.

    Args:
        fractions: One number per article, for example a hash of its title.
        n_folds: Number of folds.

    Returns:
        Fold number in [0, n_folds) for each article.
    """
    return [min(int(f * n_folds), n_folds - 1) for f in fractions]
