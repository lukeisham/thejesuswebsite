// Throws one error that names every missing required variable, so a bad
// deploy fails with a full list instead of at the first read deep in a module.
//
// Must run after config/load-env has filled process.env from .env, and before
// any module that reads process.env at load time (JS-2).
//
// Nothing in api/ calls this. Startup checks are done by
// validateProdEnv in config/load-env.js, called from server.js.

/**
 * Throw if any required environment variable is unset or empty.
 *
 * @param {string[]} requiredVars — names of environment variables that must be set
 * @returns {void}
 * @throws {Error} when one or more required variables are absent
 *
 * @example
 * // In server.js, after require("./config/load-env")():
 * require("./lib/env-check").validateEnv(["RP_ID", "ORIGIN"]);
 */
function validateEnv(requiredVars) {
  if (!Array.isArray(requiredVars)) {
    throw new Error("FATAL: validateEnv expects an array of variable names.");
  }

  const missing = requiredVars.filter(function isMissing(name) {
    return !process.env[name];
  });

  if (missing.length > 0) {
    throw new Error(
      "FATAL: Missing required environment variables: " +
        missing.join(", ") +
        ".\n" +
        "Check your .env file or environment configuration.",
    );
  }
}

module.exports = { validateEnv };
