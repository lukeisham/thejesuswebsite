// Passkey (WebAuthn) HTTP routes — challenge generation and credential
// verification for admin sign-in. Uses only Node's built-in `crypto` (SR-2: no
// external dependencies for non-visual concerns). Credential records live in
// credential.model.js; sessions in middleware/auth.js.
//
// Scope note: WebAuthn's cryptographic core — challenge issuance, clientDataJSON
// validation, assertion signature verification, and the sign-count replay check —
// is implemented here against Node `crypto`. Decoding the registration
// attestationObject (CBOR) to extract the COSE public key is the one step a
// from-scratch parser would own; rather than ship a fragile hand-rolled CBOR
// decoder (which could fail silently — JS-2), this file takes the credential
// public key from the browser already in SPKI PEM form and documents that contract
// at the registration endpoint. Swapping in a vetted parser later changes only
// /register/verify.

const express = require("express");
const crypto = require("crypto");
const credentialModel = require("../models/credential.model");
const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rate-limit");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// Relying-party identity. RP_ID must match the site's domain in production.
const RP_ID = process.env.RP_ID || "localhost";
const RP_NAME = "The Jesus Website";
const CHALLENGE_TTL_MS = 1000 * 60 * 5; // 5 minutes to complete a ceremony

// Short-lived challenges keyed by a random per-attempt ID — NOT by handle.
// Keying by handle alone meant a second ceremony for the same handle (a
// second tab, a second browser, a retry) silently overwrote the first
// ceremony's pending challenge, failing it with a confusing "Client data did
// not match the challenge." This lets any number of concurrent attempts for
// the same handle coexist. In-memory is fine for a single admin on one VPS
// and clears any half-finished ceremony on restart.
const challenges = new Map();

const base64url = (buffer) => buffer.toString("base64url");

