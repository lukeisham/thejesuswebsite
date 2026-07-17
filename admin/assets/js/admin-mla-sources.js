// Reusable MLA Bibliography panel — attach/detach existing mla_sources, create
// new ones, edit them inline. Used by evidence, essays, historiography,
// responses, and blog post editors (JS-6: DOM built with element factories,
// never innerHTML with source data; event delegation for the attached list).
//
// Note: Admin MUST be loaded before this script so Admin.api is available.

window.AdminMlaSources = {};

var AdminMlaSources = window.AdminMlaSources;

var HINT_TEXT = {
  default:
    'Cite sources inline using MLA parenthetical style — e.g. "(Wright 214)" — ' +
    "where the author surname (and page) matches a source attached below. " +
    "The public page renders attached sources as the full MLA reference list.",
  blog:
    'Cite sources inline using MLA parenthetical style — e.g. "(Wright 214)" — ' +
    "matching a source attached below. Inline citations render as parenthetical " +
    '"(Author)" text in the post body. Attached sources render as a full ' +
    "Bibliography at the end of the post on the public site.",
};

/**
 * Format an mla_sources row into a single-line MLA-ish citation string for
 * display in the admin (not the full public typographic rendering).
 *
 * @param {object} source
 * @returns {string}
 */
function formatCitation(source) {
  if (source.mla_journal_article_title) {
    var parts = [];
    if (source.mla_journal_article_author)
      parts.push(source.mla_journal_article_author + ".");
    parts.push('"' + source.mla_journal_article_title + '."');
    if (source.mla_journal_title) parts.push(source.mla_journal_title + ",");
    if (source.mla_journal_volume)
      parts.push("vol. " + source.mla_journal_volume + ",");
    if (source.mla_journal_issue)
      parts.push("no. " + source.mla_journal_issue + ",");
    if (source.mla_journal_date) parts.push(source.mla_journal_date + ",");
    if (source.mla_journal_page_reference)
      parts.push("pp. " + source.mla_journal_page_reference + ".");
    return parts.join(" ");
  }
  if (source.mla_book_title) {
    var bParts = [];
    if (source.mla_book_author) bParts.push(source.mla_book_author + ".");
    bParts.push(source.mla_book_title + ".");
    if (source.mla_book_publisher) bParts.push(source.mla_book_publisher + ",");
    if (source.mla_book_date) bParts.push(source.mla_book_date + ".");
    if (source.mla_book_page_reference)
      bParts.push("p. " + source.mla_book_page_reference + ".");
    return bParts.join(" ");
  }
  if (source.mla_website_title) {
    var wParts = [];
    if (source.mla_website_author) wParts.push(source.mla_website_author + ".");
    wParts.push('"' + source.mla_website_title + '."');
    if (source.mla_website_publisher)
      wParts.push(source.mla_website_publisher + ",");
    if (source.mla_website_date) wParts.push(source.mla_website_date + ",");
    if (source.mla_website_url) wParts.push(source.mla_website_url + ".");
    return wParts.join(" ");
  }
  return "Untitled source (#" + source.id + ")";
}

var FIELD_GROUPS = {
  website: [
    { key: "mla_website_author", label: "Author" },
    { key: "mla_website_title", label: "Title" },
    { key: "mla_website_publisher", label: "Publisher / Site Name" },
    { key: "mla_website_date", label: "Date" },
    { key: "mla_website_url", label: "URL" },
  ],
  book: [
    { key: "mla_book_author", label: "Author" },
    { key: "mla_book_title", label: "Title" },
    { key: "mla_book_publisher", label: "Publisher" },
    { key: "mla_book_date", label: "Date" },
    { key: "mla_book_page_reference", label: "Page Reference" },
  ],
  journal: [
    { key: "mla_journal_article_author", label: "Author" },
    { key: "mla_journal_article_title", label: "Article Title" },
    { key: "mla_journal_title", label: "Journal Title" },
    { key: "mla_journal_volume", label: "Volume" },
    { key: "mla_journal_issue", label: "Issue" },
    { key: "mla_journal_date", label: "Date" },
    { key: "mla_journal_page_reference", label: "Page Reference" },
  ],
};

/**
 * Build the panel and mount it into `container`.
 *
 * @param {Element} container
 * @param {{ initialSourceIds?: number[], hintVariant?: 'default'|'blog' }?} opts
 * @returns {{ getSelectedIds: function }}
 */
