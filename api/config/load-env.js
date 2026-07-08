// Dependency-free .env loader — parses KEY=VALUE lines from the project-root
// .env file using only Node built-ins (SR-2: no non-visual dependencies, per
// the project's hand-rolled cookie parser / rate limiter / WebAuthn pattern).
//
// Must be required *first* in the entry point, before any module that reads
// process.env at load time (config.js reads DB_PATH; routes/passkey.js reads
// RP_ID into a const). Requiring it after those modules is a silent no-op.
//
// JS-2: never overrides keys already present in process.env, so tests that
// set DB_PATH=:memory: before requiring config keep working. This also matches
// standard dotenv semantics.

const fs = require("fs");
const path = require("path");

// Resolve the .env file relative to the project root (one directory above api/).
const ENV_PATH = path.resolve(__dirname, "..", "..", ".env");

/**
 * Parse a single line from the .env file.
 * Returns [key, value] for a valid assignment, or null for blanks/comments.
 */
function parseLine(line) {
  // Skip blank lines and full-line comments.
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  // Find the first `=` — the key is everything before it, the value is
  // everything after (including any embedded `=` signs and trailing comments).
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) return null;

  const key = trimmed.slice(0, eqIdx).trim();
  if (!key) return null;

  let value = trimmed.slice(eqIdx + 1).trim();

  // Strip quotes (single or double) around the value.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

/**
 * Load .env into process.env. Does NOT override keys already present (JS-2).
 * Returns the number of keys loaded (0 if the file is missing or unreadable).
 */
function loadEnv() {
  let content;
  try {
    content = fs.readFileSync(ENV_PATH, "utf8");
  } catch (_err) {
    // File missing is not an error — tests and CI won't have one.
    return 0;
  }

  let count = 0;
  for (const line of content.split("\n")) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const [key, value] = parsed;
    // JS-2: only assign when not already in the environment, so tests that
    // pre-set DB_PATH=:memory: (or any other key) are never overridden.
    if (process.env[key] === undefined) {
      process.env[key] = value;
      count++;
    }
  }

  // JS-2: In production, refuse to boot without RP_ID and ORIGIN — the origin
  // and RP ID checks silently weaken without them, and a missing RP_ID also
  // breaks WebAuthn ceremony generation (challenge endpoints use it as a const).
  if (process.env.NODE_ENV === "production") {
    if (!process.env.RP_ID) {
      throw new Error(
        "FATAL: RP_ID is required in production (NODE_ENV=production). " +
          "Set it to the site's domain (e.g. thejesuswebsite.org) in .env.",
      );
    }
    if (!process.env.ORIGIN) {
      throw new Error(
        "FATAL: ORIGIN is required in production (NODE_ENV=production). " +
          "Set it to the site's full origin (e.g. https://thejesuswebsite.org) in .env.",
      );
    }
  }

  return count;
}

/**
 * Post-startup production check that runs after the credential model is loaded.
 * Warns when SETUP_TOKEN is set but registration is already closed (credentials
 * exist in the DB), which means the token is dead weight and should be removed.
 *
 * @param {() => number} countAll — credentialModel.countAll, injected to avoid a
 *   circular dependency at load time (load-env is required first, before models).
 */
function validateProdEnv(countAll) {
  if (!countAll || typeof countAll !== "function") return;
  if (process.env.SETUP_TOKEN && countAll() > 0) {
    console.warn(
      "SETUP_TOKEN is set but at least one credential already exists — " +
        "registration is closed. Consider removing SETUP_TOKEN from .env.",
    );
  }
}

module.exports = loadEnv;
module.exports.validateProdEnv = validateProdEnv;
