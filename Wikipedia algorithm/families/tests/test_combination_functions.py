"""Unit tests for the combination functions (Shapes A/B/C/D)."""

import unittest

from families.combination_functions.shape_a import shape_a_score
from families.combination_functions.shape_b import shape_b_score
from families.combination_functions.shape_c import shape_c_score
from families.combination_functions.shape_d import shape_d_tiered, shape_d_boolean


class TestShapeA(unittest.TestCase):
    """Tests for Shape A — distinct-pattern count."""

    def test_no_fires(self) -> None:
        scored = [
            {"fires": False, "is_strong": False, "matched_exemplar_id": "a"},
        ]
        result = shape_a_score(scored, per_hit_weight=2)
        self.assertEqual(result["contribution"], 0)
        self.assertEqual(result["distinct_fires"], 0)

    def test_two_fires_weight_2(self) -> None:
        scored = [
            {"fires": True, "is_strong": False, "matched_exemplar_id": "a"},
            {"fires": True, "is_strong": False, "matched_exemplar_id": "b"},
        ]
        result = shape_a_score(scored, per_hit_weight=2)
        self.assertEqual(result["contribution"], 4)  # 2 × 2
        self.assertEqual(result["distinct_fires"], 2)

    def test_cap_applied(self) -> None:
        scored = [
            {"fires": True, "is_strong": False, "matched_exemplar_id": f"x{i}"}
            for i in range(10)
        ]
        result = shape_a_score(scored, per_hit_weight=2, cap=6)
        self.assertEqual(result["contribution"], 6)

    def test_representative_bonus(self) -> None:
        """2+ strong hits → ×2 bonus applied."""
        scored = [
            {"fires": True, "is_strong": True, "matched_exemplar_id": "a"},
            {"fires": True, "is_strong": True, "matched_exemplar_id": "b"},
        ]
        result = shape_a_score(
            scored, per_hit_weight=2, strength_multiplier=2,
            require_strong_for_bonus=2,
        )
        # 2 distinct × 2 weight × 2 bonus = 8
        self.assertEqual(result["contribution"], 8)
        self.assertTrue(result["bonus_applied"])

    def test_bonus_not_applied_when_below_threshold(self) -> None:
        """Only 1 strong hit — bonus NOT applied."""
        scored = [
            {"fires": True, "is_strong": True, "matched_exemplar_id": "a"},
            {"fires": True, "is_strong": False, "matched_exemplar_id": "b"},
        ]
        result = shape_a_score(
            scored, per_hit_weight=2, strength_multiplier=2,
            require_strong_for_bonus=2,
        )
        self.assertEqual(result["contribution"], 4)  # 2 × 2, no bonus
        self.assertFalse(result["bonus_applied"])


class TestShapeB(unittest.TestCase):
    """Tests for Shape B — list counts with modifiers."""

    def test_basic_without_modifiers(self) -> None:
        result = shape_b_score(
            name_count=3, per_name_weight=3, name_cap=10,
            total_cap=0, placement_multiplier=1.0,
            balanced_debate_score=5,
        )
        self.assertEqual(result["contribution"], 9)

    def test_placement_multiplier_double(self) -> None:
        result = shape_b_score(
            name_count=2, per_name_weight=3, name_cap=10,
            total_cap=0, placement_multiplier=2.0,
            balanced_debate_score=5,
        )
        self.assertEqual(result["contribution"], 12)  # 6 × 2

    def test_placement_multiplier_half(self) -> None:
        result = shape_b_score(
            name_count=3, per_name_weight=3, name_cap=10,
            total_cap=0, placement_multiplier=0.5,
            balanced_debate_score=5,
        )
        # 9 × 0.5 = 4.5 → truncate toward zero → 4
        self.assertEqual(result["contribution"], 4)

    def test_truncation_toward_zero(self) -> None:
        """Fractional results are truncated toward zero (§12.1)."""
        result = shape_b_score(
            name_count=1, per_name_weight=3, name_cap=10,
            total_cap=0, placement_multiplier=0.5,
            balanced_debate_score=5,
        )
        # 3 × 0.5 = 1.5 → truncate → 1
        self.assertEqual(result["contribution"], 1)

    def test_negative_total_cap(self) -> None:
        result = shape_b_score(
            name_count=5, per_name_weight=3, name_cap=10,
            total_cap=-16, placement_multiplier=1.0,
            balanced_debate_score=5,
        )
        # 5×3 = 15, capped at 10, no placement mod, capped at -16 → stays 10
        # Actually total_cap is -16, so max() → 10 since 10 > -16
        self.assertEqual(result["contribution"], 10)

    def test_imbalance_surcharge(self) -> None:
        """Imbalance surcharge −2 when balanced-debate = 0."""
        result = shape_b_score(
            name_count=2, per_name_weight=3, name_cap=10,
            total_cap=0, placement_multiplier=1.0,
            balanced_debate_score=0,
        )
        # 6 + (−2) = 4
        self.assertEqual(result["contribution"], 4)
        self.assertTrue(result["imbalance_applied"])

    def test_no_imbalance_surcharge(self) -> None:
        """No surcharge when balanced-debate > 0."""
        result = shape_b_score(
            name_count=2, per_name_weight=3, name_cap=10,
            total_cap=0, placement_multiplier=1.0,
            balanced_debate_score=3,
        )
        self.assertFalse(result["imbalance_applied"])


class TestShapeC(unittest.TestCase):
    """Tests for Shape C — structural boolean."""

    def test_two_stores_fire(self) -> None:
        result = shape_c_score(
            {"store_a": True, "store_b": True},
            true_weight=10, min_stores_required=2,
        )
        self.assertEqual(result["contribution"], 10)
        self.assertTrue(result["condition_met"])

    def test_only_one_store_fires(self) -> None:
        result = shape_c_score(
            {"store_a": True, "store_b": False},
            true_weight=10, min_stores_required=2,
        )
        self.assertEqual(result["contribution"], 0)
        self.assertFalse(result["condition_met"])

    def test_custom_min_stores(self) -> None:
        result = shape_c_score(
            {"a": True, "b": False, "c": False},
            true_weight=5, min_stores_required=1,
        )
        self.assertEqual(result["contribution"], 5)


class TestShapeD(unittest.TestCase):
    """Tests for Shape D — tiered presence."""

    def test_store_fires_parable_tier(self) -> None:
        result = shape_d_tiered(
            store_fires=True,
            tier_weights={"parable": 6, "other": 4},
            selected_tier="parable",
        )
        self.assertEqual(result["contribution"], 6)
        self.assertEqual(result["tier"], "parable")

    def test_store_does_not_fire(self) -> None:
        result = shape_d_tiered(
            store_fires=False,
            tier_weights={"parable": 6, "other": 4},
        )
        self.assertEqual(result["contribution"], 0)
        self.assertIsNone(result["tier"])

    def test_boolean_shape_d_all(self) -> None:
        result = shape_d_boolean(
            {"a": True, "b": True},
            require_all=True, true_weight=3,
        )
        self.assertEqual(result["contribution"], 3)

    def test_boolean_shape_d_any_fails(self) -> None:
        result = shape_d_boolean(
            {"a": True, "b": False},
            require_all=True, true_weight=3,
        )
        self.assertEqual(result["contribution"], 0)

    def test_boolean_shape_d_or(self) -> None:
        result = shape_d_boolean(
            {"a": True, "b": False},
            require_all=False, true_weight=3,
        )
        self.assertEqual(result["contribution"], 3)


if __name__ == "__main__":
    unittest.main()
