// =============================================================================
//
//   THE JESUS WEBSITE — EDIT PICTURE MODULE
//   File:    js/2.0_records/dashboard/edit_picture.js
//   Version: 1.0.0
//   Purpose: Upload UI for record pictures (PNG resize/compress pipeline).
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js -> window.renderEditPicture(containerId, recordId)
// Function: Renders the picture upload section and handles the binary upload flow.
// Output: Injects picture management HTML into the specified container.

window.renderEditPicture = function (containerId, recordId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  /**
   * Internal stateful render function to redraw the UI after actions
   */
  const render = (pictureName = null) => {
    const html = `
            <section class="picture-upload-section">
                <h3 class="section-heading-mono">PICTURE UPLOAD</h3>

                <div class="picture-preview-container" id="picture-preview-area">
                    ${
                      pictureName
                        ? `<div class="picture-frame">
                             <div class="picture-placeholder">
                                <span class="placeholder-text">${pictureName}</span>
                             </div>
                             <p class="picture-caption">Fig. ${pictureName}</p>
                           </div>
                           <button id="remove-picture-btn" class="quick-action-btn btn-remove-picture">Remove Picture</button>`
                        : '<p class="no-picture-msg">No picture assigned to this record.</p>'
                    }
                </div>

                <div class="upload-controls">
                    <label for="picture-upload-input" class="upload-label-mono">SELECT PNG FILE:</label>
                    <div class="upload-input-group">
                        <input type="file" id="picture-upload-input" accept="image/png" class="upload-input-field">
                        <button id="upload-picture-btn" class="quick-action-btn">Upload Picture</button>
                    </div>
                </div>

                <div id="upload-status-area" class="status-feedback is-hidden">
                    <div class="status-indicator-block">
                        <span id="status-icon" class="status-dot"></span>
                        <span id="status-text" class="status-text-mono"></span>
                    </div>
                </div>
            </section>
        `;
    container.innerHTML = html;

    // Attach event listener
    const uploadBtn = document.getElementById("upload-picture-btn");
    const fileInput = document.getElementById("picture-upload-input");

    uploadBtn.addEventListener("click", async () => {
      const file = fileInput.files[0];
      if (!file) {
        showStatus("Please select a file first.", "error");
        return;
      }
      if (file.type !== "image/png") {
        showStatus("Error: Only PNG files are allowed.", "error");
        return;
      }

      await uploadPicture(recordId, file);
    });

    // Attach remove button listener (only rendered when picture exists)
    const removeBtn = document.getElementById("remove-picture-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", async () => {
        await deletePicture(recordId);
      });
    }
  };

  /**
   * Updates the status feedback area with messages and styling
   */
  const showStatus = (message, type) => {
    const statusArea = document.getElementById("upload-status-area");
    const statusText = document.getElementById("status-text");

    statusArea.className = `status-feedback status-${type}`;
    statusText.innerText = message.toUpperCase();
    statusArea.classList.remove("is-hidden");

    if (type === "loading") {
      statusArea.classList.add("pulse-animation");
    } else {
      statusArea.classList.remove("pulse-animation");
    }
  };

  /**
   * Async binary upload handler
   */
  const uploadPicture = async (id, file) => {
    showStatus("Uploading...", "loading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/records/${id}/picture`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        showStatus("Saved ✓", "success");
        // Redraw with the new filename after a short delay
        setTimeout(() => {
          render(result.picture_name);
        }, 1500);
      } else {
        showStatus(`Error: ${result.detail || "Upload failed"}`, "error");
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, "error");
    }
  };

  /**
   * Deletes the picture for the current record
   */
  const deletePicture = async (id) => {
    showStatus("Removing picture...", "loading");

    try {
      const response = await fetch(`/api/admin/records/${id}/picture`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        showStatus("Picture removed ✓", "success");
        // Redraw with the empty state after a short delay
        setTimeout(() => {
          render();
        }, 1500);
      } else {
        showStatus(`Error: ${result.detail || "Remove failed"}`, "error");
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, "error");
    }
  };

  // Bootstrap the initial view by fetching record metadata
  fetch(`/api/admin/records/${recordId}`, { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      render(data.picture_name);
    })
    .catch(() => {
      render(); // Fallback to empty state
    });
};
