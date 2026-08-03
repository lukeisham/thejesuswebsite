/**
 * Central identifiers admin page (admin/identifiers/index.html).
 *
 * One table listing every identifier, plus a single create/edit form that is
 * reused for both operations. All rows come from GET /identifiers/admin;
 * writes go through POST/PUT/DELETE /identifiers/:id.
 *
 * DOM is built with element factories, never innerHTML with API data (JS-6).
 * Row buttons are wired via delegation on the tbody so re-rendering the list
 * never leaves stale listeners behind.
 */

window.AdminIdentifiers = {};

var AdminIdentifiers = window.AdminIdentifiers;

// Identifier records carry one type's worth of fields; the rest stay NULL.
// This table drives both the grouped form and the "Type" column in the list.
var FIELD_GROUPS = [
  {
    key: "isbn",
    label: "Book (ISBN)",
    fields: [
      { name: "isbn", label: "ISBN" },
      { name: "isbn_book_title", label: "Book title" },
      { name: "isbn_book_author", label: "Book author" },
    ],
  },
  {
    key: "iaa",
    label: "IAA",
    fields: [
      { name: "iaa_number", label: "IAA number" },
      { name: "iaa_location", label: "IAA location" },
    ],
  },
  {
    key: "pleiades",
    label: "Pleiades",
    fields: [
      { name: "pleiades_number", label: "Pleiades number" },
      { name: "pleiades_name", label: "Pleiades name" },
    ],
  },
  {
    key: "event",
    label: "Event",
    fields: [
      { name: "event_name", label: "Event name" },
      { name: "event_date", label: "Event date" },
      { name: "event_location", label: "Event location" },
    ],
  },
  {
    key: "source",
    label: "Source",
    fields: [
      { name: "source_title", label: "Source title" },
      { name: "source_author", label: "Source author" },
      { name: "source_date", label: "Source date" },
      { name: "source_location", label: "Source location" },
    ],
  },
  {
    key: "individual",
    label: "Individual",
    fields: [
      { name: "individual", label: "Individual" },
      { name: "individual_location", label: "Individual location" },
    ],
  },
  {
    key: "manuscript",
    label: "Manuscript",
    fields: [
      { name: "manuscript_number", label: "Manuscript number" },
      { name: "manuscript_title", label: "Manuscript title" },
      { name: "manuscript_location", label: "Manuscript location" },
    ],
  },
];

var EM_DASH = "—";

var identifiers = [];
var editingId = null; // null = the form is in "create" mode
var els = {};

/* ── helpers ───────────────────────────────────────────────────────────── */

function notify(message, type) {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  }
}

function showError(message) {
  els.error.textContent = message;
  els.error.style.display = "block";
  notify(message, "error");
}

