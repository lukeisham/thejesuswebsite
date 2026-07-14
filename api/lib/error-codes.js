/**
 * Central error code registry.
 *
 * Category 1 — Ingestion Boundaries (Input).
 * Category 2 — Transformation Boundaries (Data Processing).
 * Category 3 — Persistence & I/O Boundaries (External Integration).
 * Category 4 — Egress Boundaries (Response & Output).
 *
 * Every error has a unique code, category, HTTP status, user-facing message,
 * technical detail, and severity. Route handlers import the codes they need
 * and pass them to the error-handler helper.
 *
 * @module lib/error-codes
 */

// ── Category 1: Ingestion Boundaries (Input) ──────────────────────────────────

const CATEGORY_1 = {
  // ── Body & payload validation ──────────────────────────────────────────────

  MISSING_BODY_FIELD: {
    code: "E-INPUT-001",
    category: 1,
    httpStatus: 400,
    message: "A required field is missing from your request.",
    detail: "One or more required fields were absent from the request body.",
    severity: "error",
  },

  INVALID_JSON: {
    code: "E-INPUT-002",
    category: 1,
    httpStatus: 400,
    message: "The request body contains invalid JSON.",
    detail: "The request body could not be parsed as valid JSON.",
    severity: "error",
  },

  PAYLOAD_TOO_LARGE: {
    code: "E-INPUT-003",
    category: 1,
    httpStatus: 413,
    message: "The request body exceeds the maximum allowed size.",
    detail: "The Content-Length header exceeded the configured limit.",
    severity: "error",
  },

  // ── Query / URL params ─────────────────────────────────────────────────────

  MISSING_QUERY_PARAM: {
    code: "E-INPUT-004",
    category: 1,
    httpStatus: 400,
    message: "A required query parameter is missing.",
    detail:
      "A query string parameter required by the endpoint was not provided.",
    severity: "error",
  },

  INVALID_NUMERIC_PARAM: {
    code: "E-INPUT-005",
    category: 1,
    httpStatus: 400,
    message: "A numeric parameter contains an invalid value.",
    detail:
      "A parameter expected to be a positive integer was missing, NaN, or out of range.",
    severity: "error",
  },

  INVALID_SLUG: {
    code: "E-INPUT-006",
    category: 1,
    httpStatus: 400,
    message:
      "The slug must contain only lowercase letters, numbers, and hyphens.",
    detail:
      "The provided slug did not match the required pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.",
    severity: "error",
  },

  INVALID_URL_PARAM: {
    code: "E-INPUT-007",
    category: 1,
    httpStatus: 400,
    message: "The URL parameter is invalid.",
    detail: "A URL path parameter was malformed or of the wrong type.",
    severity: "error",
  },

  // ── File uploads ───────────────────────────────────────────────────────────

  FILE_TOO_LARGE: {
    code: "E-INPUT-008",
    category: 1,
    httpStatus: 413,
    message: "The uploaded file exceeds the maximum allowed size.",
    detail: "The uploaded file size exceeded the server or application limit.",
    severity: "error",
  },

  UNSUPPORTED_FILE_TYPE: {
    code: "E-INPUT-009",
    category: 1,
    httpStatus: 400,
    message: "The uploaded file type is not supported.",
    detail: "The file MIME type or extension is not in the allowed list.",
    severity: "error",
  },

  INVALID_BASE64: {
    code: "E-INPUT-010",
    category: 1,
    httpStatus: 400,
    message: "The provided data is not valid base64.",
    detail:
      "A field expected to contain base64-encoded data failed validation.",
    severity: "error",
  },

  // ── Search / passage ───────────────────────────────────────────────────────

  INVALID_PASSAGE_FORMAT: {
    code: "E-INPUT-011",
    category: 1,
    httpStatus: 400,
    message: "The search or reference format is invalid.",
    detail:
      "The Bible passage reference or search query format could not be parsed.",
    severity: "error",
  },

  // ── Auth & sessions ────────────────────────────────────────────────────────

  MISSING_AUTH_TOKEN: {
    code: "E-INPUT-012",
    category: 1,
    httpStatus: 401,
    message: "Authentication is required to access this resource.",
    detail: "No valid authentication token or credential was provided.",
    severity: "error",
  },

  EXPIRED_SESSION: {
    code: "E-INPUT-013",
    category: 1,
    httpStatus: 401,
    message: "Your session has expired. Please log in again.",
    detail: "The session token has passed its expiry and is no longer valid.",
    severity: "error",
  },

  INVALID_SETUP_TOKEN: {
    code: "E-INPUT-014",
    category: 1,
    httpStatus: 403,
    message: "Access denied. Invalid setup credentials.",
    detail: "The SETUP_TOKEN header did not match the server-side value.",
    severity: "error",
  },

  NON_LOCAL_CONNECTION: {
    code: "E-INPUT-015",
    category: 1,
    httpStatus: 403,
    message: "This endpoint is only accessible from the local machine.",
    detail: "The request originated from a non-loopback IP address.",
    severity: "error",
  },

  INVALID_WEBAUTHN_ASSERTION: {
    code: "E-INPUT-016",
    category: 1,
    httpStatus: 401,
    message: "The security key verification failed.",
    detail: "The WebAuthn assertion response failed server-side verification.",
    severity: "error",
  },

  DUPLICATE_CREDENTIAL: {
    code: "E-INPUT-017",
    category: 1,
    httpStatus: 409,
    message: "This security key is already registered.",
    detail: "The credential ID already exists in the database.",
    severity: "error",
  },

  CHALLENGE_EXPIRED: {
    code: "E-INPUT-018",
    category: 1,
    httpStatus: 400,
    message: "The security challenge has expired. Please try again.",
    detail: "The WebAuthn challenge timestamp exceeded the allowed window.",
    severity: "error",
  },

  RATE_LIMITED: {
    code: "E-INPUT-019",
    category: 1,
    httpStatus: 429,
    message: "Too many requests. Please wait before trying again.",
    detail: "The client exceeded the configured rate limit for this endpoint.",
    severity: "warn",
  },

  MISSING_SESSION_COOKIE: {
    code: "E-INPUT-020",
    category: 1,
    httpStatus: 401,
    message: "No active session found. Please log in.",
    detail: "The session cookie was absent or could not be parsed.",
    severity: "error",
  },

  // ── Input format / constraints ─────────────────────────────────────────────

  EMPTY_SEARCH_QUERY: {
    code: "E-INPUT-021",
    category: 1,
    httpStatus: 400,
    message: "Please provide a search term.",
    detail: "The search query string was empty after trimming.",
    severity: "error",
  },

  INPUT_EXCEEDS_MAX_LENGTH: {
    code: "E-INPUT-022",
    category: 1,
    httpStatus: 400,
    message: "A field value exceeds the maximum allowed length.",
    detail:
      "A string field contained more characters than the configured maximum.",
    severity: "error",
  },

  INVALID_COORDINATES: {
    code: "E-INPUT-023",
    category: 1,
    httpStatus: 400,
    message: "The provided coordinates are invalid.",
    detail: "Latitude/longitude values were out of valid range or non-numeric.",
    severity: "error",
  },

  UNKNOWN_ENTITY_TYPE: {
    code: "E-INPUT-024",
    category: 1,
    httpStatus: 400,
    message: "The requested content type is not recognised.",
    detail: "The type parameter did not match any known content entity.",
    severity: "error",
  },

  LAST_CREDENTIAL_DELETION: {
    code: "E-INPUT-025",
    category: 1,
    httpStatus: 400,
    message: "Cannot remove the last security key. At least one must remain.",
    detail:
      "The operation would delete the only remaining WebAuthn credential.",
    severity: "error",
  },

  INVALID_DATE_FORMAT: {
    code: "E-INPUT-026",
    category: 1,
    httpStatus: 400,
    message: "The date format is invalid.",
    detail: "A date string could not be parsed into a valid Date object.",
    severity: "error",
  },

  MISSING_FILE: {
    code: "E-INPUT-027",
    category: 1,
    httpStatus: 400,
    message: "No file was provided for upload.",
    detail: "The upload endpoint received a request with no file attachment.",
    severity: "error",
  },

  MALFORMED_CACHED_DATA: {
    code: "E-INPUT-028",
    category: 1,
    httpStatus: 400,
    message: "Stored data is corrupted and could not be read.",
    detail: "Cached or embedded JSON data failed to parse or validate.",
    severity: "error",
  },

  PROXIED_REQUEST_REJECTED: {
    code: "E-INPUT-029",
    category: 1,
    httpStatus: 403,
    message: "Proxied requests are not permitted on this endpoint.",
    detail: "The X-Forwarded-For or similar header indicated a proxied origin.",
    severity: "warn",
  },

  NETWORK_ERROR: {
    code: "E-INPUT-030",
    category: 1,
    httpStatus: 0,
    message: "Could not reach the server. Check your connection.",
    detail: "The client-side fetch failed — no HTTP response was received.",
    severity: "error",
  },

  INVALID_CREDENTIAL_HANDLE: {
    code: "E-INPUT-031",
    category: 1,
    httpStatus: 400,
    message: "The credential handle is invalid.",
    detail:
      "The handle must contain only lowercase letters, numbers, underscores, and hyphens; cannot exceed 64 characters.",
    severity: "error",
  },

  MALFORMED_WEBAUTHN_DATA: {
    code: "E-INPUT-032",
    category: 1,
    httpStatus: 400,
    message: "The security key data is malformed.",
    detail:
      "The WebAuthn authenticator data is too short or does not contain expected fields.",
    severity: "error",
  },
};

