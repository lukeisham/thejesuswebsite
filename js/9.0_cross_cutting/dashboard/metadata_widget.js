// Trigger:  Consumer dashboard pages call window.renderMetadataWidget(containerId, options)
//           to inject the full slug/snippet/metadata widget DOM into a container.
// Main:    renderMetadataWidget(containerId, options) — injects widget DOM and
//           wires all four buttons (slug, snippet, metadata, generate all).
//           populateMetadataWidget(containerId, data) — fills fields from record.
//           collectMetadataWidget(containerId) — gathers current values for save.
// Output:  Interactive metadata widget with AI-powered auto-generation buttons
//           and a "Generate All" button that fires all three pipelines in parallel.

/* This is the authoritative copy — consumed by plan_dashboard_blog_posts,
   plan_dashboard_essay_historiography, plan_dashboard_challenge,
   plan_dashboard_news_sources, and plan_dashboard_records_single. */

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderMetadataWidget
   Injects the full metadata widget DOM into the given container element,
   wires all buttons to their respective API endpoints, and exposes
   populate/collect helpers on the container.

   Parameters:
     containerId (string) — The ID of the container element that will receive
                            the widget DOM. Must be an empty <div>.
     options     (object) — {
         onAutoSaveDraft: (recordData) => Promise — Called after "Generate All"
                           completes successfully. Receives { slug, snippet,
                           metadata_json } so the consumer orchestrator can
                           auto-save the record as draft (unless published).

         // Optional overrides for record-specific context:
         getRecordTitle: () => string — Returns the current record title.
         getRecordId:    () => string — Returns the current record slug/ID.
     }

   Expected globals:
     window.surfaceError() — Shared error display.
