#!/usr/bin/env bash
# pull-from-github.sh — bring local `main` up to date with `origin/main`, so work
# that reached GitHub from a cloud session (merged by
# .github/workflows/promote-claude-branch.yml) appears in this working copy.
#
# Run it by hand when you want cloud work in this working copy:
#   ./scripts/pull-from-github.sh
# It only fast-forwards. Local commits that GitHub does not have and uncommitted
# edits that clash with incoming changes stop the pull with a message, and
# nothing is overwritten.

set -euo pipefail

cd "$(dirname "$0")/.."

branch=$(git symbolic-ref --short HEAD)
if [[ "$branch" != "main" ]]; then
  echo "$(date '+%F %T') skipped: checked out '$branch', not main"
  exit 0
fi

git fetch --quiet origin main

if git merge --ff-only --quiet origin/main; then
  echo "$(date '+%F %T') ok: at $(git rev-parse --short HEAD)"
else
  echo "$(date '+%F %T') FAILED: cannot fast-forward main. Local commits that GitHub lacks, or edits that clash with incoming files. Resolve by hand." >&2
  exit 1
fi
