// "Images in this post" caption-editing panel — renders one row per
// [figure] shortcode already in a content textarea, lets the author edit
// caption/alignment or remove the image, and writes changes back into the
// textarea via the shared AdminFigureShortcodes module.
//
// Used by: blog editor (this plan); other editors mount it in a follow-up
// plan (SR-4 — built generically enough for that from the start).
//
// Note: admin-figure-shortcodes.js MUST be loaded before this script.

// Runs as a classic script in the browser (window is the global) and via
// node --test under CommonJS (no window) — fall back to `global` there, so
// the non-DOM helpers below can be unit tested by requiring this file.
var globalScope = typeof window !== "undefined" ? window : global;

globalScope.AdminFigureCaptions = {};

var AdminFigureCaptions = globalScope.AdminFigureCaptions;

var RESCAN_DEBOUNCE_MS = 250;

/**
 * Derive one row view-model per parsed figure, in document order. Pure —
 * no DOM. Re-deriving this from a fresh parseFigures() on every render is
 * what guarantees row N always maps to the Nth *current* figure rather
 * than a stale offset: there is no persisted row/figure mapping to drift.
 *
 * @param {string} text - current textarea value
 * @returns {Array<{index: number, captionId: string, alignId: string, src: string, caption: string, align: (string|null)}>}
 */
function buildRowViewModels(text) {
  return AdminFigureShortcodes.parseFigures(text).map(function (figure, index) {
    return {
      index: index,
      captionId: "afig-caption-" + index,
      alignId: "afig-align-" + index,
      src: figure.src,
      caption: figure.caption,
      align: figure.align,
    };
  });
}

/**
 * Create a debounced rescan scheduler. Pure factory — takes the timer
 * functions as arguments so tests can inject fakes instead of relying on
 * real elapsed time.
 *
 * @param {function} fn - function to call after the delay
 * @param {number} delayMs
 * @param {function} [setTimeoutFn]
 * @param {function} [clearTimeoutFn]
 * @returns {function} call to (re)schedule; resets any pending call
 */
function createDebouncer(fn, delayMs, setTimeoutFn, clearTimeoutFn) {
  var setFn = setTimeoutFn || setTimeout;
  var clearFn = clearTimeoutFn || clearTimeout;
  var timer = null;
  return function () {
    if (timer) clearFn(timer);
    timer = setFn(fn, delayMs);
  };
}

AdminFigureCaptions.buildRowViewModels = buildRowViewModels;
AdminFigureCaptions.createDebouncer = createDebouncer;

/**
 * Mount the panel into `container`, tracking the textarea identified by
 * opts.textareaId.
 *
 * @param {Element} container
 * @param {{ textareaId: string }} opts
 * @returns {{ rescan: function }|null}
 */
AdminFigureCaptions.mount = function (container, opts) {
  opts = opts || {};

  if (!(container instanceof Element)) {
    console.warn(
      "AdminFigureCaptions.mount: container is not a DOM element; skipping mount.",
    );
    return null;
  }

  var textarea = document.getElementById(opts.textareaId);
  if (!textarea) {
    console.warn(
      "AdminFigureCaptions.mount: textarea #" +
        opts.textareaId +
        " not found in the DOM; skipping mount.",
    );
    return null;
  }

  var list = document.createElement("div");
  list.className = "afig-caption-list";
  container.appendChild(list);

  var currentFigures = [];

  function writeBack(index, updates) {
    var figure = currentFigures[index];
    if (!figure) return;

    var scrollTop = textarea.scrollTop;
    var selectionStart = textarea.selectionStart;
    var selectionEnd = textarea.selectionEnd;

    textarea.value = AdminFigureShortcodes.replaceFigureAt(
      textarea.value,
      figure,
      updates,
    );

    textarea.scrollTop = scrollTop;
    textarea.setSelectionRange(selectionStart, selectionEnd);

    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    render();
  }

  function removeAt(index) {
    var figure = currentFigures[index];
    if (!figure) return;

    var scrollTop = textarea.scrollTop;

    textarea.value = AdminFigureShortcodes.removeFigureAt(
      textarea.value,
      figure,
    );

    textarea.scrollTop = scrollTop;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    render();
  }

  function buildRow(viewModel) {
    var index = viewModel.index;
    var row = document.createElement("div");
    row.className = "afig-caption-row";

    var thumb = document.createElement("img");
    thumb.className = "afig-caption-row__thumb";
    thumb.src = viewModel.src;
    thumb.alt = "Image " + (index + 1) + " in this post";
    thumb.loading = "lazy";
    row.appendChild(thumb);

    var fields = document.createElement("div");
    fields.className = "afig-caption-row__fields";
    row.appendChild(fields);

    var captionLabel = document.createElement("label");
    captionLabel.className = "admin-form-group__label";
    captionLabel.setAttribute("for", viewModel.captionId);
    captionLabel.textContent = "Caption";

    var captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.className = "admin-input";
    captionInput.id = viewModel.captionId;
    captionInput.value = viewModel.caption || "";

    fields.appendChild(captionLabel);
    fields.appendChild(captionInput);

    var alignLabel = document.createElement("label");
    alignLabel.className = "admin-form-group__label";
    alignLabel.setAttribute("for", viewModel.alignId);
    alignLabel.textContent = "Alignment";

    var alignSelect = document.createElement("select");
    alignSelect.className = "admin-input";
    alignSelect.id = viewModel.alignId;

    [
      { value: "", label: "None" },
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ].forEach(function (opt) {
      var optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if ((viewModel.align || "") === opt.value) optionEl.selected = true;
      alignSelect.appendChild(optionEl);
    });

    fields.appendChild(alignLabel);
    fields.appendChild(alignSelect);

    function commit() {
      writeBack(index, {
        caption: captionInput.value,
        align: alignSelect.value,
      });
    }

    captionInput.addEventListener("change", commit);
    captionInput.addEventListener("blur", commit);
    alignSelect.addEventListener("change", commit);

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
    removeBtn.textContent = "Remove image";
    removeBtn.addEventListener("click", function () {
      removeAt(index);
    });
    fields.appendChild(removeBtn);

    return row;
  }

  function render() {
    currentFigures = AdminFigureShortcodes.parseFigures(textarea.value);
    var viewModels = buildRowViewModels(textarea.value);

    while (list.firstChild) list.removeChild(list.firstChild);

    if (viewModels.length === 0) {
      var empty = document.createElement("p");
      empty.className = "afig-caption-empty";
      empty.textContent =
        "No images in this post yet — use Insert Image to add one.";
      list.appendChild(empty);
      return;
    }

    viewModels.forEach(function (viewModel) {
      list.appendChild(buildRow(viewModel));
    });
  }

  var scheduleRescan = createDebouncer(render, RESCAN_DEBOUNCE_MS);

  textarea.addEventListener("input", scheduleRescan);

  render();

  return { rescan: render };
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminFigureCaptions;
}