// ── Category 2: Transformation Boundaries (Data Processing) ─────────────────

const CATEGORY_2 = {
  // ── String transformations ──────────────────────────────────────────────

  STRING_SPLIT_FAILURE: {
    code: "E-TRANSFORM-001",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A string split operation received invalid input and could not produce segments.",
    severity: "error",
  },

  LOWERCASE_TRANSFORM_FAILURE: {
    code: "E-TRANSFORM-002",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail: "A lowercase transformation received non-string input.",
    severity: "error",
  },

  SLUG_GENERATION_FAILURE: {
    code: "E-TRANSFORM-003",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "Slug generation produced an empty result from valid input — possible encoding issue.",
    severity: "error",
  },

  // ── Date transformations ────────────────────────────────────────────────

  DATE_PARSING_FAILURE: {
    code: "E-TRANSFORM-004",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A date string could not be parsed into a valid Date object during transformation.",
    severity: "warn",
  },

  DATE_FORMATTING_FAILURE: {
    code: "E-TRANSFORM-005",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A date formatting operation threw an error (possibly an unsupported locale).",
    severity: "error",
  },

  // ── Sort & comparison ───────────────────────────────────────────────────

  SORT_COMPARISON_FAILURE: {
    code: "E-TRANSFORM-006",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail: "A sort comparator produced NaN or threw during array sorting.",
    severity: "error",
  },

  // ── JSON operations ─────────────────────────────────────────────────────

  JSON_PARSE_FAILURE: {
    code: "E-TRANSFORM-007",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A JSON.parse operation failed on a string that was expected to be valid JSON.",
    severity: "error",
  },

  // ── URI / encoding ──────────────────────────────────────────────────────

  URI_ENCODING_FAILURE: {
    code: "E-TRANSFORM-008",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail: "A URI component encoding operation received invalid input.",
    severity: "error",
  },

  // ── Math / numeric ──────────────────────────────────────────────────────

  SAFE_DIVISION_FAILURE: {
    code: "E-TRANSFORM-009",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A division operation returned a fallback because the divisor was zero or operands were non-finite.",
    severity: "warn",
  },

  MAXIMUM_VALUE_FAILURE: {
    code: "E-TRANSFORM-010",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A max-value extraction found no finite numbers in the input array.",
    severity: "warn",
  },

  // ── Type coercion ───────────────────────────────────────────────────────

  NUMERIC_COERCION_FAILURE: {
    code: "E-TRANSFORM-011",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail: "A value could not be coerced to a number during transformation.",
    severity: "error",
  },

  // ── Array & object ──────────────────────────────────────────────────────

  ARRAY_TRANSFORM_FAILURE: {
    code: "E-TRANSFORM-012",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "An array transformation operation (map/filter/reduce) threw an error.",
    severity: "error",
  },

  OBJECT_MAPPING_FAILURE: {
    code: "E-TRANSFORM-013",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "An object key/value mapping operation failed — a required property was missing or the wrong type.",
    severity: "error",
  },

  // ── Template & interpolation ────────────────────────────────────────────

  TEMPLATE_INTERPOLATION_FAILURE: {
    code: "E-TRANSFORM-014",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A template variable interpolation failed — a required placeholder had no corresponding value.",
    severity: "error",
  },

  STRING_TRUNCATION_FAILURE: {
    code: "E-TRANSFORM-015",
    category: 2,
    httpStatus: 500,
    message: "An internal data processing step failed.",
    detail:
      "A string truncation or length-bound operation failed — the input was not a valid string.",
    severity: "error",
  },
};

