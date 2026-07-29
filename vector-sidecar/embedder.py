"""Self-contained MiniLM embedder for the vector sidecar.

Vendored (not imported) from setup/Wikipedia algorithm/classifier/
tokenizer.py + stores.py's Embedder class. This duplication is deliberate:
setup/ is gitignored and developer-machine-only (see
Wikipedia_alogrithm_refractor.md §3.2/§3.3) and never ships to the VPS, so
the sidecar — which does ship to the VPS via this repo's git history —
cannot import from it at runtime. Only the vector-stores data and the ONNX
model file travel to the VPS via rsync (scripts/sync-vector-stores.sh);
this file is the code needed to use them.

If the offline tokenizer/embedder logic changes, mirror the change here too.
"""

import re
import unicodedata
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    ort = None  # type: ignore[assignment]


class WordPieceTokenizer:
    """BERT-compatible WordPiece tokenizer using a vendored vocab.txt."""

    CLS: str = "[CLS]"
    SEP: str = "[SEP]"
    UNK: str = "[UNK]"
    PAD: str = "[PAD]"
    MASK: str = "[MASK]"
    CONT_PREFIX: str = "##"

    def __init__(self, vocab_path: Path) -> None:
        self._vocab: dict[str, int] = {}
        self._load_vocab(vocab_path)
        self.cls_id: int = self._vocab.get(self.CLS, 101)
        self.sep_id: int = self._vocab.get(self.SEP, 102)
        self.unk_id: int = self._vocab.get(self.UNK, 100)
        self.pad_id: int = self._vocab.get(self.PAD, 0)

    def encode(self, text: str, max_length: int) -> dict[str, np.ndarray]:
        tokens = [self.CLS] + self.tokenize(text) + [self.SEP]

        if len(tokens) > max_length:
            tokens = tokens[: max_length - 1] + [self.SEP]

        token_ids = [self._vocab.get(t, self.unk_id) for t in tokens]

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
        text = self._normalize(text)
        words = self._basic_tokenize(text)
        tokens: list[str] = []
        for word in words:
            tokens.extend(self._wordpiece_tokenize(word))
        return tokens

    def _load_vocab(self, path: Path) -> None:
        if not path.exists():
            raise FileNotFoundError(f"Vocabulary file not found: {path}")
        with open(path, "r", encoding="utf-8") as fh:
            for idx, line in enumerate(fh):
                token = line.rstrip("\n").rstrip("\r")
                self._vocab[token] = idx

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower()
        text = unicodedata.normalize("NFKD", text)
        return "".join(ch for ch in text if not unicodedata.combining(ch))

    @staticmethod
    def _basic_tokenize(text: str) -> list[str]:
        words: list[str] = []
        for word in text.split():
            if any(
                "一" <= ch <= "鿿" or "぀" <= ch <= "ヿ" or "가" <= ch <= "힯"
                for ch in word
            ):
                cjk_tokens: list[str] = []
                for ch in word:
                    if "一" <= ch <= "鿿" or "぀" <= ch <= "ヿ" or "가" <= ch <= "힯":
                        if cjk_tokens:
                            words.append("".join(cjk_tokens))
                            cjk_tokens = []
                        words.append(ch)
                    else:
                        cjk_tokens.append(ch)
                if cjk_tokens:
                    words.append("".join(cjk_tokens))
            else:
                words.extend(re.findall(r"[^\W\d_]+|\d+|\S", word))
        return [w for w in words if w]

    def _wordpiece_tokenize(self, word: str) -> list[str]:
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
                return [self.UNK]
            start = end
        return tokens


class Embedder:
    """Loads the vendored MiniLM ONNX model and embeds text into vectors."""

    def __init__(self, model_path: Path, vocab_path: Path, max_seq_length: int) -> None:
        if ort is None:
            raise ImportError("onnxruntime is not installed. Run 'pip install -r requirements.txt'.")

        if not model_path.exists():
            raise FileNotFoundError(f"ONNX model not found: {model_path}")

        ort.set_default_logger_severity(3)

        self._session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        self._tokenizer = WordPieceTokenizer(vocab_path)
        self._max_seq_length = max_seq_length

        self._input_names = [inp.name for inp in self._session.get_inputs()]
        self._output_name = self._session.get_outputs()[0].name

        output_shape = self._session.get_outputs()[0].shape
        self._dim = output_shape[-1] if output_shape else 384

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, text: str) -> np.ndarray:
        encoded = self._tokenizer.encode(text, max_length=self._max_seq_length)

        feed: dict[str, np.ndarray] = {}
        for name in self._input_names:
            if "attention" in name.lower() or "mask" in name.lower():
                feed[name] = encoded["attention_mask"]
            elif "token_type" in name.lower() or "segment" in name.lower():
                feed[name] = encoded["token_type_ids"]
            else:
                feed[name] = encoded["input_ids"]

        outputs = self._session.run([self._output_name], feed)
        hidden = outputs[0]  # (1, seq_len, dim)

        attention_mask = encoded["attention_mask"]
        mask_expanded = np.expand_dims(attention_mask.astype(np.float32), axis=-1)
        mask_expanded = np.broadcast_to(mask_expanded, hidden.shape)
        masked = hidden * mask_expanded
        summed = masked.sum(axis=1)
        counts = mask_expanded.sum(axis=1).clip(min=1e-9)
        mean_pooled = summed / counts

        norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-12)
        return (mean_pooled / norms).astype(np.float32)[0]
