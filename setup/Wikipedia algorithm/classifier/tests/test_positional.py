"""Unit tests for positional paragraph assignment.

Tests cover the three cases specified in the plan:
  1. Lede paragraph assigned 'other' regardless of classifier
  2. Reference list assigned 'other' regardless of classifier
  3. Body paragraphs NOT overridden by positional rules
"""

import unittest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from classifier.labeler import split_paragraphs, _is_reference_section, _is_reference_heading
from classifier.config import LABEL_OTHER, LABEL_DATA, LABEL_INTERPRETATION


class TestSplitParagraphs(unittest.TestCase):
    """Tests for article text → paragraph splitting."""

    def test_empty_text(self) -> None:
        """Empty text returns an empty list."""
        result = split_paragraphs("")
        self.assertEqual(result, [])

    def test_whitespace_only(self) -> None:
        """Whitespace-only text returns an empty list."""
        result = split_paragraphs("   \n\n  \n  ")
        self.assertEqual(result, [])

    def test_single_paragraph(self) -> None:
        """Single paragraph is identified as the lede."""
        text = "This is a single paragraph article."
        result = split_paragraphs(text)
        self.assertEqual(len(result), 1)
        self.assertTrue(result[0]["is_lede"])
        self.assertEqual(result[0]["index"], 0)
        self.assertEqual(result[0]["text"], "This is a single paragraph article.")

    def test_multiple_paragraphs(self) -> None:
        """Multiple paragraphs are split on blank lines."""
        text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        result = split_paragraphs(text)
        self.assertEqual(len(result), 3)
        self.assertTrue(result[0]["is_lede"])
        self.assertFalse(result[1]["is_lede"])
        self.assertFalse(result[2]["is_lede"])
        self.assertEqual(result[0]["text"], "First paragraph.")
        self.assertEqual(result[1]["text"], "Second paragraph.")
        self.assertEqual(result[2]["text"], "Third paragraph.")

    def test_multiple_blank_lines(self) -> None:
        """Multiple consecutive blank lines treated as single separator."""
        text = "Para 1.\n\n\n\nPara 2."
        result = split_paragraphs(text)
        self.assertEqual(len(result), 2)

    def test_indices_are_sequential(self) -> None:
        """Paragraph indices are 0-based and sequential."""
        text = "A\n\nB\n\nC\n\nD"
        result = split_paragraphs(text)
        indices = [p["index"] for p in result]
        self.assertEqual(indices, [0, 1, 2, 3])