function clearError() {
  els.error.textContent = "";
  els.error.style.display = "none";
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

/**
 * Which type group a record belongs to — the first group with any field set.
 * @returns {string} the group's label, or an em dash when nothing is filled.
 */
function typeLabelFor(item) {
  for (var i = 0; i < FIELD_GROUPS.length; i++) {
    var group = FIELD_GROUPS[i];
    for (var j = 0; j < group.fields.length; j++) {
      if (hasValue(item[group.fields[j].name])) return group.label;
    }
  }
  return EM_DASH;
}

function fieldInputId(name) {
  return "ident-" + name.replace(/_/g, "-");
}

/* ── form ──────────────────────────────────────────────────────────────── */

function buildFormGroup(field) {
  var wrap = document.createElement("div");
  wrap.className = "admin-form-group";

  var label = document.createElement("label");
  label.className = "admin-form-group__label";
  label.htmlFor = fieldInputId(field.name);
  label.textContent = field.label;
  wrap.appendChild(label);

  var input = document.createElement("input");
  input.className = "admin-input";
  input.type = "text";
  input.id = fieldInputId(field.name);
  input.name = field.name;
  wrap.appendChild(input);

  return wrap;
}

/** Build the grouped type sections once, at boot. */
function buildTypeSections(container) {
  FIELD_GROUPS.forEach(function (group) {
    var section = document.createElement("fieldset");
    section.className = "identifier-fieldset";

    var legend = document.createElement("legend");
    legend.className = "identifier-fieldset__legend";
    legend.textContent = group.label;
    section.appendChild(legend);

    var grid = document.createElement("div");
    grid.className = "identifier-field-grid";
    group.fields.forEach(function (field) {
      grid.appendChild(buildFormGroup(field));
    });
    section.appendChild(grid);

    container.appendChild(section);
  });
}

function eachField(callback) {
  FIELD_GROUPS.forEach(function (group) {
    group.fields.forEach(callback);
  });
}

function resetForm() {
  els.title.value = "";
  els.externalUrl.value = "";
  els.publish.checked = false;
  eachField(function (field) {
    document.getElementById(fieldInputId(field.name)).value = "";
  });
}

function fillForm(item) {
  els.title.value = item.title || "";
  els.externalUrl.value = item.external_url || "";
  els.publish.checked = !!item.published_draft;
  eachField(function (field) {
    document.getElementById(fieldInputId(field.name)).value =
      item[field.name] || "";
  });
}

/** Collect the form into a request payload. Empty strings are sent as null. */
function readForm() {
  var payload = {
    title: els.title.value.trim() || null,
    external_url: els.externalUrl.value.trim() || null,
    published_draft: els.publish.checked ? 1 : 0,
  };
  eachField(function (field) {
    payload[field.name] =
      document.getElementById(fieldInputId(field.name)).value.trim() || null;
  });
  return payload;
}

function openForm(item) {
  clearError();
  editingId = item ? item.id : null;
  els.formTitle.textContent = item ? "Edit Identifier" : "New Identifier";
  els.save.textContent = item ? "Save Changes" : "Create Identifier";
  if (item) fillForm(item);
  else resetForm();
  els.form.style.display = "block";
  els.form.scrollIntoView({ behavior: "smooth" });
  els.title.focus();
}

function closeForm() {
  els.form.style.display = "none";
  editingId = null;
}

async function submitForm() {
  clearError();
  var payload = readForm();

  els.save.disabled = true;
  var previousLabel = els.save.textContent;
  els.save.textContent = "Saving…";
  try {
    if (editingId === null) {
      await Admin.api.post("/identifiers", payload);
      notify("Identifier created.", "success");
    } else {
      await Admin.api.put("/identifiers/" + editingId, payload);
      notify("Identifier updated.", "success");
    }
    closeForm();
    await loadIdentifiers();
    renderTable();
  } catch (err) {
    showError("Failed to save identifier: " + err.message);
  } finally {
    els.save.disabled = false;
    els.save.textContent = previousLabel;
  }
}

/* ── delete confirmation ───────────────────────────────────────────────── */

function confirmDelete(item) {
  var existing = document.querySelector(".admin-modal-backdrop");
  if (existing) existing.remove();

  var backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";
  backdrop.addEventListener("click", function (event) {
    if (event.target === backdrop) backdrop.remove();
  });

  var modal = document.createElement("div");
  modal.className = "admin-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  var heading = document.createElement("h2");
  heading.className = "admin-modal__title";
  heading.textContent = "Delete identifier?";
  modal.appendChild(heading);

  var body = document.createElement("div");
  body.className = "admin-modal__body";
  var paragraph = document.createElement("p");
  paragraph.textContent =
    "Delete #" +
    item.id +
    " " +
    (item.title || typeLabelFor(item)) +
    "? This cannot be undone.";
  body.appendChild(paragraph);
  modal.appendChild(body);

  var actions = document.createElement("div");
  actions.className = "admin-modal__actions";

  var confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "admin-btn admin-btn--danger";
  confirmBtn.textContent = "Delete";
  confirmBtn.addEventListener("click", async function () {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting…";
    try {
      await Admin.api.del("/identifiers/" + item.id);
      backdrop.remove();
      if (editingId === item.id) closeForm();
      notify("Identifier deleted.", "success");
      await loadIdentifiers();
      renderTable();
    } catch (err) {
      backdrop.remove();
      showError("Failed to delete identifier: " + err.message);
    }
  });
  actions.appendChild(confirmBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "admin-btn admin-btn--ghost";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", function () { backdrop.remove(); });
  actions.appendChild(cancelBtn);

  modal.appendChild(actions);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  confirmBtn.focus();
}

/* ── table ─────────────────────────────────────────────────────────────── */

function buildRow(item) {
  var tr = document.createElement("tr");
  tr.dataset.id = String(item.id);

  var tdId = document.createElement("td");
  tdId.textContent = item.id;
  tr.appendChild(tdId);

  var tdTitle = document.createElement("td");
  var strong = document.createElement("strong");
  strong.textContent = item.title || "(untitled)";
  tdTitle.appendChild(strong);
  tr.appendChild(tdTitle);

  var tdUrl = document.createElement("td");
  if (hasValue(item.external_url)) {
    var link = document.createElement("a");
    link.className = "identifier-url";
    link.href = item.external_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.external_url;
    tdUrl.appendChild(link);
  } else {
    tdUrl.textContent = EM_DASH;
  }
  tr.appendChild(tdUrl);

  var tdType = document.createElement("td");
  var badge = document.createElement("span");
  badge.className = "identifier-type-badge";
  badge.textContent = typeLabelFor(item);
  tdType.appendChild(badge);
  tr.appendChild(tdType);

  var tdStatus = document.createElement("td");
  tdStatus.appendChild(Admin.statusBadge(item.published_draft));
  tr.appendChild(tdStatus);

  var tdActions = document.createElement("td");
  tdActions.className = "identifier-actions";

  var editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "admin-btn admin-btn--sm admin-btn--secondary";
  editBtn.dataset.action = "edit";
  editBtn.textContent = "Edit";
  tdActions.appendChild(editBtn);

  var delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "admin-btn admin-btn--sm admin-btn--danger";
  delBtn.dataset.action = "delete";
  delBtn.textContent = "Delete";
  tdActions.appendChild(delBtn);

  tr.appendChild(tdActions);
  return tr;
}

function renderTable() {
  els.tbody.textContent = "";
  els.empty.style.display = identifiers.length ? "none" : "block";
  els.tableWrapper.style.display = identifiers.length ? "" : "none";
  identifiers.forEach(function (item) {
    els.tbody.appendChild(buildRow(item));
  });
}

function onTableClick(event) {
  var button = event.target.closest("button[data-action]");
  if (!button) return;
  var row = button.closest("tr[data-id]");
  if (!row) return;

  var id = Number(row.dataset.id);
  var item = identifiers.find(function (candidate) {
    return candidate.id === id;
  });
  if (!item) return;

  if (button.dataset.action === "edit") openForm(item);
  else if (button.dataset.action === "delete") confirmDelete(item);
}

/* ── boot ──────────────────────────────────────────────────────────────── */

async function loadIdentifiers() {
  identifiers = await Admin.api.get("/identifiers/admin");
}

AdminIdentifiers.init = async function () {
  els = {
    loading: document.getElementById("identifiers-loading"),
    error: document.getElementById("identifiers-error"),
    empty: document.getElementById("identifiers-empty"),
    tableWrapper: document.getElementById("identifiers-table-wrapper"),
    tbody: document.getElementById("identifiers-tbody"),
    form: document.getElementById("identifier-form"),
    formTitle: document.getElementById("identifier-form-title"),
    fieldSections: document.getElementById("identifier-type-sections"),
    title: document.getElementById("ident-title"),
    externalUrl: document.getElementById("ident-external-url"),
    publish: document.getElementById("ident-published"),
    save: document.getElementById("btn-save-identifier"),
  };

  buildTypeSections(els.fieldSections);

  document
    .getElementById("btn-new-identifier")
    .addEventListener("click", function () { openForm(null); });
  document
    .getElementById("btn-cancel-identifier")
    .addEventListener("click", closeForm);
  els.save.addEventListener("click", submitForm);
  els.tbody.addEventListener("click", onTableClick);

  var ok = await AdminAuth.requireSession();
  if (!ok) {
    els.loading.remove();
    showError("Unable to verify session.");
    return;
  }

  try {
    await loadIdentifiers();
    renderTable();
  } catch (err) {
    showError("Failed to load identifiers: " + err.message);
  } finally {
    els.loading.remove();
  }
};

document.addEventListener("DOMContentLoaded", function () {
  AdminIdentifiers.init();
});
