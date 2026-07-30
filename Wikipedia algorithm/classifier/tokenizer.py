"""Hand-rolled WordPiece tokenizer for MiniLM (BERT vocabulary).

Pure-Python implementation — no `tokenizers` or `huggingface_hub` package.
At ~255 articles' worth of paragraphs this is not a performance-sensitive
path, and avoiding the `tokenizers` package keeps ~23 MB of transitive
dependencies out of the installed footprint.
"""

import re
import unicodedata
from pathlib import Path
from typing import Optional

import numpy as np

from .config import VOCAB_PATH, MAX_SEQ_LENGTH


class WordPieceTokenizer:
    """BERT-compatible WordPiece tokenizer using a vendored vocab.txt."""

    # Special tokens used by BERT / MiniLM
    CLS: str = "[CLS]"
    SEP: str = "[SEP]"
    UNK: str = "[UNK]"
    PAD: str = "[PAD]"
    MASK: str = "[MASK]"

    # Continuation prefix for sub-word pieces in WordPiece.
    CONT_PREFIX: str = "##"

    def __init__(self, vocab_path: Optional[Path] = None) -> None:
        """Load the vocabulary from a vendored vocab.txt.

        Args:
            vocab_path: Path to the BERT vocab.txt file. Defaults to the
                        vendored copy inside the classifier/model/ directory.
        """
        if vocab_path is None:
            vocab_path = VOCAB_PATH

        self._vocab: dict[str, int] = {}
        self._ids_to_tokens: dict[int, str] = {}
        self._load_vocab(vocab_path)

        # Pre-compute the special token IDs for fast lookup.
        self.cls_id: int = self._vocab.get(self.CLS, 101)
        self.sep_id: int = self._vocab.get(self.SEP, 102)
        self.unk_id: int = self._vocab.get(self.UNK, 100)
        self.pad_id: int = self._vocab.get(self.PAD, 0)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def encode(
        self,
        text: str,
        max_length: int = MAX_SEQ_LENGTH,
        add_special_tokens: bool = True,
    ) -> dict[str, np.ndarray]:
        """Tokenize text and return model-ready inputs.

        Args:
            text: The input text to tokenize.
            max_length: Maximum sequence length (including special tokens).
            add_special_tokens: Whether to prepend [CLS] and append [SEP].

        Returns:
            Dict with keys:
                input_ids:       (1, max_length) int64 array
                attention_mask:  (1, max_length) int64 array
                token_type_ids:  (1, max_length) int64 array (all zeros)
        """
        tokens = self.tokenize(text)

        if add_special_tokens:
            tokens = [self.CLS] + tokens + [self.SEP]

        # Truncate to max_length
        if len(tokens) > max_length:
            tokens = tokens[: max_length - 1] + [self.SEP]

        token_ids = [self._vocab.get(t, self.unk_id) for t in tokens]

        # Pad to max_length
        seq_len = len(token_ids)
        pad_len = max_length - seq_len

        input_ids = token_ids + [self.pad_id] * pad_len
        attention_mask = [1] * seq_len + [0] * pad_len
        token_type_ids = [0] * max_length

        return {
            "input_ids": np.array([input_ids], dtype=np.int64),
            "attention_mask": np.array([attention_mask], dtype=np.int64),
            "token_type_ids": np.array([token_type_ids], dtype=np.int64),
        }

    def tokenize(self, text: str) -> list[str]:
        """Tokenize text into WordPiece sub-tokens (no special tokens).

        Args:
            text: The input text.

        Returns:
            List of sub-word tokens.
        """
        # Normalize: lowercase, strip accents (BERT uncased).
        text = self._normalize(text)

        # Split on whitespace and punctuation.
        words = self._basic_tokenize(text)

        # WordPiece segmentation for each word.
        tokens: list[str] = []
        for word in words:
            tokens.extend(self._wordpiece_tokenize(word))

        return tokens

    def decode(self, token_ids: list[int], skip_special: bool = True) -> str:
        """Convert token IDs back to a readable string.

        Args:
            token_ids: List of token IDs.
            skip_special: Whether to omit special tokens.

        Returns:
            Reconstructed text.
        """
        tokens: list[str] = []
        for tid in token_ids:
            tok = self._ids_to_tokens.get(tid, self.UNK)
            if skip_special and tok in (self.CLS, self.SEP, self.PAD, self.MASK):
                continue
            tokens.append(tok)

        # Join: remove the ## prefix from continuation tokens.
        result: list[str] = []
        for tok in tokens:
            if tok.startswith(self.CONT_PREFIX):
                result.append(tok[len(self.CONT_PREFIX) :])
            else:
                if result:
                    result.append(" ")
                result.append(tok)
        return "".join(result)

    @property
    def vocab_size(self) -> int:
        """Number of tokens in the vocabulary."""
        return len(self._vocab)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load_vocab(self, path: Path) -> None:
        """Load a BERT vocab.txt file (one token per line, ordered by ID)."""
        if not path.exists():
            raise FileNotFoundError(
                f"Vocabulary file not found: {path}. "
                f"Run 'python download_model.py' from the classifier directory "
                f"to download the MiniLM model and vocabulary."
            )

        with open(path, "r", encoding="utf-8") as fh:
            for idx, line in enumerate(fh):
                token = line.rstrip("\n").rstrip("\r")
                self._vocab[token] = idx
                self._ids_to_tokens[idx] = token

    @staticmethod
    def _normalize(text: str) -> str:
        """Normalize text for BERT uncased: lowercase, strip accents."""
        text = text.lower()
        # NFKD decomposition then strip combining characters (accents).
        text = unicodedata.normalize("NFKD", text)
        text = "".join(ch for ch in text if not unicodedata.combining(ch))
        return text

    @staticmethod
    def _basic_tokenize(text: str) -> list[str]:
        """Split text into words on whitespace and punctuation.

        Chinese/Japanese/Korean characters are each treated as a separate
        token (consistent with BERT's BasicTokenizer).
        """
        # Split on whitespace first.
        words: list[str] = []
        for word in text.split():
            # Handle CJK characters — each is its own token.
            if any("\u4e00" <= ch <= "\u9fff" or "\u3040" <= ch <= "\u30ff"
                   or "\uac00" <= ch <= "\ud7af" for ch in word):
                cjk_tokens: list[str] = []
                for ch in word:
                    if "\u4e00" <= ch <= "\u9fff" or "\u3040" <= ch <= "\u30ff" \
                       or "\uac00" <= ch <= "\ud7af":
                        if cjk_tokens:
                            words.append("".join(cjk_tokens))
                            cjk_tokens = []
                        words.append(ch)
                    else:
                        cjk_tokens.append(ch)
                if cjk_tokens:
                    words.append("".join(cjk_tokens))
            else:
                # Split on punctuation.
                sub_words = re.findall(r"[^\W\d_]+|\d+|\S", word)
                words.extend(sub_words)
        return [w for w in words if w]

    def _wordpiece_tokenize(self, word: str) -> list[str]:
        """Segment a single word into WordPiece sub-tokens using longest-match-first.

        If the word is not in the vocabulary, try progressively shorter
        prefixes, appending the ## continuation marker.
        """
        if word in self._vocab:
            return [word]

        tokens: list[str] = []
        start = 0
        while start < len(word):
            end = len(word)
            found = False
            while start < end:
                sub = word[start:end]
                prefixed = sub if start == 0 else self.CONT_PREFIX + sub
                if prefixed in self._vocab:
                    tokens.append(prefixed)
                    found = True
                    break
                end -= 1
            if not found:
                # No subword match found — use [UNK] for the whole word.
                return [self.UNK]
            start = end
        return tokens
