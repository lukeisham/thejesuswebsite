#!/bin/sh
# Setup development tooling after a fresh clone.
# Run once:  sh tools/setup.sh

set -e

echo "==> Configuring git hooks path..."
git config core.hooksPath .githooks
echo "    core.hooksPath = .githooks"
echo "    Done — pre-commit hooks are now active."
echo ""
echo "==> Setup complete."
