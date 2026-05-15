// trigger:  Called by dashboard_records_single.js orchestrator on record edit load
// main:    renderEditPicture(containerId, recordId) — wires file input, previews, and upload
// output:  Interactive picture upload UI with client-side validation, previews, and API upload

// This is the authoritative copy — consumed by plan_dashboard_blog_posts, plan_dashboard_essay_historiography, plan_dashboard_challenge_response

/* =============================================================================
   THE JESUS WEBSITE — PICTURE HANDLER (SHARED TOOL)
   File:    js/9.0_cross_cutting/dashboard/picture_handler.js
   Version: 1.0.0
   Owner:   plan_relocate_shared_widgets_to_cross_cutting (9.0 Cross-Cutting)
   Trigger: Called by dashboard_records_single.js on record edit load to wire
            the picture upload UI. Consumer plans call window.renderEditPicture()
            and window.renderPictureName() via <script> tag inclusion.
   Main:    renderEditPicture(containerId, recordId) — wires file input change
            handler, renders full-size and thumbnail previews, enforces
            client-side PNG-only + ≤5 MB validation, and uploads to
            POST /api/admin/records/{recordId}/picture.
            renderPictureName(containerId, pictureName) — renders/updates
            the picture_name text field display.
   Output:  Functional image upload UI with preview. Errors route through
            window.surfaceError(). On successful upload, the backend stores
            resized picture_bytes (max 800px) and picture_thumbnail (max 200px).
   Consumer: plan_dashboard_blog_posts, plan_dashboard_essay_historiography,
             plan_dashboard_challenge_response
============================================================================= */

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const MAX_PICTURE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (server compresses to ≤250 KB)
const ALLOWED_MIME_TYPE = "image/png";
const API_BASE = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderEditPicture
   Wires the file input, full-size preview, thumbnail preview, and upload
   button for a record's picture. Enforces PNG-only + ≤5 MB client-side
   before allowing upload to POST /api/admin/records/{recordId}/picture.
