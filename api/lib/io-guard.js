// File-system wrappers that return `{ ok, ... }` outcomes instead of throwing.
// Callers: routes/uploads.js and services/page-generator.js. A caller picks its
// own E-* code or message instead of forwarding the code from here, which keeps
// raw errno values and file paths out of client responses.
//
// safeWriteFile writes to a sibling temp file and renames it over the target,
// so a crash mid-write never leaves a half-written file at the target path.

const fs = require("fs");
const path = require("path");
const { httpStatus, responseBody } = require("./error-codes");

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
 * Safely write data to a file with a temp-file-then-rename.
 *
 * The temp file is a `.<name>.tmp-<timestamp>` sibling in the same directory,
 * because rename is atomic only inside one file system. A crash between write
 * and rename leaves that temp file behind. Nothing removes it later.
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
    // A failed cleanup must not hide the original write error.
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_cleanupErr) {}

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
 * Send the standard error body for a failed guard outcome.
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
 * Not every throwable has a `.code`, so a bare string falls through to the
 * generic code (JS-2).
 *
 * @param {NodeJS.ErrnoException & { code?: string }} err
 * @returns {string} — a stable "E-PERSIST-XXX" code
 */
function mapFsError(err) {
  const errno = err && err.code ? String(err.code).toUpperCase() : "";

  switch (errno) {
    case "ENOENT":
      return "E-PERSIST-012";
    case "EACCES":
    case "EPERM":
    case "ENOSPC":
      return "E-PERSIST-010"; // the same code covers "cannot write" for both causes
    case "EISDIR":
      return "E-PERSIST-009";
    case "ENOTDIR":
    case "EEXIST":
      return "E-PERSIST-011";
    default:
      return "E-PERSIST-009";
  }
}

module.exports = {
  safeReadFile,
  safeWriteFile,
  safeMkdir,
  sendIoError,
  mapFsError,
};
