# Dependencies

Known vulnerable or outdated packages are found by a routine check, recorded in one log, and closed only after the installed version is proven on the live server.

**Source of truth:** `deploy.sh` — the only way packages reach the server. It wins any disagreement with this doc.
**Spans:** `deploy.sh`, `api/package.json`, `api/package-lock.json`, `mcp-server/package.json`, `mcp-server/package-lock.json`, `requirements.txt`, `Wikipedia algorithm/vector-sidecar/requirements.txt`, `scripts/sync-vector-sidecar.sh`, `api/tests/guide-dependencies.test.js` — change one, check the others.

## 1. Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| In `api/` and `mcp-server/`, the root entry of `package-lock.json` lists the same ranges as `package.json` | The server installs from the lock with `npm install --production` | A range changes and the lock does not. Each machine then resolves a different version |
| Every folder with a `package.json` has an `install_dependencies` call in `deploy.sh` | The server gets packages only through that call | A new folder works on the dev machine and fails on the server with "Cannot find module" |
| A fix for a vulnerable package raises the lowest version in its `package.json` range to the fixed release | A caret range admits every release from its lowest version up. The lock hides a low floor until the lock is rebuilt | A rebuilt lock installs a vulnerable release, and nothing fails |
| A log row closes only after the installed version is read on the server, not on the dev machine | The dev machine and the server hold different locks until a deploy finishes | The log says "resolved" while the server still runs the old version |
| A new major version, and any new dependency, needs Luke's sign-off and an entry in `setup/Decisions_log.md` (SR-2, CORE-4) | A major version changes behaviour, and no test fails when it does | An agent raises a major version to clear an audit finding and changes the behaviour of many routes |

Rows 1 and 2 are enforced by `api/tests/guide-dependencies.test.js` (TEST-10). The other rows are not.

## 2. Shape

The dependency log is the file Dependency_log.md in the local-only folder setup/DEPENDENCIES (D-065). It is not on GitHub, because the repository is public and the log lists open vulnerabilities. Its path is plain text here, so that `check-architecture-docs.js` does not look for a file that a clean clone does not have.

The log covers the npm packages of `api/` and `mcp-server/`, and the two Python `requirements.txt` files. `deploy.sh` installs the npm packages. The Python packages of the vector sidecar are installed by `scripts/sync-vector-sidecar.sh`, which a person runs again after `requirements.txt` changes (`ARCHITECTURE/wikipedia-ranking-pipeline.md`).

## 3. Extending it

1. Run `npm outdated` and `npm audit` in `api/` and in `mcp-server/`. For Python, run `pip list --outdated` inside the venv of the service.
2. Add one row to the log for each package that needs an update, with the next `DEP-NNN`. Add the row before you start the fix.
3. Fix it in its own commit: edit `package.json`, rebuild the lock, run the tests.
4. After the deploy, read the installed version on the server. Then change the row to `resolved`.

## 4. Not documented here

Current versions, advisory IDs and counts. They are in the log, in `package.json` and in the output of `npm audit`.
