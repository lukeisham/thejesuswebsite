// Passkey management UI — lists, adds, and deletes credentials for the
// currently authenticated admin. Loaded with defer on the Settings page.
// Renders everything with textContent (JS-6: never innerHTML with API data).
// Reuses Passkey ceremony helpers for WebAuthn registration flows.
//
// Exported as Admin.Credentials to match the shared Admin namespace pattern.

window.Admin = window.Admin || {};
const Admin = window.Admin;

Admin.Credentials = {};
const Cred = Admin.Credentials;

/** DOM container the component renders into (set by init). */
let container = null;

/* ── API helpers ──────────────────────────────────────────────────────────── */

async function fetchCredentials() {
  return Admin.api.get("/passkey/credentials");
}

async function requestAddOptions() {
  return Admin.api.post("/passkey/credentials/add/options");
}

async function verifyAddCredential(payload) {
  return Admin.api.post("/passkey/credentials/add/verify", payload);
}

async function deleteCredential(id) {
  return Admin.api.del("/passkey/credentials/" + id);
}

/* ── Render ──────────────────────────────────────────────────────────────── */

/**
 * Format a last-used timestamp for display.
 * @param {string|null} isoString
 * @returns {string}
 */
function formatLastUsed(isoString) {
  if (!isoString) return "Never used";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Render the full passkey-management section into the container.
 * @param {Array} credentials — from GET /api/passkey/credentials
 */
function renderCredentials(credentials) {
  // Clear the container.
  container.innerHTML = "";

  // Section heading
  const heading = document.createElement("h2");
  heading.className = "admin-section-heading";
  heading.textContent = "Passkeys";
  container.appendChild(heading);

  // Description
  const desc = document.createElement("p");
  desc.className = "admin-section-desc";
  desc.textContent =
    "Manage your registered passkeys. You can add a second device or remove a lost one — at least one passkey must remain.";
  container.appendChild(desc);

  // Add button
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "admin-btn admin-btn--primary cred-add-btn";
  addBtn.textContent = "Add a Passkey";
  addBtn.addEventListener("click", handleAddPasskey);
  container.appendChild(addBtn);

  // Message area for inline errors/success
  const msg = document.createElement("div");
  msg.id = "cred-message";
  msg.className = "cred-message";
  msg.setAttribute("role", "status");
  msg.setAttribute("aria-live", "polite");
  container.appendChild(msg);

  if (!credentials || credentials.length === 0) {
    const empty = document.createElement("p");
    empty.className = "cred-empty";
    empty.textContent = "No passkeys registered. Add one to get started.";
    container.appendChild(empty);
    return;
  }

  // Credential list
  const list = document.createElement("ul");
  list.className = "cred-list";
  credentials.forEach(function (cred) {
    list.appendChild(buildCredentialRow(cred));
  });
  container.appendChild(list);
}

/**
 * Build a single credential row.
 * @param {object} cred
 * @returns {HTMLLIElement}
 */
function buildCredentialRow(cred) {
  const li = document.createElement("li");
  li.className = "cred-row";

  // Credential ID excerpt (first 12 + last 4 chars).
  const idSpan = document.createElement("span");
  idSpan.className = "cred-row__id";
  const cid = cred.credential_id || "";
  const excerpt =
    cid.length > 20
      ? cid.slice(0, 12) + "\u2026" + cid.slice(-4)
      : cid;
  idSpan.textContent = excerpt;
  li.appendChild(idSpan);

  // Last used
  const dateSpan = document.createElement("span");
  dateSpan.className = "cred-row__date";
  dateSpan.textContent = formatLastUsed(cred.last_used_at);
  li.appendChild(dateSpan);

  // Delete button — hidden when there's only one credential (the server would
  // reject it anyway, so don't show an action that will always fail).
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "admin-btn admin-btn--danger admin-btn--sm cred-row__delete";
  delBtn.textContent = "Remove";
  delBtn.addEventListener("click", function () {
    handleDeleteCredential(cred.id, cred.credential_id);
  });
  li.appendChild(delBtn);

  return li;
}

/* ── Actions ──────────────────────────────────────────────────────────────── */

/**
 * Handle the "Add a Passkey" button: request options, run WebAuthn ceremony,
 * verify and refresh the list.
 */
async function handleAddPasskey() {
  const msg = document.getElementById("cred-message");
  if (!msg) return;

  msg.className = "cred-message cred-message--loading";
  msg.textContent = "Requesting registration challenge\u2026";

  try {
    if (!navigator.credentials || !window.PublicKeyCredential) {
      throw new Error(
        "This browser does not support passkeys. Use a recent browser over HTTPS (or localhost).",
      );
    }

    // 1 — Request server-side options (session-gated, not setup-token-gated).
    const options = await requestAddOptions();

    msg.textContent = "Contacting your authenticator\u2026";

    // 2 — WebAuthn ceremony (reuse Passkey helpers for buffer/pem conversion).
    let credential;
    try {
      credential = await navigator.credentials.create({
        publicKey: {
          challenge: Passkey.base64urlToBuffer(options.challenge),
          rp: { id: options.rp.id, name: options.rp.name },
          user: {
            id: Passkey.base64urlToBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          timeout: options.timeout,
          attestation: "none",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred",
          },
        },
      });
    } catch (error) {
      throw new Error(Passkey.describeCredentialError(error, "registration"));
    }
    if (!credential) {
      throw new Error("The authenticator did not return a credential. Try again.");
    }

    const response = credential.response;
    const publicKeyBuffer =
      typeof response.getPublicKey === "function"
        ? response.getPublicKey()
        : null;
    if (!publicKeyBuffer) {
      throw new Error(
        "This browser did not expose the credential's public key. Try a recent Chrome, Safari, or Edge.",
      );
    }

    // 3 — Verify on the server.
    msg.textContent = "Verifying credential\u2026";
    await verifyAddCredential({
      attemptId: options.attemptId,
      id: credential.id,
      clientDataJSON: Passkey.bufferToBase64url(response.clientDataJSON),
      publicKeyPem: Passkey.arrayBufferToPem(publicKeyBuffer),
    });

    // 4 — Refresh the list.
    msg.className = "cred-message cred-message--success";
    msg.textContent = "Passkey added successfully.";
    await refresh();
  } catch (error) {
    msg.className = "cred-message cred-message--error";
    msg.textContent = error.message;
  }
}

/**
 * Delete a credential after a browser confirmation.
 * @param {number} id — primary key
 * @param {string} credentialId — WebAuthn credential ID (for the confirm message)
 */
async function handleDeleteCredential(id, credentialId) {
  const msg = document.getElementById("cred-message");
  if (!msg) return;

  const excerpt =
    credentialId && credentialId.length > 20
      ? credentialId.slice(0, 12) + "\u2026" + credentialId.slice(-4)
      : credentialId;

  if (!confirm("Remove passkey \u201c" + excerpt + "\u201d?")) return;

  msg.className = "cred-message cred-message--loading";
  msg.textContent = "Removing\u2026";

  try {
    await deleteCredential(id);
    msg.className = "cred-message cred-message--success";
    msg.textContent = "Passkey removed.";
    await refresh();
  } catch (error) {
    msg.className = "cred-message cred-message--error";
    msg.textContent = error.message;
  }
}

/* ── Lifecycle ────────────────────────────────────────────────────────────── */

/**
 * Reload the credential list from the server and re-render.
 */
async function refresh() {
  try {
    const credentials = await fetchCredentials();
    renderCredentials(credentials);
  } catch (error) {
    container.innerHTML = "";
    const err = document.createElement("div");
    err.className = "admin-error";
    err.setAttribute("role", "alert");
    err.textContent = "Failed to load passkeys: " + error.message;
    container.appendChild(err);
  }
}

/**
 * Initialise the passkey management component inside the given DOM element.
 * Call once after the Settings page renders its shell.
 * @param {HTMLElement} el
 */
Cred.init = function (el) {
  container = el;
  refresh();
};
