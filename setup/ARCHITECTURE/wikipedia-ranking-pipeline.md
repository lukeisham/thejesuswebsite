# Wikipedia ranking pipeline

The `/debate/wikipedia/` page ranks a **fixed canonical article list** (not an
auto-growing pool) by a hybrid keyword + FAISS-vector scoring rubric. Scoring
runs only on the developer machine; the VPS imports the finished export and
serves a live vector-classification endpoint alongside it.

**Source of truth:** `setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md` — wins any disagreement with this doc, including over the list's current size and the exact command set.
**Spans:** `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/{rank_engine.py,extract.js}`, `Wikipedia algorithm/` (CSVs, gold sets, vector stores, sidecar code), `database/scoring-export.json`, `api/scripts/import-wikipedia-scoring.js`, `api/lib/vector-sidecar-client.js`, `api/routes/wikipedia.js`, `frontend/assets/js/wikipedia.js`, `database/schema.sql` (`wikipedia_articles`, `wikipedia_article_signals`).

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Scoring never runs on the VPS (D-018) | `deploy.sh` is Node-only — no Python, pip, or venv in the deploy path | Someone wires a Python step into deploy and the next VPS provisioning silently lacks the runtime to run it |
| The article list only changes when Luke names an article (D-012) | An automatic top-up would re-pool and re-score articles that nobody asked to touch | The "fixed 255" list quietly drifts every time someone runs the wrong command |
| The vector classifier's paragraph labels are the *only* section buckets used by placement-sensitive signals | There is no heading-based fallback (D-012) | Reintroducing heading-based bucketing anywhere silently double-defines "what counts as data vs. interpretation" |
| The VPS sidecar serves stores from `/var/www/thejesuswebsite-vector-store/`, a sibling of the git working tree, refreshed by rsync (`scripts/sync-vector-stores.sh`); the small index/JSONL files are also tracked in git (deliberate, per `.gitignore` — versioned alongside the code), while the 87 MB ONNX model is gitignored and travels by rsync only | `git reset --hard` deploys wipe the working tree, never the sibling serving dir | Rebuilding stores locally without re-running the rsync leaves the VPS serving stale vectors — no error, just wrong classifications |

## Shape

- **The skill** (`setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md`) is the only supported entry point — it documents its own trigger phrases, step order, and command set (`check`/`add`/`remove`/`exclude`/`rescore` in `rank_engine.py`). Don't hand-invoke the scripts from memory; the skill's gate logic (e.g. "check never chains into add") is part of the contract.
- **`ALGORITHM_GUIDE_the_what.md`** (pool/selection criteria, weights table) and **`ALGORITHM_GUIDE_the_how.md`** (technical pipeline, per-signal detection) in `Wikipedia algorithm/` are the rubric's canonical spec — this doc does not restate signal weights or thresholds.
- **Export → import**: `rank_engine.py export` writes `database/scoring-export.json`; `api/scripts/import-wikipedia-scoring.js` validates every signal key against an allowlist, checks the sum invariant, and upserts into `wikipedia_articles` + `wikipedia_article_signals` at deploy time.
- **Serving**: `GET /api/wikipedia` feeds the grid widget (`wikipedia-quality-grid.md`); `POST /api/wikipedia/signal-check` proxies live text through `api/lib/vector-sidecar-client.js` to the Python FAISS sidecar (`127.0.0.1`-only, never public directly).

## Extending it

- **Adding/removing/excluding articles, or changing the rubric:** use the skill — do not run `rank_engine.py` subcommands directly unless you have read `skill.md`'s step order for that exact action.
- **Adding a new scoring signal:** update the weights table in `ALGORITHM_GUIDE_the_what.md` first, then the detector in `rank_engine.py`/`extract.js`, then the `KNOWN_SIGNAL_KEYS` allowlist in `import-wikipedia-scoring.js` — in that order, so the doc, the engine, and the import gate never disagree about what a valid signal key is.
- **Changing a vector family's threshold:** requires re-running calibration against its frozen gold set (see `ALGORITHM_GUIDE_the_how.md`) — thresholds are never hand-tuned without a calibration pass, and gold-set labels are never adjusted to match a threshold.

## Not documented here

Signal weights, thresholds, article/signal counts, disk footprints, the exact
category-flag list, and the gold-set methodology — all in
`Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md` and
`ALGORITHM_GUIDE_the_how.md`, which are the rubric's actual spec and change far
more often than this doc should.