----------------------------------------------------------------------------- */
function renderEditPicture(containerId, recordId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(
      "[picture_handler] renderEditPicture: container not found —",
      containerId,
    );
    return;
  }

  // Locate existing DOM elements (injected by the HTML template)
  const fileInput = document.getElementById("record-picture-upload");
  const fullPreview = document.getElementById("picture-preview-full");
  const thumbPreview = document.getElementById("picture-preview-thumb");

  if (!fileInput) {
    console.warn(
      "[picture_handler] renderEditPicture: #record-picture-upload not found",
    );
    return;
  }
  if (!fullPreview) {
    console.warn(
      "[picture_handler] renderEditPicture: #picture-preview-full not found",
    );
  }
  if (!thumbPreview) {
    console.warn(
      "[picture_handler] renderEditPicture: #picture-preview-thumb not found",
    );
  }

  // Ensure the file input accepts only PNG
  fileInput.setAttribute("accept", "image/png");

  // Inject an upload button if one doesn't already exist
  let uploadBtn = document.getElementById("btn-picture-upload");
  if (!uploadBtn) {
    const uploadArea =
      document.getElementById("picture-upload-area") || container;
    uploadBtn = document.createElement("button");
    uploadBtn.id = "btn-picture-upload";
    uploadBtn.className = "btn btn--primary";
    uploadBtn.type = "button";
    uploadBtn.textContent = "Upload Picture";
    uploadBtn.disabled = true;
    uploadBtn.style.marginTop = "var(--space-1)";
    uploadArea.appendChild(uploadBtn);
  }

  // Inject a delete picture button if one doesn't already exist
  let deletePicBtn = document.getElementById("btn-picture-delete");
  if (!deletePicBtn) {
    const uploadArea =
      document.getElementById("picture-upload-area") || container;
    deletePicBtn = document.createElement("button");
    deletePicBtn.id = "btn-picture-delete";
    deletePicBtn.className = "btn btn--danger";
    deletePicBtn.type = "button";
    deletePicBtn.textContent = "Delete Picture";
    deletePicBtn.style.marginTop = "var(--space-1)";
    deletePicBtn.style.marginLeft = "var(--space-1)";
    deletePicBtn.hidden = true;
    uploadArea.appendChild(deletePicBtn);
  }

  // Wire delete picture button
  if (deletePicBtn) {
    // If record has a saved picture_name, show the delete button
    var existingPicName = document.getElementById("record-picture-name");
    if (
      existingPicName &&
      existingPicName.value &&
      existingPicName.value.trim().length > 0
    ) {
      deletePicBtn.hidden = false;
    }

    if (!recordId) {
      deletePicBtn.disabled = true;
      deletePicBtn.title = "You must save the record before deleting a picture";
    }

    deletePicBtn.addEventListener("click", async function () {
      if (!recordId) {
        _surfaceError(
          "Error: Please save the record first before deleting a picture.",
        );
        return;
      }

      if (
        !confirm(
          "Are you sure you want to delete this picture? This cannot be undone.",
        )
      ) {
        return;
      }

      deletePicBtn.disabled = true;
      deletePicBtn.textContent = "Deleting…";

      try {
        const response = await fetch(
          API_BASE + "/records/" + encodeURIComponent(recordId) + "/picture",
          {
            method: "DELETE",
            headers: { "X-CSRF-Token": window.getCSRFToken() },
          },
        );

        if (!response.ok) {
          const errorBody = await response.json().catch(function () {
            return {};
          });
          var detail = errorBody.detail || "HTTP " + response.status;
          throw new Error(detail);
        }

        // Clear previews
        _clearPreview(fullPreview);
        _clearPreview(thumbPreview);

        // Clear picture name field
        _setPictureNameField("");

        // Reset file input
        fileInput.value = "";
        selectedFile = null;

        // Hide delete button, disable upload until new file selected
        deletePicBtn.hidden = true;
        if (uploadBtn) {
          uploadBtn.disabled = true;
          uploadBtn.textContent = "Upload Picture";
        }

        if (typeof window.surfaceError === "function") {
          window.surfaceError("Picture deleted successfully.");
        }
      } catch (error) {
        _surfaceError("Error: Failed to delete picture. " + error.message);
        deletePicBtn.disabled = false;
        deletePicBtn.textContent = "Delete Picture";
        console.error("[picture_handler] Delete failed:", error);
      }
    });
  }

  let selectedFile = null;

  /* -------------------------------------------------------------------------
       FILE INPUT CHANGE HANDLER
       Validates PNG type and ≤5 MB (server compresses to ≤250 KB), then
       renders previews in both full-size and thumbnail containers.
    ------------------------------------------------------------------------- */
  fileInput.addEventListener("change", function () {
    // Reset state
    selectedFile = null;

    if (uploadBtn) {
      uploadBtn.disabled = true;
    }

    // Clear previous previews
    _clearPreview(fullPreview);
    _clearPreview(thumbPreview);

    const file = fileInput.files[0];
    if (!file) {
      // User cancelled selection — nothing to do
      return;
    }

    // --- Client-side validation: PNG only ---
    if (file.type !== ALLOWED_MIME_TYPE) {
      _surfaceError(
        "Error: Unable to preview the selected image. Please choose a valid PNG file.",
      );
      fileInput.value = "";
      return;
    }

    // --- Client-side validation: ≤ 5 MB (server compresses to ≤250 KB) ---
    if (file.size > MAX_PICTURE_SIZE_BYTES) {
      _surfaceError(
        "Error: Image upload failed for '" +
          _getRecordTitle() +
          "'. Max 5 MB PNG only.",
      );
      fileInput.value = "";
      return;
    }

    // --- Render previews ---
    const reader = new FileReader();

    reader.onload = function (e) {
      const dataUrl = e.target.result;

      // Full-size preview
      _renderPreviewImage(fullPreview, dataUrl, file.name, 800);

      // Thumbnail preview
      _renderPreviewImage(thumbPreview, dataUrl, file.name, 200);
    };

    reader.onerror = function () {
      _surfaceError(
        "Error: Unable to preview the selected image. Please choose a valid PNG file.",
      );
      fileInput.value = "";
    };

    reader.readAsDataURL(file);

    // Mark file as valid and enable upload
    selectedFile = file;
    if (uploadBtn) {
      uploadBtn.disabled = false;
    }
  });

  /* -------------------------------------------------------------------------
       UPLOAD BUTTON CLICK HANDLER
       POSTs the validated file as multipart/form-data to the picture endpoint.
       On success, updates the picture_name text field. On failure, surfaces
       an error through window.surfaceError().
       Disabled when recordId is null (new record not yet saved).
    ------------------------------------------------------------------------- */
  if (uploadBtn) {
    // If no recordId yet, disable upload with a hint — the record must be
    // saved first (Save Draft or Publish) before a picture can be uploaded.
    if (!recordId) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Save record first to upload picture";
      uploadBtn.title = "You must save the record before uploading a picture";
    }

    uploadBtn.addEventListener("click", async function () {
      if (!recordId) {
        _surfaceError(
          "Error: Please save the record as Draft before uploading a picture.",
        );
        return;
      }

      if (!selectedFile) {
        _surfaceError(
          "Error: No image file selected. Please choose a valid PNG file.",
        );
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);

      // Disable button during upload to prevent double-submission
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading…";

      try {
        const response = await fetch(
          `${API_BASE}/records/${encodeURIComponent(recordId)}/picture`,
          {
            method: "POST",
            headers: { "X-CSRF-Token": window.getCSRFToken() },
            body: formData,
          },
        );

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const detail = errorBody.detail || `HTTP ${response.status}`;
          throw new Error(detail);
        }

        const result = await response.json();

        // On success, update the picture_name field
        if (result.picture_name) {
          _setPictureNameField(result.picture_name);
        }

        // Reset upload button state
        uploadBtn.textContent = "Upload Picture";
        uploadBtn.disabled = true;
        selectedFile = null;

        // Signal success via surfaceError (status message)
        if (typeof window.surfaceError === "function") {
          window.surfaceError(
            "Picture uploaded successfully: " + (result.picture_name || ""),
          );
        }
      } catch (error) {
        _surfaceError(
          "Error: Image upload failed for '" +
            _getRecordTitle() +
            "'. Max 5 MB PNG only.",
        );

        // Restore button state
        uploadBtn.textContent = "Upload Picture";
        uploadBtn.disabled = false;

        console.error("[picture_handler] Upload failed:", error);
      }
    });
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderPictureName
   Renders or updates the picture_name text field inside the given container.
   The target element has id "record-picture-name".