// ── Category 3: Persistence & I/O Boundaries (External Integration) ──────────

const CATEGORY_3 = {
  // ── Database connection & query ──────────────────────────────────────────

  DB_CONNECTION_FAILURE: {
    code: "E-PERSIST-001",
    category: 3,
    httpStatus: 503,
    message: "The database is temporarily unavailable. Please try again later.",
    detail:
      "Database connection failure — the SQLite file could not be opened.",
    severity: "error",
  },

  SQL_QUERY_FAILURE: {
    code: "E-PERSIST-002",
    category: 3,
    httpStatus: 500,
    message:
      "A data lookup failed. The system administrator has been notified.",
    detail:
      "A SQL query failed to execute — the raw error has been logged server-side.",
    severity: "error",
  },

  SQL_INSERT_CONSTRAINT: {
    code: "E-PERSIST-003",
    category: 3,
    httpStatus: 409,
    message:
      "This record could not be saved because it conflicts with existing data.",
    detail:
      "An INSERT statement violated a table constraint (CHECK, NOT NULL, etc.).",
    severity: "error",
  },

  SQL_RECORD_NOT_FOUND: {
    code: "E-PERSIST-004",
    category: 3,
    httpStatus: 404,
    message: "The record you tried to update or delete no longer exists.",
    detail:
      "An UPDATE or DELETE statement affected zero rows — the target record was not found.",
    severity: "error",
  },

  TRANSACTION_ROLLBACK: {
    code: "E-PERSIST-005",
    category: 3,
    httpStatus: 500,
    message: "A multi-step data operation failed and has been rolled back.",
    detail:
      "A transaction threw an error and was automatically rolled back by better-sqlite3.",
    severity: "error",
  },

  FOREIGN_KEY_VIOLATION: {
    code: "E-PERSIST-006",
    category: 3,
    httpStatus: 409,
    message:
      "This operation cannot be completed because it would break data relationships.",
    detail:
      "A foreign key constraint was violated — the referenced row does not exist or cannot be deleted.",
    severity: "error",
  },

  UNIQUE_CONSTRAINT_VIOLATION: {
    code: "E-PERSIST-007",
    category: 3,
    httpStatus: 409,
    message: "A record with that identifier already exists.",
    detail:
      "A UNIQUE constraint was violated — a row with the same key value already exists.",
    severity: "error",
  },

  // ── Environment & configuration ─────────────────────────────────────────

  MISSING_ENV_VARIABLE: {
    code: "E-PERSIST-008",
    category: 3,
    httpStatus: 503,
    message: "The server is missing required configuration.",
    detail:
      "A required environment variable was not set — check .env or process environment.",
    severity: "critical",
  },

  // ── Filesystem ───────────────────────────────────────────────────────────

  FILE_READ_FAILURE: {
    code: "E-PERSIST-009",
    category: 3,
    httpStatus: 500,
    message: "A required file could not be read.",
    detail:
      "fs.readFileSync failed — the raw errno has been logged server-side.",
    severity: "error",
  },

  FILE_WRITE_FAILURE: {
    code: "E-PERSIST-010",
    category: 3,
    httpStatus: 507,
    message:
      "The file could not be saved. The disk may be full or write-protected.",
    detail:
      "fs.writeFileSync or fs.renameSync failed — check disk space and permissions.",
    severity: "error",
  },

  DIRECTORY_CREATION_FAILURE: {
    code: "E-PERSIST-011",
    category: 3,
    httpStatus: 500,
    message: "A required directory could not be created.",
    detail:
      "fs.mkdirSync failed — the parent path may not exist or be writable.",
    severity: "error",
  },

  FILE_NOT_FOUND: {
    code: "E-PERSIST-012",
    category: 3,
    httpStatus: 404,
    message: "The requested file does not exist.",
    detail:
      "A file path resolved but the file was not present — ENOENT from the OS.",
    severity: "error",
  },

  // ── External API calls ──────────────────────────────────────────────────

  EXTERNAL_API_NETWORK_ERROR: {
    code: "E-PERSIST-013",
    category: 3,
    httpStatus: 502,
    message: "An external service is currently unreachable. Please try again.",
    detail:
      "A fetch() to an external API failed at the network level (DNS, TCP, TLS, or timeout).",
    severity: "error",
  },

  EXTERNAL_API_UPSTREAM_ERROR: {
    code: "E-PERSIST-014",
    category: 3,
    httpStatus: 502,
    message: "An external service returned an error.",
    detail:
      "An external API responded with a non-2xx status code — the upstream may be degraded.",
    severity: "error",
  },

  EXTERNAL_API_AUTH_FAILURE: {
    code: "E-PERSIST-015",
    category: 3,
    httpStatus: 502,
    message: "The server cannot authenticate with an external service.",
    detail:
      "An external API rejected the server's credentials — the API key may be expired or revoked.",
    severity: "error",
  },

  // ── Server lifecycle ────────────────────────────────────────────────────

  PORT_BIND_FAILURE: {
    code: "E-PERSIST-016",
    category: 3,
    httpStatus: null,
    message: "The server port is already in use. Is another instance running?",
    detail:
      "app.listen() threw EADDRINUSE — the requested port is occupied by another process.",
    severity: "critical",
  },

  STATIC_FILE_SERVING_FAILURE: {
    code: "E-PERSIST-017",
    category: 3,
    httpStatus: 404,
    message: "The requested static file is not available.",
    detail:
      "express.static could not locate the requested asset in the public directory.",
    severity: "error",
  },

  // ── Schema & migration ──────────────────────────────────────────────────

  MIGRATION_FAILURE: {
    code: "E-PERSIST-018",
    category: 3,
    httpStatus: null,
    message: "A database migration failed. The schema may be out of date.",
    detail:
      "A schema migration script threw an error — the database may be in an inconsistent state.",
    severity: "critical",
  },

  DDL_EXECUTION_FAILURE: {
    code: "E-PERSIST-020",
    category: 3,
    httpStatus: 500,
    message: "A database structure change failed.",
    detail:
      "A CREATE, ALTER, or DROP statement failed to execute against the database.",
    severity: "error",
  },

  SCHEMA_MISMATCH: {
    code: "E-PERSIST-025",
    category: 3,
    httpStatus: 500,
    message:
      "The database structure does not match what the application expects.",
    detail:
      "A query referenced a table or column that does not exist in the current schema.",
    severity: "error",
  },

  // ── Session & in-memory state ───────────────────────────────────────────

  SESSION_STORE_FAILURE: {
    code: "E-PERSIST-019",
    category: 3,
    httpStatus: 401,
    message: "Your session was invalidated. Please log in again.",
    detail:
      "The in-memory session store was cleared (server restart) — all sessions were lost.",
    severity: "error",
  },

  // ── Module loading ──────────────────────────────────────────────────────

  MODULE_LOAD_FAILURE: {
    code: "E-PERSIST-021",
    category: 3,
    httpStatus: 503,
    message: "The server failed to load a required component.",
    detail:
      "A require() or dynamic import failed — a dependency may be missing or corrupted.",
    severity: "critical",
  },

  // ── Bulk operations ─────────────────────────────────────────────────────

  BULK_IMPORT_FAILURE: {
    code: "E-PERSIST-022",
    category: 3,
    httpStatus: 500,
    message: "A bulk data import failed part-way through.",
    detail:
      "A multi-row INSERT or import operation failed after some rows were already written.",
    severity: "error",
  },

  // ── Full-text search ────────────────────────────────────────────────────

  FTS_SYNTAX_ERROR: {
    code: "E-PERSIST-023",
    category: 3,
    httpStatus: 400,
    message: "The search query contains characters that cannot be processed.",
    detail:
      "The FTS5 query parser rejected the input — it may contain special operators or malformed syntax.",
    severity: "error",
  },

  // ── Process manager ─────────────────────────────────────────────────────

  PROCESS_MANAGER_FAILURE: {
    code: "E-PERSIST-024",
    category: 3,
    httpStatus: null,
    message: "The process manager encountered an error.",
    detail:
      "pm2 or systemd reported a failure — the process may need manual intervention.",
    severity: "critical",
  },
};

