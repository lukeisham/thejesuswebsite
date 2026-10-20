---
name: sync-to-home
description: >
  Hand cloud work to Luke's home computer. Read this when Luke asks the
  cloud session to "sync back to my computer", "sync with my Mac", "pull this
  to my home computer", or similar. It sends the work to GitHub main, then
  shows Luke the Terminal steps to pull it and make sure that it arrived.
type: Skill
status: Active
domain: Engineering
intent: "Get cloud work onto Luke's Mac with one send command in the cloud and a short checked pull in Terminal."
version: 1.0.0
dependencies: [scripts/send-to-main.sh, scripts/pull-from-github.sh]
calibration:
  context: Engineering
  level: Standard
  scope: Cloud and local
---

# Sync cloud work to the home computer

The cloud session cannot reach the home computer. Luke must run the pull in
Terminal. This skill sends the work to GitHub and then gives Luke the steps.

## Part 1 — What you do in the cloud session

1. Commit all work. If `git status --porcelain` shows files, commit them.
2. Run `./scripts/send-to-main.sh`.
3. If the script prints an error, show Luke the error and stop. Do not go to Part 2.
4. Read the commit that the script prints on the line `On GitHub main now:`. Call it `<SHA>`.
5. Show Luke Part 2 in full, with `<SHA>` filled in. Do not shorten it.

The script pushes the work to a `claude/send-…` branch. The workflow
`.github/workflows/promote-claude-branch.yml` tests the work and merges it into
`main`. The script waits up to 10 minutes. Then the site deploys by itself.

## Part 2 — What Luke does on the home computer

Show these steps to Luke exactly as written. Luke copies one block at a time.

### Step 1. Open the project folder

Open Terminal. Then run this command:

```bash
cd /Users/lukeishammacbookair/Developer/thejesuswebsite
```

Make sure that you are in the right folder:

```bash
pwd && git remote get-url origin
```

Expected output:

```
/Users/lukeishammacbookair/Developer/thejesuswebsite
https://github.com/lukeisham/thejesuswebsite.git
```

If the folder does not exist, stop. The project is in another folder on this computer. Find it, and use that path.

### Step 2. Look at the starting state

```bash
git status -sb
```

Expected first line: `## main...origin/main`. Read the result like this:

| You see | Do this |
| :-- | :-- |
| `## main...origin/main` and no file lines | Go to Step 3. |
| `## main...origin/main [behind N]` | Go to Step 3. |
| A branch name other than `main` | Run `git switch main`. Then run Step 2 again. |
| File lines that start with `M`, `A`, `D` or `??` | You have unsaved work. Stop. Ask Claude to help before you go on. |
| `[ahead N]` | You have local commits that GitHub lacks. Stop. Ask Claude to help before you go on. |

### Step 3. Pull

```bash
./scripts/pull-from-github.sh
```

Expected output: a line that ends with `ok: at <SHA>`. Under it, the new commits are listed.

If you see `FAILED: cannot fast-forward main`, do not force anything. Go to the problem table below.

### Step 4. Make sure that it arrived

```bash
git rev-parse --short HEAD origin/main && git status -sb
```

All three results must be true:

1. The two commit codes are the same.
2. Both codes equal `<SHA>`, the code that the cloud session gave you.
3. The status line is `## main...origin/main` with no file lines.

If all three are true, the home computer matches GitHub `main`. The sync is complete.

## Problems

| Result | Cause | What to do |
| :-- | :-- | :-- |
| `cd: no such file or directory` | The folder is somewhere else. | Find the project folder, and use its path. |
| `FAILED: cannot fast-forward main` | Local commits that GitHub lacks, or edits that clash with the new files. | Stop. Do not run `git reset` or `git pull --force`. Ask Claude on the home computer. |
| `skipped: checked out '…', not main` | Another branch is open. | Run `git switch main`. Then run Step 3 again. |
| The two codes in Step 4 differ | More work reached `main` after the cloud session printed `<SHA>`. | Run Step 3 again. Then run Step 4 again. |
| The cloud script timed out | A test failed or the merge conflicts. `main` did not change. | Open the run "Promote claude branch to main" under Actions on GitHub. |