/** Issue a fresh challenge for a handle and remember it under a fresh attempt ID. */
function issueChallenge(handle) {
  const attemptId = base64url(crypto.randomBytes(16));
  const challenge = base64url(crypto.randomBytes(32));
  challenges.set(attemptId, {
    handle,
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { attemptId, challenge };
}

/**
 * Single-use read: returns the live challenge for an attempt, then forgets it.
 * Also checks the attempt was issued for this same handle (defense in depth —
 * attemptId is an unguessable random token, so this mismatch shouldn't
 * normally be reachable, but costs nothing to assert).
 */
function consumeChallenge(attemptId, handle) {
  const record = challenges.get(attemptId);
  challenges.delete(attemptId);
  if (!record || record.expiresAt < Date.now()) return null;
  if (record.handle !== handle) return null;
  return record.challenge;
}

/**
 * Validate the clientDataJSON the authenticator signed: it must be the expected
 * ceremony type and echo back exactly the challenge we issued (JS-2: reject
 * anything that does not match — never assume).
 */
function verifyClientData(
  clientDataJSONBase64,
  expectedType,
  expectedChallenge,
  expectedOrigin,
) {
  const clientData = JSON.parse(
    Buffer.from(clientDataJSONBase64, "base64url").toString("utf8"),
  );
  // JS-2: client-data origin must exactly match the expected RP origin in
  // production. Leaving ORIGIN unset (null) skips the check so local dev
  // against arbitrary ports still works.
  if (
    expectedOrigin !== null &&
    expectedOrigin !== undefined &&
    clientData.origin !== expectedOrigin
  ) {
    return false;
  }
  return (
    clientData.type === expectedType &&
    clientData.challenge === expectedChallenge
  );
}

/** Sanitise and validate a user handle. Rejects empty, over-long, or invalid
 *  characters. Returns the cleaned handle. Call at the top of every handler. */
function validateHandle(handle) {
  if (typeof handle !== "string") {
    const err = new Error(ERRORS.INVALID_CREDENTIAL_HANDLE.message);
    err.errorDef = ERRORS.INVALID_CREDENTIAL_HANDLE;
    err.context = { field: "handle" };
    throw err;
  }
  const cleaned = handle.toLowerCase().trim();
  if (!cleaned) {
    const err = new Error(ERRORS.MISSING_BODY_FIELD.message);
    err.errorDef = ERRORS.MISSING_BODY_FIELD;
    err.context = { field: "handle" };
    throw err;
  }
  if (cleaned.length > 64) {
    const err = new Error(ERRORS.INPUT_EXCEEDS_MAX_LENGTH.message);
    err.errorDef = ERRORS.INPUT_EXCEEDS_MAX_LENGTH;
    err.context = { field: "handle", limit: 64 };
    throw err;
  }
  if (!/^[a-z0-9_-]+$/.test(cleaned)) {
    const err = new Error(ERRORS.INVALID_CREDENTIAL_HANDLE.message);
    err.errorDef = ERRORS.INVALID_CREDENTIAL_HANDLE;
    err.context = { field: "handle" };
    throw err;
  }
  return cleaned;
}

/**
 * Guard that only allows registration when no credential has ever been enrolled
 * AND the request carries the correct SETUP_TOKEN. Returns 404 on any failure
 * (JS-2: never reveal why access was denied to an unauthenticated caller).
 */
function requireSetupToken(req, res, next) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return res.status(404).json({ error: "Not found." });
  if (credentialModel.countAll() > 0)
    return res.status(404).json({ error: "Not found." });

  const token = req.headers["x-setup-token"] || req.query.setupToken || "";
  if (token !== expected) return res.status(404).json({ error: "Not found." });

  next();
}

// Rate-limiter instances tuned per endpoint.
const loginOptionsLimit = rateLimit({ maxAttempts: 10, windowMs: 60_000 });
const loginVerifyLimit = rateLimit({ maxAttempts: 5, windowMs: 60_000 });
const registerOptionsLimit = rateLimit({ maxAttempts: 3, windowMs: 60_000 });
const registerVerifyLimit = rateLimit({ maxAttempts: 3, windowMs: 60_000 });
const addOptionsLimit = rateLimit({ maxAttempts: 10, windowMs: 60_000 });
const addVerifyLimit = rateLimit({ maxAttempts: 5, windowMs: 60_000 });

// POST /passkey/register/options — begin enrolment for an admin credential
router.post(
  "/register/options",
  requireSetupToken,
  registerOptionsLimit,
  (req, res) => {
    try {
      const handle = validateHandle(req.body.handle || "");
      const { attemptId, challenge } = issueChallenge(handle);

      res.json({
        attemptId,
        challenge,
        rp: { id: RP_ID, name: RP_NAME },
        user: {
          id: base64url(Buffer.from(handle)),
          name: handle,
          displayName: handle,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        timeout: CHALLENGE_TTL_MS,
      });
    } catch (error) {
      console.error("POST /passkey/register/options failed:", error);
      if (error.errorDef) {
        return sendError(res, error.errorDef, error.context || {});
      }
      sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
  },
);

// POST /passkey/register/verify — finish enrolment and store the credential.
// Expects: { handle, id, clientDataJSON, publicKeyPem }
// `publicKeyPem` is the credential public key in SPKI PEM form (see scope note).
router.post(
  "/register/verify",
  requireSetupToken,
  registerVerifyLimit,
  (req, res) => {
    try {
      const handle = validateHandle(req.body.handle || "");
      const { id, clientDataJSON, publicKeyPem, attemptId } = req.body;
      if (!id || !clientDataJSON || !publicKeyPem || !attemptId) {
        return sendError(res, ERRORS.MISSING_BODY_FIELD, {
          fields: ["id", "clientDataJSON", "publicKeyPem", "attemptId"],
        });
      }

      const expectedChallenge = consumeChallenge(attemptId, handle);
      if (!expectedChallenge)
        return sendError(res, ERRORS.CHALLENGE_EXPIRED);
      if (
        !verifyClientData(
          clientDataJSON,
          "webauthn.create",
          expectedChallenge,
          process.env.ORIGIN || null,
        )
      ) {
        return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
          reason: "challenge_mismatch",
        });
      }
      if (credentialModel.getByCredentialId(id)) {
        return sendError(res, ERRORS.DUPLICATE_CREDENTIAL);
      }

      credentialModel.create({
        credential_id: id,
        public_key: publicKeyPem,
        user_handle: handle,
        sign_count: 0,
      });
      res.status(201).json({ registered: true });
    } catch (error) {
      console.error("POST /passkey/register/verify failed:", error);
      if (error.errorDef) {
        return sendError(res, error.errorDef, error.context || {});
      }
      sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
  },
);

// POST /passkey/login/options — begin an assertion ceremony
router.post("/login/options", loginOptionsLimit, (req, res) => {
  try {
    const handle = validateHandle(req.body.handle || "admin");
    // Restrict the browser to credentials the server actually has enrolled for
    // this handle, so a stale passkey left over from a credential reset is
    // never offered (and can't produce a confusing "Unknown credential.").
    const allowCredentials = credentialModel
      .getByUserHandle(handle)
      .map((credential) => ({
        type: "public-key",
        id: credential.credential_id,
      }));
    const { attemptId, challenge } = issueChallenge(handle);
    res.json({
      attemptId,
      challenge,
      rpId: RP_ID,
      timeout: CHALLENGE_TTL_MS,
      userVerification: "preferred",
      allowCredentials,
    });
  } catch (error) {
    console.error("POST /passkey/login/options failed:", error);
    if (error.errorDef) {
      return sendError(res, error.errorDef, error.context || {});
    }
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /passkey/login/verify — verify the authenticator's assertion, start a session.
// Expects: { attemptId, id, clientDataJSON, authenticatorData, signature }
// Note: signCount may still be sent by older clients but the server parses it
// from the signed authenticatorData bytes (JS-2: never trust client input).
router.post("/login/verify", loginVerifyLimit, (req, res) => {
  try {
    const { id, clientDataJSON, authenticatorData, signature, attemptId } =
      req.body;
    if (
      !id ||
      !clientDataJSON ||
      !authenticatorData ||
      !signature ||
      !attemptId
    ) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: [
          "id",
          "clientDataJSON",
          "authenticatorData",
          "signature",
          "attemptId",
        ],
      });
    }

    // Resolve the credential first so we key the challenge by the actual
    // enrolled user_handle, not the client-supplied handle (JS-2: the client
    // controls the handle field and could name a different user's challenge).
    const credential = credentialModel.getByCredentialId(id);
    if (!credential)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "credential",
      });

    const expectedChallenge = consumeChallenge(
      attemptId,
      credential.user_handle,
    );
    if (!expectedChallenge) return sendError(res, ERRORS.CHALLENGE_EXPIRED);
    if (
      !verifyClientData(
        clientDataJSON,
        "webauthn.get",
        expectedChallenge,
        process.env.ORIGIN || null,
      )
    ) {
      return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
        reason: "challenge_mismatch",
      });
    }

    // WebAuthn signs authenticatorData concatenated with the SHA-256 of
    // clientDataJSON. Rebuild that exact byte string and verify it against the
    // stored public key.
    const authData = Buffer.from(authenticatorData, "base64url");

    // JS-2: Validate authenticatorData length before any indexed reads.
    // Minimum: 32-byte RP ID hash + 1-byte flags + 4-byte sign counter = 37.
    // Anything shorter is malformed and would cause timingSafeEqual or the
    // counter read to throw a 500 on truncated input — reject with 401.
    if (authData.length < 37) {
      return sendError(res, ERRORS.MALFORMED_WEBAUTHN_DATA, {
        minLength: 37,
        actual: authData.length,
      });
    }

    // Verify the relying-party ID hash baked into authenticatorData by the
    // authenticator. Without this check a credential registered for a different
    // RP could be replayed against this server (JS-2: reject outright).
    const expectedRpIdHash = crypto.createHash("sha256").update(RP_ID).digest();
    const actualRpIdHash = authData.subarray(0, 32);
    if (!crypto.timingSafeEqual(expectedRpIdHash, actualRpIdHash)) {
      return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
        reason: "rp_id_mismatch",
      });
    }

    // Flags byte at offset 32: bit 0 is UP (user-present). The authenticator
    // must attest that a human was physically interacting with it during the
    // ceremony (JS-2: reject if the flag is absent — never assume presence).
    const flags = authData[32];
    if ((flags & 0x01) === 0) {
      return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
        reason: "user_presence_missing",
      });
    }

    const clientHash = crypto
      .createHash("sha256")
      .update(Buffer.from(clientDataJSON, "base64url"))
      .digest();
    const signedPayload = Buffer.concat([authData, clientHash]);

    const isValid = crypto.verify(
      "sha256",
      signedPayload,
      credential.public_key,
      Buffer.from(signature, "base64url"),
    );
    if (!isValid)
      return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
        reason: "signature_invalid",
      });

    // JS-2: Parse the sign counter from the signed authenticatorData bytes
    // (offset 33, 4-byte big-endian uint32), not from the client-supplied
    // req.body.signCount. The authenticator signed these bytes — a client
    // cannot forge them — so this is the only trustworthy source of the counter.
    // Apple passkeys and some platform authenticators return a zero counter
    // (they don't implement the feature); only enforce when non-zero.
    const parsedSignCount = authData.readUInt32BE(33);
    if (parsedSignCount > 0 && parsedSignCount <= credential.sign_count) {
      return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
        reason: "counter_replay_suspected",
      });
    }
    credentialModel.updateSignCount(id, parsedSignCount);

    const token = auth.createSession(credential.user_handle);
    res.cookie(auth.SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: auth.SESSION_TTL_MS,
    });
    res.json({ authenticated: true, handle: credential.user_handle });
  } catch (error) {
    console.error("POST /passkey/login/verify failed:", error);
    if (error.errorDef) {
      return sendError(res, error.errorDef, error.context || {});
    }
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /passkey/credentials — list all credentials for the authenticated user.
// Returns metadata only (no public_key). Requires a valid session cookie.
router.get("/credentials", auth, (req, res) => {
  try {
    const credentials = credentialModel.getAllByUserHandle(req.user.handle);
    res.json(credentials);
  } catch (error) {
    console.error("GET /passkey/credentials failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /passkey/credentials/:id — revoke a credential by primary key.
// Guards against removing the last credential (user would be locked out).
router.delete("/credentials/:id", auth, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "id",
        received: req.params.id,
      });
    }

    const credential = credentialModel.getById(id);
    if (!credential) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "credential",
        id,
      });
    }

    // Prevent lock-out: refuse to delete the last credential owned by the
    // target credential's user_handle, not the session's handle (JS-2: a
    // session with multiple enrolled handles must not strip another handle's
    // last credential).
    if (credentialModel.countByUserHandle(credential.user_handle) <= 1) {
      return sendError(res, ERRORS.LAST_CREDENTIAL_DELETION);
    }

    credentialModel.remove(credential.credential_id);
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /passkey/credentials/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /passkey/credentials/add/options — begin adding a passkey for the
// currently authenticated admin. Behind the auth middleware and a rate limiter;
// reuses the same issueChallenge/ceremony pattern as registration, but gated
// by the session cookie instead of the setup token.
router.post("/credentials/add/options", auth, addOptionsLimit, (req, res) => {
  try {
    const { attemptId, challenge } = issueChallenge(req.user.handle);

    res.json({
      attemptId,
      challenge,
      rp: { id: RP_ID, name: RP_NAME },
      user: {
        id: base64url(Buffer.from(req.user.handle)),
        name: req.user.handle,
        displayName: req.user.handle,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      timeout: CHALLENGE_TTL_MS,
    });
  } catch (error) {
    console.error("POST /passkey/credentials/add/options failed:", error);
    if (error.errorDef) {
      return sendError(res, error.errorDef, error.context || {});
    }
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /passkey/credentials/add/verify — finish adding a passkey for the
// currently authenticated admin. Reuses the same clientData/duplicate-credential
// checks as the first-run registration endpoint, but gated by the session cookie
// instead of the setup token.
router.post("/credentials/add/verify", auth, addVerifyLimit, (req, res) => {
  try {
    const { id, clientDataJSON, publicKeyPem, attemptId } = req.body;
    if (!id || !clientDataJSON || !publicKeyPem || !attemptId) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: ["id", "clientDataJSON", "publicKeyPem", "attemptId"],
      });
    }

    const expectedChallenge = consumeChallenge(attemptId, req.user.handle);
    if (!expectedChallenge) return sendError(res, ERRORS.CHALLENGE_EXPIRED);
    if (
      !verifyClientData(
        clientDataJSON,
        "webauthn.create",
        expectedChallenge,
        process.env.ORIGIN || null,
      )
    ) {
      return sendError(res, ERRORS.INVALID_WEBAUTHN_ASSERTION, {
        reason: "challenge_mismatch",
      });
    }
    if (credentialModel.getByCredentialId(id)) {
      return sendError(res, ERRORS.DUPLICATE_CREDENTIAL);
    }

    credentialModel.create({
      credential_id: id,
      public_key: publicKeyPem,
      user_handle: req.user.handle,
      sign_count: 0,
    });
    res.status(201).json({ registered: true });
  } catch (error) {
    console.error("POST /passkey/credentials/add/verify failed:", error);
    if (error.errorDef) {
      return sendError(res, error.errorDef, error.context || {});
    }
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
// Exported for testing.
module.exports.validateHandle = validateHandle;
module.exports._issueChallenge = issueChallenge;
module.exports._consumeChallenge = consumeChallenge;
module.exports._verifyClientData = verifyClientData;
module.exports._challenges = challenges;