----------------------------------------------------------------------------- */
function renderMetadataWidget(containerId, options) {
  if (!containerId) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Merge defaults with consumer-supplied options
  const opts = Object.assign(
    {
      onAutoSaveDraft: null,
      // The DOM ID of the description paragraph editor on the host page.
      // Override this when embedding the widget in a module that uses a
      // different container ID (e.g. blog posts, essays, challenge responses).
      descriptionContainerId: "description-editor-container",
      getRecordTitle: function () {
        return typeof window._recordTitle !== "undefined"
          ? window._recordTitle
          : "";
      },
      getRecordId: function () {
        return typeof window._recordSlug !== "undefined" && window._recordSlug
          ? window._recordSlug
          : "";
      },
    },
    options || {},
  );

  /* -------------------------------------------------------------------------
       1. BUILD WIDGET DOM
    ------------------------------------------------------------------------- */

  // --- Heading ---
  const heading = document.createElement("h4");
  heading.className = "metadata-widget__heading";
  heading.textContent = "META DATA & SEO";

  // --- Slug Field ---
  const slugField = document.createElement("div");
  slugField.className = "metadata-widget__field";

  const slugLabel = document.createElement("label");
  slugLabel.className = "metadata-widget__label";
  slugLabel.setAttribute("for", "metadata-widget-slug");
  slugLabel.textContent = "URL Slug";

  const slugInline = document.createElement("div");
  slugInline.className = "metadata-widget__inline";

  const slugInput = document.createElement("input");
  slugInput.id = "metadata-widget-slug";
  slugInput.className = "metadata-widget__input";
  slugInput.type = "text";
  slugInput.placeholder = "auto-generated-or-manual-slug";
  slugInput.setAttribute("aria-label", "Record slug");

  const slugBtn = document.createElement("button");
  slugBtn.id = "metadata-widget-btn-slug";
  slugBtn.className = "metadata-widget__btn";
  slugBtn.type = "button";
  slugBtn.textContent = "GENERATE";

  slugInline.appendChild(slugInput);
  slugInline.appendChild(slugBtn);
  slugField.appendChild(slugLabel);
  slugField.appendChild(slugInline);

  // --- Snippet Field ---
  const snippetField = document.createElement("div");
  snippetField.className = "metadata-widget__field";

  const snippetLabel = document.createElement("label");
  snippetLabel.className = "metadata-widget__label";
  snippetLabel.setAttribute("for", "metadata-widget-snippet");
  snippetLabel.textContent = "Snippet";

  const snippetInline = document.createElement("div");
  snippetInline.className = "metadata-widget__inline";

  const snippetTextarea = document.createElement("textarea");
  snippetTextarea.id = "metadata-widget-snippet";
  snippetTextarea.className = "metadata-widget__textarea";
  snippetTextarea.rows = 3;
  snippetTextarea.placeholder = "2-3 sentence scholarly summary...";
  snippetTextarea.setAttribute("aria-label", "Record snippet");

  const snippetBtn = document.createElement("button");
  snippetBtn.id = "metadata-widget-btn-snippet";
  snippetBtn.className = "metadata-widget__btn";
  snippetBtn.type = "button";
  snippetBtn.textContent = "GENERATE";

  snippetInline.appendChild(snippetTextarea);
  snippetInline.appendChild(snippetBtn);
  snippetField.appendChild(snippetLabel);
  snippetField.appendChild(snippetInline);

  // --- Keywords (Tags) Field ---
  const keywordsField = document.createElement("div");
  keywordsField.className = "metadata-widget__field";

  const keywordsLabel = document.createElement("label");
  keywordsLabel.className = "metadata-widget__label";
  keywordsLabel.setAttribute("for", "metadata-widget-tag-input");
  keywordsLabel.textContent = "Keywords";

  const tagsContainer = document.createElement("div");
  tagsContainer.id = "metadata-widget-tags";
  tagsContainer.className = "metadata-widget__tags";
  // Populated dynamically

  const keywordsInline = document.createElement("div");
  keywordsInline.className = "metadata-widget__inline";

  const tagInput = document.createElement("input");
  tagInput.id = "metadata-widget-tag-input";
  tagInput.className = "metadata-widget__tag-input";
  tagInput.type = "text";
  tagInput.placeholder = "Add...";

  const tagAddBtn = document.createElement("button");
  tagAddBtn.className = "metadata-widget__tag-add-btn";
  tagAddBtn.type = "button";
  tagAddBtn.textContent = "+";

  const keywordsBtn = document.createElement("button");
  keywordsBtn.id = "metadata-widget-btn-keywords";
  keywordsBtn.className = "metadata-widget__btn";
  keywordsBtn.type = "button";
  keywordsBtn.textContent = "GENERATE";

  keywordsInline.appendChild(tagInput);
  keywordsInline.appendChild(tagAddBtn);
  keywordsInline.appendChild(keywordsBtn);

  keywordsField.appendChild(keywordsLabel);
  keywordsField.appendChild(tagsContainer);
  keywordsField.appendChild(keywordsInline);

  // --- Status Text ---
  const statusEl = document.createElement("p");
  statusEl.id = "metadata-widget-status";
  statusEl.className = "metadata-widget__status";
  statusEl.textContent = "";

  // --- Divider ---
  const divider = document.createElement("hr");
  divider.className = "metadata-widget__divider";
  divider.setAttribute("aria-hidden", "true");

  // --- Generate All Button ---
  const generateAllBtn = document.createElement("button");
  generateAllBtn.id = "metadata-widget-btn-generate-all";
  generateAllBtn.className = "metadata-widget__generate-all";
  generateAllBtn.type = "button";
  generateAllBtn.textContent = "Generate all";

  /* -------------------------------------------------------------------------
       2. ASSEMBLE AND INJECT
    ------------------------------------------------------------------------- */
  container.innerHTML = "";
  container.className = "metadata-widget";
  container.appendChild(heading);
  container.appendChild(slugField);
  container.appendChild(snippetField);
  container.appendChild(keywordsField);
  container.appendChild(statusEl);
  container.appendChild(divider);
  container.appendChild(generateAllBtn);

  /* -------------------------------------------------------------------------
       3. TAG LOGIC
    ------------------------------------------------------------------------- */
  let activeKeywords = [];

  function _renderTags() {
    tagsContainer.innerHTML = "";
    activeKeywords.forEach((kw, index) => {
      const tag = document.createElement("span");
      tag.className = "metadata-widget__tag";
      tag.textContent = kw;

      const removeBtn = document.createElement("button");
      removeBtn.className = "metadata-widget__tag-remove";
      removeBtn.type = "button";
      removeBtn.innerHTML = "&times;";
      removeBtn.onclick = () => {
        activeKeywords.splice(index, 1);
        _renderTags();
      };

      tag.appendChild(removeBtn);
      tagsContainer.appendChild(tag);
    });
  }

  function _addTag() {
    const val = tagInput.value.trim();
    if (val && !activeKeywords.includes(val)) {
      activeKeywords.push(val);
      tagInput.value = "";
      _renderTags();
    }
  }

  tagAddBtn.onclick = _addTag;
  tagInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      _addTag();
    }
  };

  /* -------------------------------------------------------------------------
       4. WIRE BUTTONS
    ------------------------------------------------------------------------- */

  function _setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function _setButtonsDisabled(disabled) {
    [slugBtn, snippetBtn, keywordsBtn, generateAllBtn, tagAddBtn].forEach(
      (btn) => {
        if (btn) btn.disabled = disabled;
      },
    );
    tagInput.disabled = disabled;
  }

  function _getTitle() {
    return opts.getRecordTitle();
  }
  function _getRecordId() {
    return opts.getRecordId();
  }

  // --- Slug Auto-Gen ---
  slugBtn.addEventListener("click", async function () {
    const title = _getTitle();
    if (!title || !title.trim()) {
      if (typeof window.surfaceError === "function")
        window.surfaceError("Error: No title available for slug generation.");
      return;
    }
    slugBtn.disabled = true;
    slugBtn.textContent = "...";
    _setStatus("Generating slug…");
    try {
      const response = await fetch("/api/admin/slug/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
        body: JSON.stringify({ slug: _getRecordId(), content: title.trim() }),
      });
      if (!response.ok) throw new Error("API Error");
      const data = await response.json();
      if (data && data.slug) {
        slugInput.value = data.slug;
        _setStatus("Slug generated.");
      }
    } catch (err) {
      if (typeof window.surfaceError === "function")
        window.surfaceError("Error: Slug generation failed.");
      _setStatus("");
    } finally {
      slugBtn.disabled = false;
      slugBtn.textContent = "GENERATE";
    }
  });

  // --- Snippet Auto-Gen ---
  snippetBtn.addEventListener("click", async function () {
    let content = "";
    if (typeof window.collectDescription === "function") {
      try {
        const paragraphs = window.collectDescription(opts.descriptionContainerId);
        if (Array.isArray(paragraphs)) content = paragraphs.join("\n\n");
      } catch (_) {}
    }
    if (!content) {
      const mdTextarea = document.getElementById("markdown-textarea");
      if (mdTextarea) content = mdTextarea.value;
    }
    if (!content && _getTitle()) content = _getTitle();

    if (!content) {
      if (typeof window.surfaceError === "function")
        window.surfaceError("Error: No content for snippet generation.");
      return;
    }

    snippetBtn.disabled = true;
    snippetBtn.textContent = "...";
    _setStatus("Generating snippet…");
    try {
      const response = await fetch("/api/admin/snippet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
        body: JSON.stringify({ slug: _getRecordId(), content: content }),
      });
      if (!response.ok) throw new Error("API Error");
      const data = await response.json();
      if (data && data.snippet) {
        snippetTextarea.value = data.snippet.trim();
        _setStatus("Snippet generated.");
      }
    } catch (err) {
      if (typeof window.surfaceError === "function")
        window.surfaceError("Error: Snippet generation failed.");
      _setStatus("");
    } finally {
      snippetBtn.disabled = false;
      snippetBtn.textContent = "GENERATE";
    }
  });

  // --- Keywords Auto-Gen ---
  keywordsBtn.addEventListener("click", async function () {
    let content = "";
    if (typeof window.collectDescription === "function") {
      try {
        const paragraphs = window.collectDescription(opts.descriptionContainerId);
        if (Array.isArray(paragraphs)) content = paragraphs.join("\n\n");
      } catch (_) {}
    }
    if (!content) {
      const mdTextarea = document.getElementById("markdown-textarea");
      if (mdTextarea) content = mdTextarea.value;
    }
    if (!content && _getTitle()) content = _getTitle();

    if (!content) {
      if (typeof window.surfaceError === "function")
        window.surfaceError("Error: No content for keyword generation.");
      return;
    }

    keywordsBtn.disabled = true;
    keywordsBtn.textContent = "...";
    _setStatus("Generating keywords…");
    try {
      const response = await fetch("/api/admin/metadata/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
        body: JSON.stringify({ slug: _getRecordId(), content: content }),
      });
      if (!response.ok) throw new Error("API Error");
      const data = await response.json();
      if (data && data.keywords) {
        const kws = data.keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
        kws.forEach((k) => {
          if (!activeKeywords.includes(k)) activeKeywords.push(k);
        });
        _renderTags();
        _setStatus("Keywords generated.");
      }
    } catch (err) {
      if (typeof window.surfaceError === "function")
        window.surfaceError("Error: Keyword generation failed.");
      _setStatus("");
    } finally {
      keywordsBtn.disabled = false;
      keywordsBtn.textContent = "GENERATE";
    }
  });

  // --- Generate All ---
  generateAllBtn.addEventListener("click", async function () {
    _setButtonsDisabled(true);
    generateAllBtn.textContent = "Generating all…";
    _setStatus("Generating slug, snippet, and keywords in parallel…");

    const title = _getTitle();
    let content = "";
    if (typeof window.collectDescription === "function") {
      try {
        const paragraphs = window.collectDescription(opts.descriptionContainerId);
        if (Array.isArray(paragraphs)) content = paragraphs.join("\n\n");
      } catch (_) {}
    }
    if (!content) {
      const mdTextarea = document.getElementById("markdown-textarea");
      if (mdTextarea) content = mdTextarea.value;
    }
    if (!content && title) content = title;

    const recordId = _getRecordId();
    const promises = [];

    if (title) {
      promises.push(
        fetch("/api/admin/slug/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
          body: JSON.stringify({ slug: recordId, content: title.trim() }),
        })
          .then((r) => r.json())
          .then((d) => ({ type: "slug", value: d.slug }))
          .catch(() => ({ type: "slug", value: null })),
      );
    }

    if (content) {
      promises.push(
        fetch("/api/admin/snippet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
          body: JSON.stringify({ slug: recordId, content: content }),
        })
          .then((r) => r.json())
          .then((d) => ({ type: "snippet", value: d.snippet }))
          .catch(() => ({ type: "snippet", value: null })),
      );

      promises.push(
        fetch("/api/admin/metadata/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
          body: JSON.stringify({ slug: recordId, content: content }),
        })
          .then((r) => r.json())
          .then((d) => ({ type: "keywords", value: d.keywords }))
          .catch(() => ({ type: "keywords", value: null })),
      );
    }

    const results = await Promise.all(promises);
    results.forEach((res) => {
      if (res.type === "slug" && res.value) slugInput.value = res.value;
      if (res.type === "snippet" && res.value)
        snippetTextarea.value = res.value;
      if (res.type === "keywords" && res.value) {
        const kws = res.value
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
        kws.forEach((k) => {
          if (!activeKeywords.includes(k)) activeKeywords.push(k);
        });
        _renderTags();
      }
    });

    _setStatus("Generated metadata fields.");
    if (typeof opts.onAutoSaveDraft === "function") {
      const recordData = {
        slug: slugInput.value,
        snippet: snippetTextarea.value,
        metadata_json: JSON.stringify({ keywords: activeKeywords.join(", ") }),
      };
      await opts.onAutoSaveDraft(recordData);
    }

    _setButtonsDisabled(false);
    generateAllBtn.textContent = "Generate all";
  });

  /* -------------------------------------------------------------------------
       5. EXPOSE HELPERS
    ------------------------------------------------------------------------- */
  container._populateWidget = function (data) {
    if (!data) {
      slugInput.value = "";
      snippetTextarea.value = "";
      activeKeywords = [];
      _renderTags();
      return;
    }
    slugInput.value = data.slug || "";
    snippetTextarea.value = data.snippet || "";

    let kws = [];
    if (data.metadata_json) {
      try {
        const parsed =
          typeof data.metadata_json === "string"
            ? JSON.parse(data.metadata_json)
            : data.metadata_json;
        if (parsed.keywords) {
          kws = parsed.keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k);
        } else if (Array.isArray(parsed)) {
          kws = parsed;
        }
      } catch (e) {
        // Fallback: treat string as comma-separated
        kws = data.metadata_json
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
      }
    }
    activeKeywords = kws;
    _renderTags();
  };

  container._collectWidget = function () {
    return {
      slug: slugInput.value,
      snippet: snippetTextarea.value,
      metadata_json: JSON.stringify({ keywords: activeKeywords.join(", ") }),
    };
  };
}

/* -----------------------------------------------------------------------------
   PUBLIC: populateMetadataWidget
   Fills every field with an existing record's data, or clears to placeholder
   state when data is null/undefined. Safe to call before renderMetadataWidget
   (it will be a no-op if the container doesn't have the widget yet).
----------------------------------------------------------------------------- */
function populateMetadataWidget(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof container._populateWidget === "function") {
    container._populateWidget(data);
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: collectMetadataWidget
   Gathers all current field values into a plain object for the save orchestrator.
   Returns { slug, snippet, metadata_json }. Safe to call before
   renderMetadataWidget (returns empty object).
----------------------------------------------------------------------------- */
function collectMetadataWidget(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return { slug: "", snippet: "", metadata_json: "" };

  if (typeof container._collectWidget === "function") {
    return container._collectWidget();
  }

  return { slug: "", snippet: "", metadata_json: "" };
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
   All consumer dashboard modules call these three window.* functions.
----------------------------------------------------------------------------- */
window.renderMetadataWidget = renderMetadataWidget;
window.populateMetadataWidget = populateMetadataWidget;
window.collectMetadataWidget = collectMetadataWidget;
