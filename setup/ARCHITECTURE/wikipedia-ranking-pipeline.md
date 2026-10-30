# Wikipedia ranking pipeline

The pipeline ranks a fixed list of Wikipedia articles on Jesus by how well each substantiates its content, then publishes the ranking on the site. Offline scoring makes the ranking. The server imports it.

The `/debate/wikipedia/` page shows the ranking. The list is canonical, not an auto-growing pool. The rubric mixes keyword and FAISS-vector signals. The VPS also serves a live vector-classification endpoint beside the imported export.

**Source of truth:** `setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md` — wins any disagreement with this doc, including the list size and the command set.
**Module:** Wikipedia algorithm (`Website_guide.md`, section 2). The list that the site shows is the Wikipedia list module (`wikipedia-quality-grid.md`).
**Spans:** `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/{rank_engine.py,extract.js}`, `Wikipedia algorithm/` (CSVs, gold sets, vector stores, paragraph head training in `scripts/`), `Wikipedia algorithm/vector-sidecar/`, `database/scoring-export.json`, `deploy.sh`, `api/scripts/import-wikipedia-scoring.js`, `api/lib/vector-sidecar-client.js`, `api/routes/wikipedia.js`, `ecosystem.config.js`, `scripts/sync-vector-stores.sh`, `scripts/sync-vector-sidecar.sh`, `frontend/assets/js/wikipedia.js`, `database/schema.sql` (`wikipedia_articles`, `wikipedia_article_signals`).

## 1. Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Scoring never runs on the VPS (D-018) | `deploy.sh` is Node-only — no Python, pip, or venv in the deploy path | Someone wires a Python step into deploy and the next VPS provisioning silently lacks the runtime to run it |
| The article list only changes when Luke names an article (D-012) | An automatic top-up would re-pool and re-score articles that nobody asked to touch | The fixed list quietly drifts every time someone runs the wrong command |
| The vector classifier's paragraph labels are the *only* section buckets used by placement-sensitive signals (D-012) | There is no heading-based fallback | Reintroducing heading-based bucketing anywhere silently double-defines "what counts as data vs. interpretation" |
| `database/scoring-export.json` is the complete article list for the VPS | `deploy.sh` runs the import with `--purge-missing` whenever the export or the import script changed. The import deletes articles whose URL is not in the export and overwrites title and rank | An article added or re-ranked in the admin is deleted or reset at the next deploy that re-imports. No error appears |
| The sidecar reads its stores from `/var/www/thejesuswebsite-vector-store/`, a sibling of the git working tree. `ecosystem.config.js` sets that path and `scripts/sync-vector-stores.sh` fills it with rsync | `git reset --hard` in each deploy rewrites the working tree and never touches a sibling directory | Rebuilding stores locally without re-running the rsync leaves the VPS serving stale vectors. The classifications are wrong and no error appears |
| Only `Wikipedia algorithm/classifier/paragraph-head.json` is loaded by `scoring_rule="head"`, and only `Wikipedia algorithm/scripts/train_paragraph_head.py` writes it. The experiment heads (`paragraph-head-twoclass-*.json`) are output and are never copied there without a logged decision. Guide test: `api/tests/guide-wikipedia-ranking-pipeline.test.js` | A script that writes the live head changes how every article is scored with no change to the scoring code | The scorer changes with no test failing and the ranking shifts at the next export |
| The ONNX model reaches the VPS by rsync only. `.gitignore` excludes it, while the small index and JSONL files are also tracked in git | `scripts/sync-vector-stores.sh` copies it from `Wikipedia algorithm/classifier/model` | A deploy alone never updates the model on the VPS |

## 2. Shape

- **Files of this module:** the module has no folder of its own for the files outside `Wikipedia algorithm/`. These are all its parts.

  | Part | Files |
  |---|---|
  | Fetching, classifying, scoring, ranking | `Wikipedia algorithm/` (Python scripts, classifier, gold sets, CSVs), `setup/SKILLS/!TheJesusWebsite-Wikipedia/` (`skill.md`, `rank_engine.py`, `extract.js`) |
  | Hand-off to the server | `database/scoring-export.json`, `api/scripts/import-wikipedia-scoring.js` |
  | Vector serving | `Wikipedia algorithm/vector-sidecar/`, `api/lib/vector-sidecar-client.js`, `scripts/sync-vector-stores.sh`, `scripts/sync-vector-sidecar.sh` |

  A file for fetching, classifying, scoring or ranking Wikipedia articles belongs in this module. The list page, its route and its model belong to the Wikipedia list module.
- **Entry point:** the skill (`skill.md`) is the only supported way to change the list or the rubric. It holds the trigger phrases, the step order and the gate logic.
- **Spec:** `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md` (selection criteria, weights table) and `ALGORITHM_GUIDE_the_how.md` (pipeline, per-signal detection). This doc does not restate weights or thresholds.
- **Flow:** `rank_engine.py export` writes `database/scoring-export.json`. `deploy.sh` imports it with `import-wikipedia-scoring.js`. `GET /api/wikipedia` serves it to the grid widget (`wikipedia-quality-grid.md`).
- **Head training (offline only):** `jev_pilot_label.py --engine jev --source corpus` sends every paragraph of the fetch cache to Jev (an outside API; its key is `JEV_API_KEY` in `.env`, and its raw output stays outside git). `train_agreement_head.py` reads that file, trains a two-class head on it and scores the head for the gate in `CLASSIFIER_DIAGNOSIS.md`. The gate metrics live in `Wikipedia algorithm/scripts/gate_metrics.py`. The labelling rules are in `DATA_INTERPRETATION_TIERS.md`, and `RUBRIC` in `Wikipedia algorithm/scripts/llm_prompts.py` and `JEV_CRITERIA` in `Wikipedia algorithm/scripts/jev_pilot_label.py` must say the same thing.
- **Sidecar:** `POST /api/wikipedia/signal-check` sends free text through `api/lib/vector-sidecar-client.js` to the Python FAISS sidecar. The sidecar listens on `127.0.0.1` only, so the Node API is the only way in.

## 3. Extending it

- **Adding, removing or excluding articles, or changing the rubric:** use the skill. Run `rank_engine.py` subcommands directly only after you read the step order in `skill.md` for that action.
- **Adding a scoring signal:** update the weights table in `ALGORITHM_GUIDE_the_what.md`, then the detector in `rank_engine.py` and `extract.js`, then `KNOWN_SIGNAL_KEYS` in `import-wikipedia-scoring.js`. In this order the doc, the engine and the import gate always agree on the valid signal keys.
- **Changing a vector family threshold:** re-run calibration against the frozen gold set (see `ALGORITHM_GUIDE_the_how.md`). Never tune a threshold by hand. Never change a gold-set label to fit a threshold.
- **Rebuilding vector stores:** run `scripts/sync-vector-stores.sh` after the rebuild.

## 4. Not documented here

Signal weights, thresholds, article and signal counts, the category-flag list and the
gold-set method are in `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md` and
`ALGORITHM_GUIDE_the_how.md`.
