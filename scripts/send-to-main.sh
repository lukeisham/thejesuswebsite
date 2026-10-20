#!/usr/bin/env bash
# send-to-main.sh — the one command to run in a cloud session when its work is
# finished. It pushes the committed work to a claude/** branch, waits for
# .github/workflows/promote-claude-branch.yml to test and merge it into main,
# and then tells you the command to run on the dev machine.
#
# The cloud session cannot reach the dev machine. The last step is therefore
# scripts/pull-from-github.sh, run there by hand.
#
# Needs only git. The wait ends when origin/main contains your commit. If the
# tests fail or the merge conflicts, main does not move and this script times out.

set -euo pipefail

WAIT_SECONDS=600
POLL_SECONDS=10

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Uncommitted changes. Commit them first, then run this again." >&2
  git status --short >&2
  exit 1
fi

git fetch --quiet origin main
if git merge-base --is-ancestor HEAD origin/main; then
  echo "Nothing to send: origin/main already contains this commit."
  exit 0
fi

branch=$(git symbolic-ref --short HEAD)
created_branch=false
if [[ "$branch" == claude/* ]]; then
  target="$branch"
else
  target="claude/send-$(date +%Y%m%d-%H%M%S)"
  created_branch=true
fi

echo "Pushing $(git rev-parse --short HEAD) to $target"
git push origin "HEAD:refs/heads/$target"

echo "Waiting for the tests and the merge into main (up to ${WAIT_SECONDS}s)"
waited=0
until git fetch --quiet origin main && git merge-base --is-ancestor HEAD origin/main; do
  if (( waited >= WAIT_SECONDS )); then
    echo "main did not receive the commit within ${WAIT_SECONDS}s. A test failed or the merge conflicts." >&2
    echo "Read the run 'Promote claude branch to main' under Actions on GitHub. The work is safe on $target." >&2
    exit 1
  fi
  sleep "$POLL_SECONDS"
  waited=$((waited + POLL_SECONDS))
done

if [[ "$created_branch" == true ]]; then
  git push --quiet origin --delete "$target"
fi

echo "On GitHub main now: $(git rev-parse --short origin/main)"
echo "On your computer, run: ./scripts/pull-from-github.sh"