// ── Category 4: Egress Boundaries (Response & Output) ─────────────────────

const CATEGORY_4 = {
  // ── Response serialization ──────────────────────────────────────────────

  RESPONSE_SERIALIZATION_FAILURE: {
    code: "E-EGRESS-001",
    category: 4,
    httpStatus: 500,
    message: "The server could not format the response.",
    detail:
      "JSON.stringify failed on the response payload — the data may contain circular references.",
    severity: "error",
  },

  TEMPLATE_RENDER_FAILURE: {
    code: "E-EGRESS-002",
    category: 4,
    httpStatus: 500,
    message: "The page could not be rendered.",
    detail: "A server-side template engine threw an error during render.",
    severity: "error",
  },

  JSON_ENCODING_FAILURE: {
    code: "E-EGRESS-003",
    category: 4,
    httpStatus: 500,
    message: "The server could not encode the response.",
    detail:
      "Response encoding failed — the payload may contain characters outside the acceptable range.",
    severity: "error",
  },

  CONTENT_TYPE_MISMATCH: {
    code: "E-EGRESS-004",
    category: 4,
    httpStatus: 406,
    message: "The server cannot produce the requested content type.",
    detail:
      "The Accept header requested a content type the server does not support for this resource.",
    severity: "error",
  },

  PARTIAL_CONTENT_DELIVERY: {
    code: "E-EGRESS-005",
    category: 4,
    httpStatus: 500,
    message: "The response was only partially delivered.",
    detail:
      "A streamed response was interrupted before completion — the client may have disconnected.",
    severity: "warn",
  },

  CACHE_WRITE_FAILURE: {
    code: "E-EGRESS-006",
    category: 4,
    httpStatus: 500,
    message: "The server could not cache the response.",
    detail:
      "Writing to the response cache failed — the cache store may be full or unavailable.",
    severity: "warn",
  },

  STREAM_INTERRUPTION: {
    code: "E-EGRESS-007",
    category: 4,
    httpStatus: 500,
    message: "The data stream was interrupted.",
    detail:
      "A writable stream was closed or errored before the full response was sent.",
    severity: "error",
  },

  // ── Client-side display fallbacks ───────────────────────────────────────

  DISPLAY_ELEMENT_MISSING: {
    code: "E-EGRESS-008",
    category: 4,
    httpStatus: 500,
    message: "An error display element was missing from the page.",
    detail:
      "The target DOM element for inline error display was not present in the document — fell back to toast.",
    severity: "warn",
  },

  TOAST_SUPPRESSED: {
    code: "E-EGRESS-009",
    category: 4,
    httpStatus: 500,
    message: "The error notification could not be shown.",
    detail:
      "The toast notification module was unavailable — error logged to console as last-resort fallback.",
    severity: "warn",
  },

  // ── Express / HTTP boundary guards ──────────────────────────────────────

  HEADERS_ALREADY_SENT: {
    code: "E-EGRESS-010",
    category: 4,
    httpStatus: null,
    message: "Response headers were already sent before the error handler ran.",
    detail:
      "The Express error handler was invoked after res.headersSent — the error was logged but no response body was sent.",
    severity: "warn",
  },

  INFORMATION_LEAKAGE_SUPPRESSED: {
    code: "E-EGRESS-011",
    category: 4,
    httpStatus: 500,
    message: "A detailed error was suppressed in production.",
    detail:
      "An unhandled error occurred in production — only the sanitised message was returned to the client.",
    severity: "warn",
  },

  PORT_MISMATCH: {
    code: "E-EGRESS-012",
    category: 4,
    httpStatus: null,
    message:
      "The configured server port does not match the proxy configuration.",
    detail:
      "The PORT environment variable and the nginx proxy_pass port are different — requests may not reach the server.",
    severity: "warn",
  },

  STATIC_SERVING_MISCONFIGURED: {
    code: "E-EGRESS-013",
    category: 4,
    httpStatus: 404,
    message: "Static file serving is misconfigured.",
    detail:
      "The static file server could not locate or serve a requested asset — check the public directory path.",
    severity: "error",
  },

  // ── Timeouts & compression ──────────────────────────────────────────────

  RESPONSE_TIMEOUT: {
    code: "E-EGRESS-014",
    category: 4,
    httpStatus: 504,
    message: "The server took too long to respond.",
    detail:
      "A response was not sent within the configured timeout window — the connection was terminated.",
    severity: "error",
  },

  COMPRESSION_FAILURE: {
    code: "E-EGRESS-015",
    category: 4,
    httpStatus: 500,
    message: "The response could not be compressed.",
    detail:
      "A compression middleware threw an error while compressing the response body.",
    severity: "error",
  },

  RENDER_FAILURE: {
    code: "E-EGRESS-016",
    category: 4,
    httpStatus: 500,
    message: "The content could not be displayed.",
    detail:
      "A client-side render function threw an error — the skeleton loader was hidden and a fallback message was shown.",
    severity: "error",
  },

  REDIRECT_FAILURE: {
    code: "E-EGRESS-017",
    category: 4,
    httpStatus: 500,
    message: "The page could not be redirected.",
    detail:
      "A redirect operation failed — the target URL may be invalid or headers were already sent.",
    severity: "error",
  },

  SSE_EVENT_FAILURE: {
    code: "E-EGRESS-018",
    category: 4,
    httpStatus: 500,
    message: "A server-sent event could not be delivered.",
    detail:
      "An SSE event write failed — the client connection may have been closed.",
    severity: "warn",
  },
};

