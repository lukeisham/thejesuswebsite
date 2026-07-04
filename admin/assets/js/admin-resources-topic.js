/**
 * Shared script for admin resource topic pages.
 * Reads document.body.dataset.resourceCategory to determine which
 * resource list to load. Provides full CRUD with drag-to-reorder.
 *
 * @module admin-resources/topic
 */
(function () {
  const main = document.getElementById("resources-content");
  if (!main) return;

  const VALID_LIST_KEYS = [
    "sermons-and-sayings", "parables", "objects", "people", "sites",
    "ot-verses", "internal-witnesses", "external-witnesses", "places",
    "world-events", "miracles", "events", "apologetics", "manuscripts", "sources",
  ];

  const CATEGORY_LABELS = {
    "sermons-and-sayings": "Sermons &amp; Sayings",
    "parables": "Parables",
    "objects": "Objects",
    "people": "People",
    "sites": "Sites",
    "ot-verses": "OT Verses",
    "internal-witnesses": "Internal Witnesses",
    "external-witnesses": "External Witnesses",
    "places": "Places",
    "world-events": "World Events",
    "miracles": "Miracles",
    "events": "Events",
    "apologetics": "Apologetics",
    "manuscripts": "Manuscripts",
    "sources": "Sources",
  };

  const currentListKey = document.body.dataset.resourceCategory || null;
  let resources = [];
  let isDirty = false;

  function showError(msg) {
    let el = document.getElementById("global-error");
    if (!el) {
      el = document.createElement("div");
      el.className = "admin-error";
      el.id = "global-error";
      el.setAttribute("role", "alert");
      el.setAttribute("aria-live", "assertive");
      el.style.marginBottom = "var(--space-md)";
      main.insertBefore(el, main.firstChild);
    }
    el.textContent = msg;
    el.style.display = "block";
  }

  function clearError() {
    const el = document.getElementById("global-error");
    if (el) { el.style.display = "none"; el.textContent = ""; }
  }

  function render() {
    main.innerHTML = "";
    if (!currentListKey) {
      const hint = document.createElement("p");
      hint.className = "admin-text--muted";
      hint.style.cssText = "font-size:13px;margin-top:var(--space-sm);";
      hint.textContent = "No resource category selected.";
      main.appendChild(hint);
      return;
    }

    const header = document.createElement("div");
    header.className = "admin-resources-header";

    const backLink = document.createElement("a");
    backLink.href = "index.html";
    backLink.className = "admin-btn admin-btn--sm admin-btn--ghost";
    backLink.textContent = "\u2190 All Resources";
    header.appendChild(backLink);

    const keyGroup = document.createElement("div");
    keyGroup.className = "admin-form-group";
    keyGroup.innerHTML =
      '<label class="admin-form-group__label" for="list-key-select">Switch List</label>' +
      '<select class="admin-select" id="list-key-select">' +
      VALID_LIST_KEYS.map(function (k) {
        const label = CATEGORY_LABELS[k] || k;
        return '<option value="' + k + '.html"' + (currentListKey === k ? " selected" : "") + ">" + label + "</option>";
      }).join("") +
      "</select>";
    header.appendChild(keyGroup);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "admin-btn admin-btn--sm admin-btn--primary";
    addBtn.textContent = "+ Add Item";
    addBtn.id = "btn-add-item";
    header.appendChild(addBtn);
    main.appendChild(header);

    const statusBar = document.createElement("div");
    statusBar.className = "admin-save-bar";
    statusBar.style.marginBottom = "var(--space-md)";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "admin-btn admin-btn--sm admin-btn--secondary";
    saveBtn.id = "btn-save-all";
    saveBtn.textContent = "Save All Changes";
    const statusEl = document.createElement("span");
    statusEl.id = "resource-status";
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    statusBar.appendChild(saveBtn);
    statusBar.appendChild(statusEl);
    main.appendChild(statusBar);

    const listContainer = document.createElement("div");
    listContainer.id = "resource-list";
    listContainer.setAttribute("role", "list");
    listContainer.setAttribute("aria-label", "Resources for " + currentListKey);

    if (resources.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "admin-empty";
      emptyEl.setAttribute("role", "status");
      emptyEl.textContent = 'No resources in this list. Click "+ Add Item" to create one.';
      listContainer.appendChild(emptyEl);
    } else {
      resources.forEach(function (r) {
        listContainer.appendChild(buildRow(r));
      });
    }
    main.appendChild(listContainer);

    AdminRanking.init("#resource-list", {
      itemSelector: ".draggable-row",
      handleSelector: ".drag-handle",
      save: async function (orders) {
        isDirty = true;
        for (let i = 0; i < orders.length; i++) {
          const res = resources.find(function (r) { return r.id === orders[i].id; });
          if (res) res.sort_order = orders[i].sort_order;
        }
        resources.sort(function (a, b) {
          const aIdx = orders.findIndex(function (o) { return o.id === a.id; });
          const bIdx = orders.findIndex(function (o) { return o.id === b.id; });
          return aIdx - bIdx;
        });
        statusEl.textContent = "Order changed \u2014 click Save All to persist.";
        statusEl.style.color = "var(--admin-warning)";
      },
    });

    document.getElementById("list-key-select").addEventListener("change", function () {
      window.location.href = this.value;
    });

    document.getElementById("btn-add-item").addEventListener("click", function () {
      resources.push({
        id: "new_" + Date.now(),
        list_key: currentListKey,
        resource_title: "",
        resource_url: "",
        resource_description: "",
        sort_order: resources.length,
        published_draft: 0,
        _isNew: true,
      });
      isDirty = true;
      render();
    });

    document.getElementById("btn-save-all").addEventListener("click", function () {
      saveAllChanges();
    });

    document.getElementById("resource-list").addEventListener("click", function (e) {
      const delBtn = e.target.closest(".btn-delete-resource");
      if (!delBtn) return;
      e.preventDefault();
      const row = delBtn.closest(".draggable-row");
      if (!row) return;
      const id = row.dataset.id;
      const res = resources.find(function (r) { return String(r.id) === id; });
      if (!res) return;
      if (res._isNew) {
        resources = resources.filter(function (r) { return r.id !== id; });
        row.remove();
        isDirty = true;
      } else {
        if (!confirm('Delete resource "' + (res.resource_title || "untitled") + '"?')) return;
        deleteResource(res.id, row);
      }
    });

    async function deleteResource(id, rowEl) {
      try {
        await Admin.api.del("/resources/" + id);
        resources = resources.filter(function (r) { return r.id !== id; });
        if (rowEl) rowEl.remove();
        statusEl.textContent = "Resource deleted.";
        statusEl.style.color = "var(--admin-success)";
      } catch (err) {
        showError("Failed to delete: " + err.message);
      }
    }

    async function saveAllChanges() {
      clearError();
      const saveBtn = document.getElementById("btn-save-all");
      saveBtn.disabled = true;
      statusEl.textContent = "Saving\u2026";
      statusEl.style.color = "var(--admin-text-secondary)";

      let successCount = 0;
      let failCount = 0;
      const rows = document.querySelectorAll(".draggable-row");
      rows.forEach(function (row, idx) {
        const id = row.dataset.id;
        const res = resources.find(function (r) { return String(r.id) === id; });
        if (!res) return;
        const titleInput = row.querySelector(".res-title");
        const urlInput = row.querySelector(".res-url");
        const descInput = row.querySelector(".res-desc");
        if (titleInput) res.resource_title = titleInput.value.trim();
        if (urlInput) res.resource_url = urlInput.value.trim();
        if (descInput) res.resource_description = descInput.value.trim();
        res.sort_order = idx;
      });

      const tempIdMap = {};
      for (let i = 0; i < resources.length; i++) {
        const r = resources[i];
        const payload = {
          list_key: r.list_key,
          resource_title: r.resource_title || "Untitled",
          resource_url: r.resource_url || undefined,
          resource_description: r.resource_description || undefined,
          sort_order: r.sort_order,
          published_draft: r.published_draft,
        };
        try {
          if (r._isNew) {
            const tempId = String(r.id);
            const created = await Admin.api.post("/resources", payload);
            tempIdMap[tempId] = created.id;
            r.id = created.id;
            r._isNew = false;
          } else {
            await Admin.api.put("/resources/" + r.id, payload);
          }
          successCount++;
        } catch (err) {
          failCount++;
          console.error("Save failed for resource:", r, err);
        }
      }

      Object.keys(tempIdMap).forEach(function (tempId) {
        const rowEl = document.querySelector('.draggable-row[data-id="' + tempId + '"]');
        if (rowEl) rowEl.dataset.id = tempIdMap[tempId];
      });

      isDirty = false;
      saveBtn.disabled = false;
      statusEl.textContent = "Saved: " + successCount + " succeeded" + (failCount > 0 ? ", " + failCount + " failed" : "") + ".";
      statusEl.style.color = failCount > 0 ? "var(--admin-danger)" : "var(--admin-success)";
    }
  }

  function buildRow(r) {
    const row = document.createElement("div");
    row.className = "draggable-row";
    row.dataset.id = r.id;
    row.setAttribute("role", "listitem");

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "drag-handle";
    handle.setAttribute("aria-label", "Drag to reorder");
    handle.setAttribute("tabindex", "0");
    handle.textContent = "\u283F";
    row.appendChild(handle);

    const fields = document.createElement("div");
    fields.className = "resource-fields";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "admin-input res-title";
    titleInput.value = r.resource_title || "";
    titleInput.placeholder = "Title";
    titleInput.setAttribute("aria-label", "Resource title");
    fields.appendChild(titleInput);

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "admin-input res-url";
    urlInput.value = r.resource_url || "";
    urlInput.placeholder = "URL (optional)";
    urlInput.setAttribute("aria-label", "Resource URL");
    fields.appendChild(urlInput);

    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.className = "admin-input res-desc";
    descInput.value = r.resource_description || "";
    descInput.placeholder = "Description (optional)";
    descInput.setAttribute("aria-label", "Resource description");
    fields.appendChild(descInput);

    row.appendChild(fields);

    const actions = document.createElement("div");
    actions.className = "resource-actions";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "admin-btn admin-btn--sm admin-btn--danger btn-delete-resource";
    delBtn.textContent = "\u2715";
    delBtn.setAttribute("aria-label", "Delete resource");
    actions.appendChild(delBtn);
    row.appendChild(actions);

    [titleInput, urlInput, descInput].forEach(function (inp) {
      inp.addEventListener("input", function () { isDirty = true; });
    });

    return row;
  }

  async function loadResources(listKey) {
    try {
      resources = await Admin.api.get("/resources?list_key=" + encodeURIComponent(listKey));
      if (!Array.isArray(resources)) resources = [];
      resources.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
      return true;
    } catch (err) {
      showError("Failed to load resources: " + err.message);
      resources = [];
      return false;
    }
  }

  async function boot() {
    const ok = await AdminAuth.requireSession();
    if (!ok) {
      main.innerHTML = '<div class="admin-error" role="alert">Unable to verify session.</div>';
      return;
    }
    main.innerHTML = "";
    if (currentListKey) {
      await loadResources(currentListKey);
    }
    render();
    window.addEventListener("beforeunload", function (e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes.";
      }
    });
  }

  boot();
})();