----------------------------------------------------------------------------- */
function renderPictureName(containerId, pictureName) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(
      "[picture_handler] renderPictureName: container not found —",
      containerId,
    );
    return;
  }

  _setPictureNameField(pictureName);
}

/* -----------------------------------------------------------------------------
   INTERNAL: Set the value of the picture_name text field
----------------------------------------------------------------------------- */
function _setPictureNameField(pictureName) {
  const nameField = document.getElementById("record-picture-name");
  if (nameField) {
    nameField.value = pictureName || "";
  } else {
    console.warn(
      "[picture_handler] _setPictureNameField: #record-picture-name not found",
    );
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Clear a preview container, restoring its placeholder
----------------------------------------------------------------------------- */
function _clearPreview(previewEl) {
  if (!previewEl) return;

  // Check if this is the full or thumb container to restore correct placeholder
  const isThumb = previewEl.id === "picture-preview-thumb";
  const placeholderText = isThumb
    ? "Thumbnail (200px)"
    : "Image Preview (max 800px)";

  previewEl.innerHTML = `<span class="picture-preview__placeholder">${placeholderText}</span>`;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Render an <img> into a preview container with styling
----------------------------------------------------------------------------- */
function _renderPreviewImage(previewEl, dataUrl, altText, maxWidthPx) {
  if (!previewEl) return;

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = altText || "Picture preview";
  img.className = "picture-preview__image";
  img.style.maxWidth = maxWidthPx + "px";
  img.style.width = "100%";
  img.style.height = "auto";
  img.style.display = "block";
  img.style.borderRadius = "var(--radius-sm)";
  img.style.border = "var(--border-width-thin) solid var(--color-border)";
  img.style.backgroundColor = "var(--color-bg-tertiary)";
  img.style.transition = "opacity var(--transition-fast)";

  previewEl.innerHTML = "";

  // Fade-in on load for a polished feel
  img.style.opacity = "0";
  previewEl.appendChild(img);

  img.onload = function () {
    img.style.opacity = "1";
  };

  // If the image is already cached / loads before onload fires
  if (img.complete) {
    img.style.opacity = "1";
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Resolve the record title for error messages
   Falls back to "this record" if window._recordTitle is not set.
----------------------------------------------------------------------------- */
function _getRecordTitle() {
  if (
    typeof window._recordTitle === "string" &&
    window._recordTitle.trim().length > 0
  ) {
    return window._recordTitle;
  }
  return "this record";
}

/* -----------------------------------------------------------------------------
   INTERNAL: Route an error message through the shared error handler
   Falls back to console.error if window.surfaceError is unavailable.
----------------------------------------------------------------------------- */
function _surfaceError(message) {
  if (typeof window.surfaceError === "function") {
    window.surfaceError(message);
  } else {
    console.error("[picture_handler]", message);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — all consumer plans call window.renderEditPicture()
   and window.renderPictureName() via <script> tag inclusion.
----------------------------------------------------------------------------- */
window.renderEditPicture = renderEditPicture;
window.renderPictureName = renderPictureName;
