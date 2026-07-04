// WebAuthn utility functions for admin auth pages.
// Bundles base64url conversion, PEM export, sign-count extraction, and the full
// registration / login ceremony flows. All five functions share the same domain
// and form a single linear sequence during auth ceremonies (SR-1: related by
// purpose / type). Pure vanilla JS — no external dependencies (SR-2).
//
// Exported as a global "Passkey" namespace so both pages can call the same code.

window.Passkey = {};
const Passkey = window.Passkey;

/* ── Pure helpers ─────────────────────────────────────────────────────────── */

/** Convert a base64url string to an ArrayBuffer. */
Passkey.base64urlToBuffer = function (base64url) {
  if (typeof base64url !== "string") throw new TypeError("Expected a string.");
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
};

/** Convert an ArrayBuffer (or Uint8Array) to a base64url string. */
Passkey.bufferToBase64url = function (buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Convert a DER-encoded SPKI ArrayBuffer to a PEM public-key string.
 * The API expects SPKI PEM (see routes/passkey.js scope note).
 */
Passkey.arrayBufferToPem = function (buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const lines = [];
  for (let i = 0; i < base64.length; i += 64)
    lines.push(base64.slice(i, i + 64));
  return (
    "-----BEGIN PUBLIC KEY-----\n" +
    lines.join("\n") +
    "\n-----END PUBLIC KEY-----"
  );
};

/**
 * Extract the 4-byte sign counter from authenticatorData.
 * The counter lives at offset 33 (after the 32-byte RP ID hash and 1-byte flags)
 * and is a big-endian unsigned 32-bit integer.
 */
Passkey.extractSignCount = function (authenticatorData) {
  const bytes =
    authenticatorData instanceof Uint8Array
      ? authenticatorData
      : new Uint8Array(authenticatorData);
  return (
    ((bytes[33] << 24) | (bytes[34] << 16) | (bytes[35] << 8) | bytes[36]) >>> 0
  );
};

/* ── Ceremony flows ──────────────────────────────────────────────────────── */

/**
 * Full passkey registration ceremony.
 *
 * 1. POST /passkey/register/options  (with x-setup-token)
 * 2. navigator.credentials.create()
 * 3. Export public key as SPKI PEM
 * 4. POST /passkey/register/verify
 *
 * @param {string} setupToken — from ?setupToken= in the URL
 * @returns {Promise<{success: true}>}  Resolves on success, rejects on failure.
 */
Passkey.registerPasskey = async function (setupToken) {
  // 1 — Request registration challenge from the server.
  const optionsRes = await fetch("/passkey/register/options", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-setup-token": setupToken,
    },
    body: JSON.stringify({ handle: "admin" }),
  });

  if (!optionsRes.ok) {
    const body = await optionsRes.json().catch(() => ({}));
    throw new Error(body.error || "Registration is not available.");
  }

  const serverOptions = await optionsRes.json();

  // 2 — Ask the platform authenticator to create a credential.
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: Passkey.base64urlToBuffer(serverOptions.challenge),
      rp: { id: serverOptions.rp.id, name: serverOptions.rp.name },
      user: {
        id: Passkey.base64urlToBuffer(serverOptions.user.id),
        name: serverOptions.user.name,
        displayName: serverOptions.user.displayName,
      },
      pubKeyCredParams: serverOptions.pubKeyCredParams,
      timeout: serverOptions.timeout,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
      },
    },
  });

  const response = credential.response;
  if (
    typeof AuthenticatorAttestationResponse !== "undefined" &&
    !(response instanceof AuthenticatorAttestationResponse)
  ) {
    throw new Error("Unexpected credential response type.");
  }

  // 3 — Export the credential's public key as SPKI PEM.
  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    response.getPublicKey(),
  );
  const publicKeyPem = Passkey.arrayBufferToPem(publicKeyBuffer);

  // 4 — Send the registration payload to the server for verification.
  const verifyRes = await fetch("/passkey/register/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-setup-token": setupToken,
    },
    body: JSON.stringify({
      handle: "admin",
      id: credential.id,
      clientDataJSON: Passkey.bufferToBase64url(response.clientDataJSON),
      publicKeyPem,
    }),
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    throw new Error(body.error || "Registration verification failed.");
  }

  return { success: true };
};

/**
 * Full passkey login (assertion) ceremony.
 *
 * 1. POST /passkey/login/options
 * 2. navigator.credentials.get()
 * 3. POST /passkey/login/verify
 *
 * @returns {Promise<{success: true}>}  Resolves on success, rejects on failure.
 */
Passkey.loginWithPasskey = async function () {
  // 1 — Request an assertion challenge.
  const optionsRes = await fetch("/passkey/login/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle: "admin" }),
  });

  if (!optionsRes.ok) {
    const body = await optionsRes.json().catch(() => ({}));
    throw new Error(body.error || "Failed to start login.");
  }

  const serverOptions = await optionsRes.json();

  // 2 — Ask the platform authenticator for an assertion.
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: Passkey.base64urlToBuffer(serverOptions.challenge),
      rpId: serverOptions.rpId,
      timeout: serverOptions.timeout,
      userVerification: serverOptions.userVerification || "preferred",
    },
  });

  const response = credential.response;

  // 3 — Send the assertion to the server.
  const verifyRes = await fetch("/passkey/login/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: "admin",
      id: credential.id,
      clientDataJSON: Passkey.bufferToBase64url(response.clientDataJSON),
      authenticatorData: Passkey.bufferToBase64url(response.authenticatorData),
      signature: Passkey.bufferToBase64url(response.signature),
      signCount: Passkey.extractSignCount(response.authenticatorData),
    }),
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    throw new Error(body.error || "Login verification failed.");
  }

  return { success: true };
};
