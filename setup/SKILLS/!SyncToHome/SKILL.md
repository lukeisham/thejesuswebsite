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
5. Collect the local-only additions (see "Local-only additions" below). Write them as the bundle for Step 5.
6. Show Luke Part 2 in full, with `<SHA>` filled in. Do not shorten it. Leave out Step 5 if there are no additions.

The script pushes the work to a `claude/send-…` branch. The workflow
`.github/workflows/promote-claude-branch.yml` tests the work and merges it into
`main`. The script waits up to 10 minutes. Then the site deploys by itself.

## Local-only additions

Git does not carry gitignored files to GitHub or to the home computer. Examples
are `setup/ISSUES/issues.md`, `setup/PLANS/`, `setup/CHECKLISTS/`, `scratchpad.md` and
`CLAUDE.local.md`. If the cloud session wrote text that belongs in one of these
files, or would have, put that text in the bundle. Luke pastes it into Terminal.

Build the bundle with these rules:

1. Run `git check-ignore -v <path>` for each target path. If git does not ignore the path, commit the text as a normal file instead. Do not put it in the bundle.
2. Add to an existing file with `cat >> <path> <<'EOF'`. Never overwrite a file.
3. Create a new file with `cat > <path> <<'EOF'`, after `set -o noclobber`. The shell then refuses to replace a file that exists.
4. Never delete, move or overwrite anything under `setup/`. `CLAUDE.local.md` forbids it.
5. Use one `cat` command for each target file. Quote the heredoc word `'EOF'` with single quotes, so the shell does not change the text. If the text contains a line that is only `EOF`, use `EOF_BUNDLE` for that block.
6. Put all commands in one block. Start the block with `cd` to the project folder, so the block works from any folder.
7. End the block with a `tail -n 3` command for each file, so Luke can see the text arrived.
8. Write the text itself in simple English, as `CLAUDE.local.md` requires.

### Issues

The issue log `setup/ISSUES/issues.md` is a local-only file with its own rules. The
cloud session cannot see the file, so it cannot know the next row number. The home
computer must choose the number. Follow these rules:

1. Never write a row number in the bundle. Never refer to a new issue by number in the reply. Refer to it by its file and its title.
2. Write each new issue on one line, in this form: `files ~~ issue ~~ rule ~~ plan`. Use `none` for the plan if no plan exists. Do not use `~~` inside a cell.
3. Escape each literal `|` inside a cell as `\|`.
4. Use the issue block below. It adds the number, the date and the status `open`, and it adds the rows directly after the last row.
5. If the new work fixes an issue that is already in the log, do not edit the old row in the bundle. Tell Luke the old issue number if you know it. Tell Luke to ask Claude on the home computer to change its status to `resolved`.

The issue block:

```bash
cd /Users/lukeishammacbookair/Developer/thejesuswebsite
f=setup/ISSUES/issues.md
[ -n "$(tail -c1 "$f")" ] && echo >> "$f"
n=$(grep -oE '^\| [0-9]+ ' "$f" | tr -dc '0-9\n' | sort -n | tail -1)
awk -F'~~' -v n="$n" -v d="$(date +%F)" '{
  for (i = 1; i <= 4; i++) gsub(/^ +| +$/, "", $i)
  n++
  printf "| %d | %s | %s | %s | %s | %s | open |\n", n, $1, $2, $3, $4, d
}' >> "$f" <<'EOF'
api/routes/example.js ~~ What is wrong, in simple English. ~~ API-6 ~~ none
EOF
tail -n 2 "$f"
```

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
git rev-parse --short HEAD && git rev-parse --short origin/main && git status -sb
```

All three results must be true:

1. The two commit codes are the same.
2. Both codes equal `<SHA>`, the code that the cloud session gave you.
3. The status line is `## main...origin/main` with no file lines.

If all three are true, the home computer matches GitHub `main`. The git sync is complete.

### Step 5. Paste the local-only additions

Do this step only if the cloud session gave you a bundle. Run it after Step 4, so that the pulled files are in place first. Paste the whole bundle into Terminal at once. The bundle looks like this:

```bash
cd /Users/lukeishammacbookair/Developer/thejesuswebsite
set -o noclobber
cat >> scratchpad.md <<'EOF'
(the text for the note)
EOF
tail -n 3 scratchpad.md
```

Make sure that the `tail` output shows the new text at the end of each file. If a command prints `cannot overwrite existing file`, the file already exists. Nothing was changed. Ask Claude for an append command instead.

## Problems

| Result | Cause | What to do |
| :-- | :-- | :-- |
| `cd: no such file or directory` | The folder is somewhere else. | Find the project folder, and use its path. |
| `FAILED: cannot fast-forward main` | Local commits that GitHub lacks, or edits that clash with the new files. | Stop. Do not run `git reset` or `git pull --force`. Ask Claude on the home computer. |
| `skipped: checked out '…', not main` | Another branch is open. | Run `git switch main`. Then run Step 3 again. |
| The two codes in Step 4 differ | More work reached `main` after the cloud session printed `<SHA>`. | Run Step 3 again. Then run Step 4 again. |
| The cloud script timed out | A test failed or the merge conflicts. `main` did not change. | Open the run "Promote claude branch to main" under Actions on GitHub. |