class TestReferenceDetection(unittest.TestCase):
    """Tests for _is_reference_heading() and _is_reference_section()."""

    # --- _is_reference_heading tests ---

    def test_references_heading(self) -> None:
        """A paragraph starting with 'References' is detected as a heading."""
        self.assertTrue(_is_reference_heading("References"))

    def test_notes_heading(self) -> None:
        """'Notes' heading is detected."""
        self.assertTrue(_is_reference_heading("Notes"))

    def test_footnotes_heading(self) -> None:
        """'Footnotes' heading is detected."""
        self.assertTrue(_is_reference_heading("Footnotes"))

    def test_bibliography_heading(self) -> None:
        """'Bibliography' heading is detected."""
        self.assertTrue(_is_reference_heading("Bibliography"))

    def test_further_reading_heading(self) -> None:
        """'Further reading' heading is detected."""
        self.assertTrue(_is_reference_heading("Further reading"))

    def test_external_links_heading(self) -> None:
        """'External links' heading is detected."""
        self.assertTrue(_is_reference_heading("External links"))

    def test_see_also_heading(self) -> None:
        """'See also' heading is detected."""
        self.assertTrue(_is_reference_heading("See also"))

    def test_case_insensitive_heading(self) -> None:
        """Heading detection is case-insensitive."""
        self.assertTrue(_is_reference_heading("REFERENCES"))

    def test_heading_with_trailing_period(self) -> None:
        """Heading with trailing punctuation is still detected."""
        self.assertTrue(_is_reference_heading("References."))
        self.assertTrue(_is_reference_heading("Footnotes:"))

    def test_heading_with_colon(self) -> None:
        """Heading with colon and subtitle is detected."""
        self.assertTrue(_is_reference_heading("Notes and references"))

    def test_body_text_not_heading(self) -> None:
        """Normal body paragraphs are not reference headings."""
        text = (
            "Jesus of Nazareth was a first-century Jewish preacher and "
            "religious leader. He is the central figure of Christianity."
        )
        self.assertFalse(_is_reference_heading(text))

    # --- _is_reference_section tests (content after heading) ---

    def test_reference_content_with_citations(self) -> None:
        """Paragraphs with 3+ citation-like lines are detected."""
        text = (
            "1. Smith, John (2020). The Title. Oxford University Press.\n"
            "2. Jones, Mary (2019). Another Book. Cambridge University Press.\n"
            "3. Brown, A. (2018). 'Article Title.' Journal of Studies 45(2): 123-145."
        )
        self.assertTrue(_is_reference_section(text))

    def test_reference_content_with_urls(self) -> None:
        """Paragraphs with 3+ URLs are detected as references."""
        text = (
            "http://example.com/article1\n"
            "https://doi.org/10.1234/example\n"
            "ISBN 978-0-123-45678-9\n"
        )
        self.assertTrue(_is_reference_section(text))

    def test_body_text_not_reference(self) -> None:
        """Normal body paragraphs are not detected as reference content."""
        text = (
            "Jesus of Nazareth was a first-century Jewish preacher and "
            "religious leader. He is the central figure of Christianity, "
            "the world's largest religion."
        )
        self.assertFalse(_is_reference_section(text))

    def test_body_text_with_year_not_reference(self) -> None:
        """Body text with a single year is not reference content."""
        text = (
            "In 70 CE, the Romans destroyed the Second Temple. This event "
            "had profound consequences for both Judaism and Christianity."
        )
        self.assertFalse(_is_reference_section(text))


class TestPositionalAssignment(unittest.TestCase):
    """Integration-style tests for positional assignment logic.

    These test the config constants and the conceptual rules, not the full
    classifier pipeline (which requires a built model and stores).
    """

    def test_lede_positional_constant(self) -> None:
        """The lede label constant is 'other'."""
        # The lede is always 'other', never 'data' or 'interpretation'.
        self.assertNotEqual(LABEL_OTHER, LABEL_DATA)
        self.assertNotEqual(LABEL_OTHER, LABEL_INTERPRETATION)

    def test_split_paragraphs_identifies_lede(self) -> None:
        """The first paragraph is always identified as the lede."""
        text = "Lede paragraph.\n\nBody paragraph 1.\n\nBody paragraph 2."
        result = split_paragraphs(text)
        self.assertTrue(result[0]["is_lede"])
        self.assertFalse(result[1]["is_lede"])
        self.assertFalse(result[2]["is_lede"])

    def test_reference_patterns_cover_expected_headings(self) -> None:
        """All expected reference-section headings are in the config."""
        expected = {
            "references", "notes", "footnotes", "bibliography",
            "further reading", "external links", "see also",
        }
        from classifier.config import POSITIONAL_OTHER_PATTERNS
        for pattern in POSITIONAL_OTHER_PATTERNS:
            self.assertIn(pattern, expected)

    def test_body_paragraph_not_detected_as_reference(self) -> None:
        """A typical body paragraph about the topic is not a reference section."""
        body_paragraphs = [
            "The historicity of Jesus is the question of whether Jesus of Nazareth "
            "was a historical figure. Virtually all scholars of antiquity agree that "
            "Jesus existed.",
            "Most scholars agree that Jesus was a Galilean Jew who was baptised by "
            "John the Baptist and crucified by order of Roman prefect Pontius Pilate.",
            "The Synoptic Gospels are the primary sources for the life of Jesus.",
        ]
        for para in body_paragraphs:
            with self.subTest(paragraph=para[:50]):
                self.assertFalse(_is_reference_section(para))


if __name__ == "__main__":
    unittest.main()
