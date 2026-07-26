/**
 * Site-wide resources holding pen.
 * Fetches every parked resource (in_holding_pen = 1) and renders one chip
 * per item into a pen panel docked below the list on every resource admin
 * page. Filing a chip into the current page's list clears the pen flag and
 * hands the updated resource back to the topic editor via onFiled.
 *
 * @module admin-resources-pen
 */
window.AdminResourcesPen = {};
const AdminResourcesPen = window.AdminResourcesPen;

(function () {
  const CATEGORY_LABELS = {
    "sermons-and-sayings": "Sermons & Sayings",
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

  let options = null;
  let container = null;
  let items = [];
  let loadError = null;
  let bound = false;

  function labelFor(listKey) {
    return CATEGORY_LABELS[listKey] || listKey;
  }

  /**
   * Attach (or re-attach, after the host page rebuilt its DOM) the panel to
   * a container and draw whatever is currently cached — no fetch.
   */
  AdminResourcesPen.mount = function (containerEl) {
    container = containerEl;
    render();
  };

  /**
   * Cache options and fetch the pen contents.
   * @param {{ containerId: string, listKey: string, getNextSortOrder?: () => number, onFiled?: (resource: object) => void }} opts
   */
  AdminResourcesPen.init = function (opts) {
    options = opts;
    container = document.getElementById(opts.containerId);
    bindDelegatedEvents();
    return AdminResourcesPen.reload();
  };

  /**
   * Re-fetch the pen contents from the server (JS-2: explicit error state,
   * never a silent empty list on failure).
   */
  AdminResourcesPen.reload = async function () {
    loadError = null;
    try {
      items = await Admin.api.get("/resources/admin/holding-pen");
      if (!Array.isArray(items)) items = [];
    } catch (err) {
      items = [];
      loadError = err.message || "Unknown error";
    }
    render();
  };

  function bindDelegatedEvents() {
    if (bound || !container) return;
    // JS-6: delegate from the panel, not per-chip listeners — chips get
    // replaced wholesale on every render().
    document.addEventListener("click", function (e) {
      const btn = e.target.closest(".admin-resources-pen__file-btn");
      if (!btn || !container || !container.contains(btn)) return;
      e.preventDefault();
      const id = Number(btn.closest(".admin-resources-pen__chip").dataset.id);
      const item = items.find(function (i) { return i.id === id; });
      if (item) fileInto(item);
    });
    bound = true;
  }

  async function fileInto(item) {
    if (!options || !options.listKey) return;
    const payload = { list_key: options.listKey, in_holding_pen: 0 };
    if (typeof options.getNextSortOrder === "function") {
      payload.sort_order = options.getNextSortOrder();
    }
    try {
      const updated = await Admin.api.put("/resources/" + item.id, payload);
      items = items.filter(function (i) { return i.id !== item.id; });
      render();
      if (typeof options.onFiled === "function") options.onFiled(updated);
    } catch (err) {
      loadError = "Failed to file “" + (item.resource_title || "untitled") + "”: " + err.message;
      render();
    }
  }

  function render() {
    if (!container) return;
    container.innerHTML = "";
    container.className = "admin-holding-pen-panel admin-resources-pen";

    const heading = document.createElement("h2");
    heading.className = "admin-resources-pen__heading";
    heading.textContent = "Holding Pen";
    container.appendChild(heading);

    if (loadError) {
      const errorEl = document.createElement("p");
      errorEl.className = "admin-error";
      errorEl.setAttribute("role", "alert");
      errorEl.textContent = "Failed to load holding pen: " + loadError;
      container.appendChild(errorEl);
      return;
    }

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-resources-pen__empty";
      empty.textContent = "The holding pen is empty.";
      container.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "admin-resources-pen__chips";
    list.setAttribute("role", "list");

    items.forEach(function (item) {
      list.appendChild(buildChip(item));
    });

    container.appendChild(list);
  }

  function buildChip(item) {
    const chip = document.createElement("div");
    chip.className = "admin-resources-pen__chip";
    chip.dataset.id = String(item.id);
    chip.setAttribute("role", "listitem");

    const info = document.createElement("div");
    info.className = "admin-resources-pen__chip-info";

    const title = document.createElement("span");
    title.className = "admin-resources-pen__chip-title";
    title.textContent = item.resource_title || "Untitled";
    info.appendChild(title);

    const origin = document.createElement("span");
    origin.className = "admin-resources-pen__chip-origin";
    origin.textContent = "from " + labelFor(item.list_key);
    info.appendChild(origin);

    chip.appendChild(info);

    const fileBtn = document.createElement("button");
    fileBtn.type = "button";
    fileBtn.className = "admin-btn admin-btn--sm admin-btn--primary admin-resources-pen__file-btn";
    fileBtn.textContent = "File into this list";
    fileBtn.setAttribute("aria-label", "File “" + (item.resource_title || "untitled") + "” into this list");
    chip.appendChild(fileBtn);

    return chip;
  }
})();
