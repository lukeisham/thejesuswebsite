// File-system operation wrappers.
// Every fs call is wrapped so raw system errors (ENOENT, EACCES, ENOSPC)
// are caught and mapped to Category 3 error codes instead of crashing the
// request or leaking internal paths.
//
// The write helper uses a temp-file-then-rename strategy so partial writes
// from a mid-write crash never leave corrupted files at the target path.
//
// JS-2: defensive — validate inputs, handle every errno, clean up temp files.
// JS-3: focused functions, no unnecessary class abstractions.

const fs = require("fs");
const path = require("path");
const ERRORS = require("./error-codes");
const { lookup, responseBody, httpStatus } = require("./error-codes");

/**
 * Safely read a file synchronously.
 *
 * @param {string} filePath — absolute or relative path to the file
 * @returns {{ ok: true, data: string } | { ok: false, code: string }}
 */
function safeReadFile(filePath) {
  if (typeof filePath !== "string" || !filePath) {
    return { ok: false, code: "E-PERSIST-012" };
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    return { ok: true, data };
  } catch (err) {
    console.error(`Failed to read "${filePath}":`, err.message);
    return { ok: false, code: mapFsError(err) };
  }
}

/**
 * Safely write data to a file using a temp-file-then-atomic-rename pattern.
 *
 * Data is first written to a `.tmp-<timestamp>` sibling file. Only after the
 * write completes is the temp file renamed over the target — so a crash
 * between write and rename leaves a stale temp file instead of a corrupted
 * target. Stale temp files are cleaned up on the next successful write to
 * the same path.
 *
 * @param {string} filePath — target file path
 * @param {string | Buffer} data — content to write
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
function safeWriteFile(filePath, data) {
  if (typeof filePath !== "string" || !filePath) {
    return { ok: false, code: "E-PERSIST-010" };
  }

  const dir = path.dirname(filePath);
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.tmp-${Date.now()}`,
  );

  try {
    fs.writeFileSync(tmpPath, data, { flush: true });
    fs.renameSync(tmpPath, filePath);
    return { ok: true };
  } catch (err) {
    // Best-effort cleanup: if rename failed after a successful write, the
    // temp file is orphaned — remove it so it doesn't accumulate.
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_cleanupErr) {
      // Swallow cleanup errors — the primary failure is what matters.
    }

    console.error(`Failed to write "${filePath}":`, err.message);
    return { ok: false, code: mapFsError(err) };
  }
}

/**
 * Safely create a directory (and all missing parents).
 *
 * @param {string} dirPath — directory path to create
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
function safeMkdir(dirPath) {
  if (typeof dirPath !== "string" || !dirPath) {
    return { ok: false, code: "E-PERSIST-011" };
  }

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { ok: true };
  } catch (err) {
    console.error(`Failed to create directory "${dirPath}":`, err.message);
    return { ok: false, code: mapFsError(err) };
  }
}

/**
 * Build an Express error response from a failed IO guard outcome.
 * Convenience helper — routes can write a one-liner after a guard call.
 *
 * @param {import("express").Response} res
 * @param {string} code
 * @returns {void}
 */
function sendIoError(res, code) {
  const status = httpStatus(code);
  const body = responseBody(code);
  res.status(status).json(body);
}

// ── Internal error mapping ────────────────────────────────────────────────────

/**
 * Map a Node.js ErrnoException to a Category 3 persistence code.
 *
 * JS-2: guards against non-ErrnoException throwables (e.g. a bare string).
 *
 * @param {NodeJS.ErrnoException & { code?: string }} err
 * @returns {string} — a stable "E-PERSIST-XXX" code
 */
function mapFsError(err) {
  const errno = err && err.code ? String(err.code).toUpperCase() : "";

  switch (errno) {
    case "ENOENT":
      return "E-PERSIST-012"; // file not found
    case "EACCES":
    case "EPERM":
      return "E-PERSIST-010"; // permission denied
    case "ENOSPC":
      return "E-PERSIST-010"; // disk full
    case "EISDIR":
      return "E-PERSIST-009"; // expected a file, got a directory
    case "ENOTDIR":
    case "EEXIST":
      return "E-PERSIST-011"; // directory issues
    default:
      return "E-PERSIST-009"; // generic read/write failure
  }
}

module.exports = {
  safeReadFile,
  safeWriteFile,
  safeMkdir,
  sendIoError,
  mapFsError,
};
