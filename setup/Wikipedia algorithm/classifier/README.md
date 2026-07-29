# Classifier model

## Provenance

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| Model       | `sentence-transformers/all-MiniLM-L6-v2`                              |
| Task        | feature-extraction (sentence embedding)                               |
| Upstream    | <https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2>       |
| ONNX export | <https://huggingface.co/optimum/all-MiniLM-L6-v2>                     |
| File        | `model.onnx`                                                          |
| Size        | 87 MB                                                                 |
| SHA-256     | `4a64cee3d4134bbdc86eed96e1a660efec58975417204ecfcf134140edb6e0e2`    |
| Vocab       | `vocab.txt` (226 KB, tracked in git)                                  |

## Why `model.onnx` is the only excluded file

At 87 MB, `model.onnx` is a third-party binary blob. It is fully reproducible
from the upstream Hugging Face Hub sources — it is not a hand-authored asset.
Shipping it via git would permanently bloat repository history. Every other
file in this directory (`vocab.txt`, `config.py`, `tokenizer.py`, `scorer.py`,
`labeler.py`, etc.) is human-authored source code under ~20 KB and is tracked.

## Recovery

```bash
# From the repo root:
bash setup/Wikipedia\ algorithm/scripts/fetch-classifier-model.sh
```

This downloads the pinned ONNX export from the Hugging Face Hub and verifies
its SHA-256. If the hash mismatches, the download is discarded and the script
exits with a non-zero status.