// ── Combined registry ────────────────────────────────────────────────────────

const registry = { ...CATEGORY_1, ...CATEGORY_2, ...CATEGORY_3, ...CATEGORY_4 };

/**
 * Look up an error definition by its string code (e.g. "E-PERSIST-001").
 * Returns undefined when the code is not recognised (JS-2: callers must
 * handle the miss).
 *
 * @param {string} code — the error code string
 * @returns {object | undefined}
 */
function lookup(code) {
  for (const key of Object.keys(registry)) {
    const entry = registry[key];
    // Skip non-entry properties (helpers attached below).
    if (entry && entry.code === code) return entry;
  }
  return undefined;
}

/**
 * Build the JSON response body for a given error code.
 * Falls back to a generic message when the code is unrecognised (JS-2).
 *
 * @param {string} code — e.g. "E-PERSIST-007"
 * @returns {{ error: string }}
 */
function responseBody(code) {
  const entry = lookup(code);
  return { error: entry ? entry.message : "An unexpected error occurred." };
}

/**
 * Return the HTTP status code for a given error code.
 * Defaults to 500 when the code is unknown or has no HTTP mapping
 * (some codes like E-PERSIST-016 are startup-only and carry httpStatus: null).
 *
 * @param {string} code
 * @returns {number}
 */
function httpStatus(code) {
  const entry = lookup(code);
  return entry && entry.httpStatus != null ? entry.httpStatus : 500;
}

// Attach helpers to the registry so consumers can destructure them —
//   const { lookup } = require('./error-codes');
// — while the registry itself holds every error definition by name.
registry.lookup = lookup;
registry.responseBody = responseBody;
registry.httpStatus = httpStatus;

// Freeze the whole registry so error definitions are immutable at runtime.
Object.freeze(registry);

module.exports = registry;
