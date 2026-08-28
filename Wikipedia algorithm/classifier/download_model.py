#!/usr/bin/env python3
"""Download and vendor a quantized MiniLM ONNX model for the section classifier.

This script is a ONE-TIME setup step. It downloads the all-MiniLM-L6-v2 model
in ONNX format and its vocabulary file, placing them in the classifier's model/
directory.

Usage:
    python download_model.py

Requirements (for this script only, in a throwaway environment):
    pip install optimum[exporters] onnx onnxruntime sentence-transformers

The plan's runtime requirements.txt does NOT include these — the throwaway
environment is discarded after the export. The vendored ONNX file (~23 MB)
and vocab.txt (~110 KB) are all the runtime needs.

Alternatively, if optimum is not available, this script can download a
pre-exported ONNX model directly from the Hugging Face Hub.
"""

import argparse
import json
import logging
import shutil
import sys
from pathlib import Path
from typing import Optional
from urllib.request import urlretrieve

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# The model to vendor.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Direct download URLs for pre-exported ONNX files from Hugging Face Hub.
# These are from the optimum export repository.
ONNX_URL = (
    "https://huggingface.co/optimum/all-MiniLM-L6-v2/resolve/main/model.onnx"
)
VOCAB_URL = (
    "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/vocab.txt"
)


def get_model_dir() -> Path:
    """Return the target model directory."""
    return Path(__file__).resolve().parent / "model"


def download_file(url: str, dest: Path) -> None:
    """Download a file from a URL to a local path."""
    logger.info("Downloading %s ...", dest.name)
    dest.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(url, str(dest))
    size_mb = dest.stat().st_size / (1024 * 1024)
    logger.info("  Saved %s (%.1f MB)", dest.name, size_mb)


def export_via_optimum(model_dir: Path) -> bool:
    """Export the MiniLM model to ONNX using optimum-cli.

    Returns True on success, False if the tool is not available.
    """
    try:
        import subprocess
        result = subprocess.run(
            [
                sys.executable, "-m", "optimum.exporters.onnx",
                "--model", MODEL_NAME,
                "--task", "feature-extraction",
                "--opset", "14",
                "--framework", "pt",
                str(model_dir),
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            logger.error("optimum-cli failed:\n%s", result.stderr)
            return False

        # optimum-cli may name the file differently; rename to model.onnx.
        onnx_files = list(model_dir.glob("*.onnx"))
        if onnx_files:
            target = model_dir / "model.onnx"
            if onnx_files[0] != target:
                shutil.move(str(onnx_files[0]), str(target))

        # Copy the vocab file from sentence-transformers cache or download it.
        _copy_vocab(model_dir)
        return True

    except ImportError:
        return False
    except (OSError, subprocess.SubprocessError):
        logger.exception("Export via optimum failed.")
        return False


def _copy_vocab(model_dir: Path) -> None:
    """Copy the vocab.txt from the sentence-transformers cache or download it."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(MODEL_NAME)
        tokenizer = model.tokenizer
        if hasattr(tokenizer, "vocab_file") and tokenizer.vocab_file:
            src = Path(tokenizer.vocab_file)
            if src.exists():
                shutil.copy(str(src), str(model_dir / "vocab.txt"))
                logger.info("Copied vocab.txt from sentence-transformers cache.")
                return
    except (ImportError, OSError, RuntimeError):
        # Best-effort local cache lookup; any failure here just falls
        # through to the direct download below.
        pass

    # Fallback: download directly.
    download_file(VOCAB_URL, model_dir / "vocab.txt")


def download_direct(model_dir: Path) -> bool:
    """Download pre-exported ONNX model and vocab directly from Hugging Face Hub.

    Returns True on success.
    """
    try:
        download_file(ONNX_URL, model_dir / "model.onnx")
        download_file(VOCAB_URL, model_dir / "vocab.txt")

        # Verify the ONNX file is valid.
        try:
            import onnxruntime as ort
            session = ort.InferenceSession(
                str(model_dir / "model.onnx"),
                providers=["CPUExecutionProvider"],
            )
            inputs = session.get_inputs()
            outputs = session.get_outputs()
            logger.info("ONNX model validated: %d input(s), %d output(s)",
                         len(inputs), len(outputs))
        except ImportError:
            logger.warning("onnxruntime not installed — skipping validation.")

        return True

    except OSError:
        logger.exception("Direct download failed.")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download and vendor the MiniLM ONNX model."
    )
    parser.add_argument(
        "--method",
        choices=["direct", "optimum", "auto"],
        default="auto",
        help="Download method: direct (HuggingFace Hub), "
             "optimum (local export via optimum-cli), or auto (try both).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing model files.",
    )
    args = parser.parse_args()

    model_dir = get_model_dir()

    # Check existing files.
    onnx_path = model_dir / "model.onnx"
    vocab_path = model_dir / "vocab.txt"
    if onnx_path.exists() and vocab_path.exists() and not args.force:
        logger.info(
            "Model files already exist at %s. Use --force to overwrite.",
            model_dir,
        )
        return

    model_dir.mkdir(parents=True, exist_ok=True)

    success = False

    if args.method in ("direct", "auto"):
        logger.info("Attempting direct download from Hugging Face Hub...")
        success = download_direct(model_dir)

    if not success and args.method in ("optimum", "auto"):
        logger.info("Attempting export via optimum-cli...")
        success = export_via_optimum(model_dir)

    if success:
        logger.info("Model files ready at %s", model_dir)
        logger.info("  model.onnx:  %s", "✓" if onnx_path.exists() else "✗")
        logger.info("  vocab.txt:   %s", "✓" if vocab_path.exists() else "✗")
    else:
        logger.error(
            "Failed to obtain model files. Manual steps:\n"
            "  1. Install optimum: pip install optimum[exporters] onnx\n"
            "  2. Export: optimum-cli export onnx --model %s "
            "--task feature-extraction model/\n"
            "  3. Copy vocab.txt from sentence-transformers cache to model/",
            MODEL_NAME,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
