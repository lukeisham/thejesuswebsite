#!/usr/bin/env python3
"""Tests for section-awareness gating (Plan 4 — rows 20/22/23)."""
import sys, unittest
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_RANK_DIR = (
    _SCRIPT_DIR.parent.parent
    / "setup" / "SKILLS" / "!TheJesusWebsite-Wikipedia" / "scripts"
)
sys.path.insert(0, str(_RANK_DIR))

import rank_engine


class TestSectionAwarenessGating(unittest.TestCase):
    """Tests for section-exclusion behavior on rows 20/22/23."""

    def setUp(self):
        self.labels = ["data", "interpretation", "close", "other", "interpretation"]
        self.bucket_labels = {"TestArticle": {"paragraphs": self.labels}}

    # ── OT-NT gating (row 20) ──────────────────────────────────────────

    def test_otnt_excludes_data_hit(self):
        """OT-NT hit in data paragraph sets _otnt_in_data flag."""
        sig = {
            "paragraph_hits": {
                "ot_nt": [True, False, False, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertTrue(sig.get("_otnt_in_data"))

    def test_otnt_does_not_flag_interpretation_hit(self):
        """OT-NT hit only in interpretation does NOT set _otnt_in_data."""
        sig = {
            "paragraph_hits": {
                "ot_nt": [False, True, False, False, True],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_otnt_in_data"))

    def test_otnt_no_hits(self):
        """_otnt_in_data is False when there are no OT-NT hits."""
        sig = {
            "paragraph_hits": {
                "ot_nt": [False, False, False, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_otnt_in_data"))

    def test_otnt_without_paragraph_hits(self):
        """_otnt_in_data is False when no paragraph_hits at all."""
        sig = {}
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_otnt_in_data"))

    # ── Supernatural criticism gating (row 22) ─────────────────────────

    def test_supernatural_excludes_data_hit(self):
        """Supernatural hit in data paragraph sets _super_in_data flag."""
        sig = {
            "paragraph_hits": {
                "supernatural": [True, False, False, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertTrue(sig.get("_super_in_data"))

    def test_supernatural_does_not_flag_interpretation(self):
        """Supernatural hit in interpretation does NOT set _super_in_data."""
        sig = {
            "paragraph_hits": {
                "supernatural": [False, True, False, False, True],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_super_in_data"))

    def test_supernatural_in_close_flags(self):
        """Supernatural hit in close paragraph sets _super_in_data."""
        sig = {
            "paragraph_hits": {
                "supernatural": [False, False, True, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertTrue(sig.get("_super_in_data"))

    # ── Miracle criticism gating (row 22 absorbed) ─────────────────────

    def test_miracle_excludes_data_hit(self):
        """Miracle criticism hit in data paragraph sets _miracle_in_data."""
        sig = {
            "paragraph_hits": {
                "miracle_criticism": [True, False, False, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertTrue(sig.get("_miracle_in_data"))

    def test_miracle_does_not_flag_interpretation(self):
        """Miracle criticism in interpretation does NOT set _miracle_in_data."""
        sig = {
            "paragraph_hits": {
                "miracle_criticism": [False, True, False, False, True],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_miracle_in_data"))

    # ── Confessional balance gating (row 17) ───────────────────────────

    def test_critical_outside_interp_when_in_data(self):
        """_critical_outside_interp is True when critical scholar is in data."""
        sig = {
            "paragraph_hits": {
                "critical_scholar": [True, False, False, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertTrue(sig.get("_critical_outside_interp"))

    def test_critical_outside_interp_when_in_other(self):
        """_critical_outside_interp is True when in other paragraph."""
        sig = {
            "paragraph_hits": {
                "critical_scholar": [False, False, False, True, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertTrue(sig.get("_critical_outside_interp"))

    def test_critical_inside_interp_only(self):
        """_critical_outside_interp is False when only in interpretation."""
        sig = {
            "paragraph_hits": {
                "critical_scholar": [False, True, False, False, True],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_critical_outside_interp"))

    def test_critical_no_hits(self):
        """_critical_outside_interp is False when no critical scholar hits."""
        sig = {
            "paragraph_hits": {
                "critical_scholar": [False, False, False, False, False],
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        self.assertFalse(sig.get("_critical_outside_interp"))

    # ── Edge cases ─────────────────────────────────────────────────────

    def test_none_bucket_labels(self):
        """No crash and flag not set when bucket_labels is None."""
        sig = {"paragraph_hits": {"ot_nt": [True]}}
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", None)
        # Early return means key is absent; downstream uses .get("key", False).
        self.assertIsNone(sig.get("_otnt_in_data"))

    def test_missing_article(self):
        """No crash and flag not set when article is not in bucket_labels."""
        sig = {"paragraph_hits": {"supernatural": [True]}}
        rank_engine._resolve_placement_into_sig(sig, "Missing", self.bucket_labels)
        # Early return means key is absent; downstream uses .get("key", False).
        self.assertIsNone(sig.get("_super_in_data"))

    def test_missing_paragraphs_key(self):
        """No crash and flag not set when bucket_labels entry has no paragraphs."""
        sig = {"paragraph_hits": {"miracle_criticism": [True]}}
        bad_labels = {"TestArticle": {"tier": 10}}
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", bad_labels)
        # Early return means key is absent; downstream uses .get("key", False).
        self.assertIsNone(sig.get("_miracle_in_data"))

    def test_length_mismatch(self):
        """Handles unequal hit/label lengths gracefully."""
        sig = {
            "paragraph_hits": {
                "ot_nt": [True, True, True, True, True, True, True],  # longer than labels
            }
        }
        rank_engine._resolve_placement_into_sig(sig, "TestArticle", self.bucket_labels)
        # Should not crash; first 5 hits are checked
        self.assertTrue(sig.get("_otnt_in_data"))


if __name__ == "__main__":
    unittest.main()
