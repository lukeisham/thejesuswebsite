// Single-image picker widget — file input + thumbnail preview + optional alt-text
// + remove button. Uploads via Admin.uploadImage and fires onChange on every change.
// Used by: blog hero image, challenge picture fields.
//
// Note: Admin MUST be loaded before this script so Admin.uploadImage is available.

window.AdminImagePicker = {};

var AdminImagePicker = window.AdminImagePicker;

/**
 * Build a picker and mount it into `container`.
 *
 * @param {Element} container
 * @param {{ initialPath?: string, initialAlt?: string, initialThumb?: string, onChange?: function }?} opts
 * @returns {{ getValue: function, setValue: function }}
 */
AdminImagePicker.mount = function (container, opts) {
  if (!(container instanceof Element)) {
    throw new Error("AdminImagePicker.mount requires a DOM element container.");
  }

  opts = opts || {};

  var currentPath = opts.initialPath || "";
  var currentAlt = opts.initialAlt || "";
  var currentThumb = opts.initialThumb || "";

  // ── Build DOM (JS-6: element factories, never innerHTML with user data) ──

  var root = document.createElement("div");
  root.className = "aimg-picker";

  // Hidden file input
  var fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/gif,image/webp";
  fileInput.className = "aimg-picker__input";
  fileInput.setAttribute("aria-label", "Choose an image file");

  // Upload button (covers the hidden file input)
  var uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "admin-btn admin-btn--secondary admin-btn--sm aimg-picker__upload-btn";
  uploadBtn.textContent = "Choose Image";

  // Thumbnail preview
  var thumbnail = document.createElement("img");
  thumbnail.className = "aimg-picker__thumbnail";
  thumbnail.alt = "";
  if (currentPath) {
    thumbnail.src = currentPath;
    thumbnail.hidden = false;
  } else {
    thumbnail.hidden = true;
  }

  // Remove button
  var removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "admin-btn admin-btn--danger admin-btn--sm aimg-picker__remove-btn";
  removeBtn.textContent = "Remove";
  if (!currentPath) {
    removeBtn.hidden = true;
  }

  // Alt-text field
  var altGroup = document.createElement("div");
  altGroup.className = "admin-form-group";
  altGroup.style.marginTop = "var(--space-sm)";

  var altLabel = document.createElement("label");
  altLabel.className = "admin-form-group__label";
  altLabel.setAttribute("for", "aimg-picker-alt-" + Math.random().toString(36).slice(2, 8));
  altLabel.textContent = "Alt Text";

  var altInput = document.createElement("input");
  altInput.type = "text";
  altInput.className = "admin-input";
  altInput.id = altLabel.getAttribute("for");
  altInput.value = currentAlt;
  altInput.placeholder = "Describe the image for screen readers";
  altInput.setAttribute("aria-describedby", altInput.id + "-hint");

  var altHint = document.createElement("span");
  altHint.className = "admin-form-hint";
  altHint.id = altInput.id + "-hint";
  altHint.textContent = "A short description of the image for accessibility.";

  altGroup.appendChild(altLabel);
  altGroup.appendChild(altInput);
  altGroup.appendChild(altHint);

  // Status message (for upload errors)
  var statusEl = document.createElement("span");
  statusEl.className = "aimg-picker__status";
  statusEl.setAttribute("role", "alert");

  // Assemble
  root.appendChild(fileInput);
  root.appendChild(uploadBtn);
  root.appendChild(thumbnail);
  root.appendChild(removeBtn);
  root.appendChild(statusEl);
  root.appendChild(altGroup);

  container.appendChild(root);

  // ── Events ──

  function fireChange() {
    if (typeof opts.onChange === "function") {
      opts.onChange({
        image_path: currentPath,
        alt: currentAlt,
        thumb_path: currentThumb,
      });
    }
  }

  function setUploading(isUploading) {
    uploadBtn.disabled = isUploading;
    uploadBtn.textContent = isUploading ? "Uploading…" : "Choose Image";
  }

  var startUpload = async function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;

    statusEl.textContent = "";
    statusEl.className = "aimg-picker__status";
    setUploading(true);

    try {
      var result = await Admin.uploadImage(file);
      currentPath = result.image_path;
      currentThumb = result.thumb_path || "";
      thumbnail.src = currentPath;
      thumbnail.hidden = false;
      removeBtn.hidden = false;
      fireChange();
    } catch (err) {
      statusEl.textContent = err.message || "Upload failed.";
      statusEl.className = "aimg-picker__status aimg-picker__status--error";
    } finally {
      setUploading(false);
      fileInput.value = "";
    }
  };

  uploadBtn.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    startUpload();
  });

  removeBtn.addEventListener("click", function () {
    currentPath = "";
    currentAlt = "";
    currentThumb = "";
    thumbnail.src = "";
    thumbnail.hidden = true;
    removeBtn.hidden = true;
    altInput.value = "";
    statusEl.textContent = "";
    statusEl.className = "aimg-picker__status";
    fileInput.value = "";
    fireChange();
  });

  altInput.addEventListener("input", function () {
    currentAlt = altInput.value;
    fireChange();
  });

  // ── Public API ──

  return {
    getValue: function () {
      return {
        image_path: currentPath,
        alt: currentAlt,
        thumb_path: currentThumb,
      };
    },
    setValue: function (path, alt, thumb) {
      currentPath = path || "";
      currentAlt = alt || "";
      currentThumb = thumb || "";
      if (currentPath) {
        thumbnail.src = currentPath;
        thumbnail.hidden = false;
        removeBtn.hidden = false;
      } else {
        thumbnail.src = "";
        thumbnail.hidden = true;
        removeBtn.hidden = true;
      }
      altInput.value = currentAlt;
      fireChange();
    },
  };
};
