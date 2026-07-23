/**
 * Admin Shortcode Help — Formatting Reference Panel & Per-Row Marker Hints
 *
 * Attaches to window.Admin so edit pages can include it. Provides:
 * 1. A collapsible "Formatting Reference" panel showing copy-paste marker examples.
 * 2. Per-row `[mla:N]` hints next to each linked source in the AdminMlaSources panel.
 * 3. Per-row `[id:N]` hints next to each linked identifier (when an identifiers panel exists).
 *
 * @module admin-shortcode-help
 */

window.AdminShortcodeHelp = {};

var AdminShortcodeHelp = window.AdminShortcodeHelp;

/**
 * Mount a collapsible "Formatting Reference" panel into a container element.
 *
 * The panel shows one copy-pasteable example per marker type:
 * - Plain [figure], floated [figure ... align="right"]
 * - [mla:N] (inline citation)
 * - [id:N] (inline identifier badge)
 *
 * @param {Element} container - DOM element to append the panel into
 */
AdminShortcodeHelp.mountFormattingReference = function (container) {
  if (!(container instanceof Element)) {
    console.warn("AdminShortcodeHelp.mountFormattingReference: container must be a DOM element.");
    return;
  }

  var wrapper = document.createElement("div");
  wrapper.className = "admin-form-card";
  wrapper.style.marginTop = "var(--space-md)";

  // Collapsible header
  var header = document.createElement("div");
  header.className = "admin-form-card__title";
  header.style.cursor = "pointer";
  header.style.userSelect = "none";
  header.setAttribute("role", "button");
  header.setAttribute("aria-expanded", "false");
  header.setAttribute("tabindex", "0");
  header.textContent = "▸ Formatting Reference";

  var body = document.createElement("div");
  body.className = "ash-panel__body";
  body.style.display = "none";
  body.style.padding = "var(--space-sm) 0 0 0";
  body.style.fontSize = "var(--text-small)";
  body.style.lineHeight = "1.6";

  var examples = [
    {
      label: "Figure (block-level, own paragraph)",
      code: '[figure src="/assets/images/coin.webp" caption="A first-century coin."]',
    },
    {
      label: "Floated Figure (right-aligned breakout ≥1024px)",
      code: '[figure src="/assets/images/coin.webp" caption="A first-century coin." align="right"]',
    },
    {
      label: "MLA Citation (inline, superscript link to bibliography)",
      code: "...as Meyers notes[mla:7], the inscription dates to...",
    },
    {
      label: "Identifier Badge (inline, shows manuscript/IAA/Pleiades label)",
      code: "...the Nazareth inscription[id:12], which was discovered...",
    },
    {
      label: "Blog: MLA Citation (parenthetical, bibliography at end)",
      code: "...supported by recent findings[mla:3] in the region.",
    },
    {
      label: "Blog: Pull-quote (block, no other shortcodes nearby)",
      code: "[pullquote]A memorable passage.[/pullquote]",
    },
    {
      label: "Markdown: Headings",
      code: "## Section Title\n### Sub-section Title",
    },
    {
      label: "Markdown: Bold / Italic",
      code: "**bold text** *italic text*",
    },
    {
      label: "Markdown: Paragraph break (forced line break)",
      code: "First line\\\\\nSecond line",
    },
    {
      label: "Markdown: Unordered List",
      code: "- Item one\n- Item two\n  - Nested item",
    },
    {
      label: "Markdown: Ordered List",
      code: "1. First point\n2. Second point",
    },
    {
      label: "Markdown: Table",
      code: "| Header A | Header B |\n|----------|----------|\n| Cell 1   | Cell 2   |",
    },
  ];

  examples.forEach(function (ex) {
    var section = document.createElement("div");
    section.style.marginBottom = "var(--space-sm)";

    var label = document.createElement("div");
    label.style.fontWeight = "600";
    label.style.marginBottom = "2px";
    label.textContent = ex.label;

    var codeEl = document.createElement("code");
    codeEl.style.display = "block";
    codeEl.style.padding = "4px 8px";
    codeEl.style.background = "var(--admin-bg, #f4f6f8)";
    codeEl.style.border = "1px solid var(--admin-border, #dde1e7)";
    codeEl.style.borderRadius = "4px";
    codeEl.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    codeEl.style.fontSize = "0.8125rem";
    codeEl.style.wordBreak = "break-all";
    codeEl.textContent = ex.code;

    section.appendChild(label);
    section.appendChild(codeEl);
    body.appendChild(section);
  });

  // Toggle on click
  header.addEventListener("click", function () {
    var expanded = body.style.display !== "none";
    body.style.display = expanded ? "none" : "block";
    header.setAttribute("aria-expanded", String(!expanded));
    header.textContent = (expanded ? "▸ " : "▾ ") + "Formatting Reference";
  });

  // Keyboard support
  header.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      header.click();
    }
  });

  wrapper.appendChild(header);
  wrapper.appendChild(body);
  container.appendChild(wrapper);
};

/**
 * Attach per-row marker hints to an AdminMlaSources panel after it's mounted.
 *
 * Watches the panel's list for changes (DOM mutations) and appends a
 * `Marker: [mla:N]` hint next to each linked source row. This lets authors
 * copy the exact marker text for the item they're editing.
 *
 * Call this after `AdminMlaSources.mount()`.
 *
 * @param {Element} panelRoot - The root element returned/appended by AdminMlaSources.mount
 */
AdminShortcodeHelp.wireMlaMarkerHints = function (panelRoot) {
  if (!(panelRoot instanceof Element)) {
    console.warn("AdminShortcodeHelp.wireMlaMarkerHints: panelRoot must be a DOM element.");
    return;
  }

  function addHints() {
    var items = panelRoot.querySelectorAll(".amla-panel__item");
    items.forEach(function (li) {
      // Skip if already has a hint
      if (li.querySelector(".ash-marker-hint")) return;

      var sourceId = li.dataset.sourceId;
      if (!sourceId) return;

      var hint = document.createElement("span");
      hint.className = "ash-marker-hint";
      hint.style.cssText = "display:block;font-size:0.75rem;color:var(--admin-text-secondary, #5a6472);margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;";
      hint.textContent = "Marker: [mla:" + sourceId + "]";

      li.appendChild(hint);
    });
  }

  // Run now and watch for changes
  addHints();

  var observer = new MutationObserver(function () {
    addHints();
  });

  observer.observe(panelRoot, {
    childList: true,
    subtree: true,
  });
};

/**
 * Attach per-row marker hints to a list of linked identifiers.
 *
 * Finds all `<li>` elements inside the given container that have a
 * `data-identifier-id` attribute and appends a `Marker: [id:N]` hint.
 *
 * Call this after rendering the identifiers panel.
 *
 * @param {Element} container - The container element holding identifier <li> elements
 */
AdminShortcodeHelp.wireIdentifierMarkerHints = function (container) {
  if (!(container instanceof Element)) return;

  var items = container.querySelectorAll("li[data-identifier-id]");
  items.forEach(function (li) {
    if (li.querySelector(".ash-marker-hint")) return;

    var identifierId = li.dataset.identifierId;
    if (!identifierId) return;

    var hint = document.createElement("span");
    hint.className = "ash-marker-hint";
    hint.style.cssText = "display:block;font-size:0.75rem;color:var(--admin-text-secondary, #5a6472);margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;";
    hint.textContent = "Marker: [id:" + identifierId + "]";

    li.appendChild(hint);
  });
};