AdminMlaSources.mount = function (container, opts) {
  if (!(container instanceof Element)) {
    throw new Error("AdminMlaSources.mount requires a DOM element container.");
  }

  opts = opts || {};
  var selectedIds = (opts.initialSourceIds || []).slice();
  var catalog = []; // full mla_sources rows, fetched once
  var catalogById = {};

  var root = document.createElement("div");
  root.className = "amla-panel";

  var hint = document.createElement("span");
  hint.className = "admin-form-hint amla-panel__hint";
  hint.textContent = HINT_TEXT[opts.hintVariant] || HINT_TEXT.default;

  var listEl = document.createElement("ul");
  listEl.className = "amla-panel__list";

  var attachRow = document.createElement("div");
  attachRow.className = "amla-panel__attach-row";

  var attachSelect = document.createElement("select");
  attachSelect.className = "admin-select amla-panel__attach-select";

  var attachBtn = document.createElement("button");
  attachBtn.type = "button";
  attachBtn.className = "admin-btn admin-btn--secondary admin-btn--sm";
  attachBtn.textContent = "Attach";

  attachRow.appendChild(attachSelect);
  attachRow.appendChild(attachBtn);

  var addToggleBtn = document.createElement("button");
  addToggleBtn.type = "button";
  addToggleBtn.className =
    "admin-btn admin-btn--ghost admin-btn--sm amla-panel__add-toggle";
  addToggleBtn.textContent = "+ Add new source";

  var formHost = document.createElement("div");
  formHost.className = "amla-panel__form-host";
  formHost.hidden = true;

  var statusEl = document.createElement("span");
  statusEl.className = "amla-panel__status";
  statusEl.setAttribute("role", "alert");

  root.appendChild(hint);
  root.appendChild(listEl);
  root.appendChild(attachRow);
  root.appendChild(addToggleBtn);
  root.appendChild(formHost);
  root.appendChild(statusEl);
  container.appendChild(root);

  function setStatus(message, isError) {
    statusEl.textContent = message || "";
    statusEl.className = isError
      ? "amla-panel__status amla-panel__status--error"
      : "amla-panel__status";
  }

  function renderAttachedList() {
    listEl.textContent = "";
    selectedIds.forEach(function (id) {
      var source = catalogById[id];
      var li = document.createElement("li");
      li.className = "amla-panel__item";
      li.dataset.sourceId = String(id);

      var text = document.createElement("span");
      text.className = "amla-panel__item-text";
      text.textContent = source
        ? formatCitation(source)
        : "Source #" + id + " (not found)";
      li.appendChild(text);

      // Per-row marker hint: shows the exact [mla:N] marker for this source
      var markerHint = document.createElement("span");
      markerHint.className = "amla-panel__item-marker";
      markerHint.style.cssText =
        "display:block;font-size:0.75rem;color:var(--admin-text-secondary, #5a6472);margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;";
      markerHint.textContent = "Marker: [mla:" + id + "]";
      li.appendChild(markerHint);

      var actions = document.createElement("span");
      actions.className = "amla-panel__item-actions";

      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      editBtn.textContent = "Edit";
      editBtn.dataset.action = "edit";
      actions.appendChild(editBtn);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
      removeBtn.textContent = "Remove";
      removeBtn.dataset.action = "remove";
      actions.appendChild(removeBtn);

      li.appendChild(actions);
      listEl.appendChild(li);
    });
  }

  function renderAttachSelect() {
    attachSelect.textContent = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— Select a source to attach —";
    attachSelect.appendChild(placeholder);

    catalog
      .filter(function (source) {
        return selectedIds.indexOf(source.id) === -1;
      })
      .forEach(function (source) {
        var option = document.createElement("option");
        option.value = String(source.id);
        option.textContent = formatCitation(source);
        attachSelect.appendChild(option);
      });
  }

  function refreshCatalogIndex() {
    catalogById = {};
    catalog.forEach(function (source) {
      catalogById[source.id] = source;
    });
  }

  async function reload() {
    try {
      var sources = await Admin.api.get("/sources");
      catalog = sources || [];
      refreshCatalogIndex();
      renderAttachedList();
      renderAttachSelect();
    } catch (err) {
      setStatus(err.message || "Failed to load sources.", true);
    }
  }

  // ── Attach existing ──

  attachBtn.addEventListener("click", function () {
    var id = Number(attachSelect.value);
    if (!id) return;
    selectedIds.push(id);
    renderAttachedList();
    renderAttachSelect();
    setStatus("");
  });

  // ── Detach / edit (event delegation on the list, JS-6) ──

  listEl.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-action]");
    if (!button) return;
    var li = button.closest("li[data-source-id]");
    if (!li) return;
    var id = Number(li.dataset.sourceId);

    if (button.dataset.action === "remove") {
      selectedIds = selectedIds.filter(function (existingId) {
        return existingId !== id;
      });
      renderAttachedList();
      renderAttachSelect();
      setStatus("");
    } else if (button.dataset.action === "edit") {
      openForm(catalogById[id]);
    }
  });

  // ── Add / edit form ──

  function fieldGroupForKind(kind) {
    return FIELD_GROUPS[kind] || FIELD_GROUPS.website;
  }

  function detectKind(source) {
    if (source && source.mla_journal_article_title) return "journal";
    if (source && source.mla_book_title) return "book";
    return "website";
  }

  function openForm(existingSource) {
    formHost.hidden = false;
    formHost.textContent = "";
    addToggleBtn.hidden = true;

    var kindSelect = document.createElement("select");
    kindSelect.className = "admin-select amla-panel__kind-select";
    ["website", "book", "journal"].forEach(function (kind) {
      var option = document.createElement("option");
      option.value = kind;
      option.textContent =
        kind === "website"
          ? "Website"
          : kind === "book"
            ? "Book"
            : "Journal Article";
      kindSelect.appendChild(option);
    });
    kindSelect.value = detectKind(existingSource);

    var fieldsHost = document.createElement("div");
    fieldsHost.className = "amla-panel__fields";

    var inputs = {};

    function renderFields(kind) {
      fieldsHost.textContent = "";
      inputs = {};
      fieldGroupForKind(kind).forEach(function (field) {
        var group = document.createElement("div");
        group.className = "admin-form-group";

        var label = document.createElement("label");
        var inputId =
          "amla-" + field.key + "-" + Math.random().toString(36).slice(2, 8);
        label.className = "admin-form-group__label";
        label.setAttribute("for", inputId);
        label.textContent = field.label;

        var input = document.createElement("input");
        input.type = "text";
        input.className = "admin-input";
        input.id = inputId;
        input.value = (existingSource && existingSource[field.key]) || "";

        group.appendChild(label);
        group.appendChild(input);
        fieldsHost.appendChild(group);
        inputs[field.key] = input;
      });
    }

    renderFields(kindSelect.value);
    kindSelect.addEventListener("change", function () {
      renderFields(kindSelect.value);
    });

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "admin-btn admin-btn--primary admin-btn--sm";
    saveBtn.textContent = existingSource ? "Save Changes" : "Create & Attach";

    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
    cancelBtn.textContent = "Cancel";

    function closeForm() {
      formHost.hidden = true;
      formHost.textContent = "";
      addToggleBtn.hidden = false;
      setStatus("");
    }

    saveBtn.addEventListener("click", async function () {
      var payload = {};
      Object.keys(inputs).forEach(function (key) {
        payload[key] = inputs[key].value.trim() || undefined;
      });

      saveBtn.disabled = true;
      try {
        var saved = existingSource
          ? await Admin.api.put("/sources/" + existingSource.id, payload)
          : await Admin.api.post("/sources", payload);

        var isNew = !existingSource;
        var existingIndex = catalog.findIndex(function (source) {
          return source.id === saved.id;
        });
        if (existingIndex === -1) {
          catalog.push(saved);
        } else {
          catalog[existingIndex] = saved;
        }
        refreshCatalogIndex();
        if (isNew) selectedIds.push(saved.id);
        renderAttachedList();
        renderAttachSelect();
        closeForm();
      } catch (err) {
        setStatus(err.message || "Failed to save source.", true);
      } finally {
        saveBtn.disabled = false;
      }
    });

    cancelBtn.addEventListener("click", closeForm);

    var actionsRow = document.createElement("div");
    actionsRow.className = "amla-panel__form-actions";
    actionsRow.appendChild(saveBtn);
    actionsRow.appendChild(cancelBtn);

    formHost.appendChild(kindSelect);
    formHost.appendChild(fieldsHost);
    formHost.appendChild(actionsRow);
  }

  addToggleBtn.addEventListener("click", function () {
    openForm(null);
  });

  reload();

  return {
    getSelectedIds: function () {
      return selectedIds.slice();
    },
  };
};
