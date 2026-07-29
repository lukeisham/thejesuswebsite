#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="${1:-$SCRIPT_DIR/../classifier/model/model.onnx}"

# Pre-exported ONNX model from Hugging Face Hub (optimum/all-MiniLM-L6-v2).
MODEL_URL="https://huggingface.co/optimum/all-MiniLM-L6-v2/resolve/main/model.onnx"
EXPECTED_SHA256="4a64cee3d4134bbdc86eed96e1a660efec58975417204ecfcf134140edb6e0e2"

echo "Downloading classifier model from Hugging Face Hub..."
mkdir -p "$(dirname "$OUTPUT")"
curl -fSL --progress-bar -o "$OUTPUT" "$MODEL_URL"

echo "Verifying SHA-256..."
ACTUAL_SHA256=$(shasum -a 256 "$OUTPUT" | awk '{print $1}')
if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
    echo "ERROR: SHA-256 mismatch!"
    echo "  Expected: $EXPECTED_SHA256"
    echo "  Got:      $ACTUAL_SHA256"
    rm -f "$OUTPUT"
    exit 1
fi

echo "Model downloaded and verified: $OUTPUT"
