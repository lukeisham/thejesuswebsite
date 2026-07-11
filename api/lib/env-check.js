// Startup environment validation.
// Fails fast with a clear message listing every missing required variable
// instead of letting the server boot and crash later with an obscure error
// deep inside some module.
//
// JS-2: never fail silently — throw immediately so the process manager
// (pm2 / systemd) can restart the process and the operator sees the problem.

/**
 * Validate that all required environment variables are set.
 * Throws if any are missing (JS-2: fail loudly at startup).
 *
 * Intended to be called from server.js before any module that reads
 * process.env at load time (after load-env has populated it from .env).
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
