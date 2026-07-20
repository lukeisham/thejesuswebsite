// Shared editor scaffold — encapsulates the session-check / id-param /
// data-load / loading-error boundary duplicated in every editor's
// DOMContentLoaded handler, plus the save/publish/delete/Ctrl+Enter button
// wiring duplicated in every editor's event-handler section. Per-type form
// assembly and payload building stay in each editor file via callbacks
// (JS-5: only goes through Admin.api.* / AdminHttp, never fetch() directly).
//
// Used by: admin/{evidence,essays,blog,debate,historiography}/edit-[id].html

window.AdminEditorScaffold = {};

var AdminEditorScaffold = window.AdminEditorScaffold;

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Session check + id param extraction + data load, with the loading/error
 * boundary each editor renders into `config.main` while that's happening.
 *
 * @param {{
 *   main: HTMLElement,
 *   apiPath: string,            e.g. "/evidence/admin/" (id is appended)
 *   entityLabel: string,        lowercase noun, e.g. "evidence" | "essay" | "blog post"
 *   onDataLoaded: function(data, ctx: {id, main}): void,
 *   backHref?: string,          default "index.html"
 *   idParamName?: string,       default "id"
 * }} config
 */
AdminEditorScaffold.initializeEditor = async function (config) {
  config = config || {};
  if (!config.main || !config.apiPath || !config.entityLabel) {
    console.warn(
      "AdminEditorScaffold.initializeEditor: main, apiPath, and entityLabel are required.",
    );
    return;
  }

  var main = config.main;
  var entityLabel = config.entityLabel;
  var backHref = config.backHref || "index.html";
  var idParamName = config.idParamName || "id";

  var ok = await AdminAuth.requireSession();
  if (!ok) {
    main.innerHTML =
      '<div class="admin-error" role="alert">Unable to verify session.</div>';
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var id = params.get(idParamName);

  if (!id) {
    main.innerHTML =
      '<div class="admin-error" role="alert">No ' +
      entityLabel +
      ' ID specified. <a href="' +
      backHref +
      '">Go back</a>.</div>';
    return;
  }

  var data;
  try {
    data = await Admin.api.get(config.apiPath + id);
  } catch (err) {
    main.innerHTML =
      '<div class="admin-error" role="alert">Failed to load ' +
      entityLabel +
      ": " +
      err.message +
      "</div>";
    return;
  }

  if (!data) {
    main.innerHTML =
      '<div class="admin-error" role="alert">' +
      capitalize(entityLabel) +
      ' not found. <a href="' +
      backHref +
      '">Go back</a>.</div>';
    return;
  }

  main.innerHTML = "";

  if (typeof config.onDataLoaded === "function") {
    config.onDataLoaded(data, { id: id, main: main });
  } else {
    console.warn(
      "AdminEditorScaffold.initializeEditor: config.onDataLoaded callback missing.",
    );
  }
};

/**
 * Wire the save button, publish/unpublish toggle, delete button (optional),
 * and the Ctrl+Enter shortcut. Per-type validation and payload assembly
 * stay in the caller via the `validateForm`/`buildPayload` callbacks so this
 * stays a scaffold, not a generic config-driven editor (Phase 3 is out of
 * scope for this plan).
 *
 * @param {{
 *   formError: HTMLElement,
 *   submitStatus: HTMLElement,
 *   saveBtn: HTMLElement,
 *   publishBtn: HTMLElement,
 *   validateForm: function(): boolean,   responsible for its own field-level
 *                                         error display + focusing the first
 *                                         invalid field
 *   buildPayload: function(): object,
 *   putPath: string,
 *   publishType: string,          e.g. "evidence" | "essays" | "blog-posts"
 *   recordId: string|number,
 *   data: {published_draft: number},   mutated in place as it toggles
 *   onSaveSuccess?: function(): void,
 *   delete?: {
 *     btn: HTMLElement,
 *     path: string,
 *     confirmMessage: string,
 *     idleLabel: string,
 *     redirectHref?: string,      default "index.html"
 *   },
 * }} config
 */
AdminEditorScaffold.wireFormHandlers = function (config) {
  config = config || {};
  var required = [
    "formError",
    "submitStatus",
    "saveBtn",
    "publishBtn",
    "validateForm",
    "buildPayload",
    "putPath",
    "publishType",
    "recordId",
    "data",
  ];
  var missing = required.filter(function (key) {
    return config[key] === undefined || config[key] === null;
  });
  if (missing.length) {
    console.warn(
      "AdminEditorScaffold.wireFormHandlers: missing required config keys: " +
        missing.join(", "),
    );
    return;
  }

  var formError = config.formError;
  var submitStatus = config.submitStatus;
  var saveBtn = config.saveBtn;
  var publishBtn = config.publishBtn;

  function showError(message) {
    formError.textContent = message;
    formError.style.display = "block";
  }

  function clearFormError() {
    formError.style.display = "none";
    formError.textContent = "";
  }

  saveBtn.addEventListener("click", async function () {
    clearFormError();
    submitStatus.textContent = "";
    if (!config.validateForm()) {
      return;
    }
    saveBtn.disabled = true;
    publishBtn.disabled = true;
    submitStatus.textContent = "Saving…";
    try {
      await Admin.api.put(config.putPath, config.buildPayload());
      submitStatus.innerHTML =
        '<span style="color:var(--admin-success)">Saved successfully.</span>';
      if (typeof config.onSaveSuccess === "function") config.onSaveSuccess();
    } catch (err) {
      showError("Failed to save: " + err.message);
    } finally {
      saveBtn.disabled = false;
      publishBtn.disabled = false;
    }
  });

  publishBtn.addEventListener("click", async function () {
    clearFormError();
    submitStatus.textContent = "";
    publishBtn.disabled = true;
    saveBtn.disabled = true;

    try {
      await Admin.api.put(config.putPath, config.buildPayload());
    } catch (err) {
      showError("Failed to save before publish: " + err.message);
      publishBtn.disabled = false;
      saveBtn.disabled = false;
      return;
    }

    try {
      if (config.data.published_draft) {
        await Admin.unpublishItem(config.publishType, config.recordId);
        config.data.published_draft = 0;
        publishBtn.textContent = "Publish";
      } else {
        await Admin.publishItem(config.publishType, config.recordId);
        config.data.published_draft = 1;
        publishBtn.textContent = "Unpublish";
      }
      submitStatus.innerHTML =
        '<span style="color:var(--admin-success)">' +
        (config.data.published_draft ? "Published!" : "Unpublished.") +
        "</span>";
    } catch (err) {
      showError("Publish action failed: " + err.message);
    } finally {
      publishBtn.disabled = false;
      saveBtn.disabled = false;
    }
  });

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveBtn.click();
    }
  });

  if (config.delete && config.delete.btn) {
    var del = config.delete;
    del.btn.addEventListener("click", async function () {
      if (!confirm(del.confirmMessage)) return;
      del.btn.disabled = true;
      del.btn.textContent = "Deleting…";
      try {
        await Admin.api.del(del.path);
        window.location.href = del.redirectHref || "index.html";
      } catch (err) {
        showError("Failed to delete: " + err.message);
        del.btn.disabled = false;
        del.btn.textContent = del.idleLabel;
      }
    });
  }
};
