// Trigger:  Called by dashboard_app.js as window.renderRecordsSingle() when the
//           user navigates to the Single Record module (row click from All Records
//           or context link from another editor).
// Main:    renderRecordsSingle() — sets full-width layout, parses record ID from
//           URL/module context, loads the HTML form, fetches record data, initialises
//           all 17 sub-editor components, wires the section navigator, and activates
//           status buttons with keyboard shortcuts.
// Output:  Fully interactive single-record editor rendered in the Providence main
//           work area with all 7 sections populated and ready for editing.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — SINGLE RECORD DASHBOARD ORCHESTRATOR
   File:    js/2.0_records/dashboard/dashboard_records_single.js
   Version: 1.3.0
   Module:  2.0 — Records
   Purpose: Initialises the single record edit module and manages the full
            form lifecycle: layout setup, HTML injection, record fetching,
            sub-editor initialisation, section navigation, dirty-checking,
            and Save Draft / Publish / Delete coordination.
============================================================================= */

/* -----------------------------------------------------------------------------
   SCRIPT DEPENDENCIES — all JS files that must be loaded before editors init
   These are injected dynamically when the module loads. Consumer plans that
   include individual tools via <script> tag will find them already loaded.
----------------------------------------------------------------------------- */
const RECORDS_SINGLE_SCRIPTS = [
  "../../js/2.0_records/dashboard/taxonomy_selector.js",
  "../../js/2.0_records/dashboard/map_fields_handler.js",
  "../../js/9.0_cross_cutting/dashboard/external_refs_handler.js",
  "../../js/2.0_records/dashboard/parent_selector.js",
  "../../js/2.0_records/dashboard/url_array_editor.js",
  "../../js/9.0_cross_cutting/dashboard/mla_source_handler.js",
  "../../js/9.0_cross_cutting/dashboard/context_link_handler.js",
  "../../js/9.0_cross_cutting/dashboard/picture_handler.js",
  "../../js/9.0_cross_cutting/dashboard/metadata_widget.js",
  "../../js/2.0_records/dashboard/description_editor.js",
  "../../js/2.0_records/dashboard/verse_builder.js",
  "../../js/2.0_records/dashboard/snippet_generator.js",
  "../../js/2.0_records/dashboard/display_single_record_data.js",
  "../../js/2.0_records/dashboard/record_status_handler.js",
];

/* -----------------------------------------------------------------------------
   MAIN: renderRecordsSingle
   Entry point called by dashboard_app.js loadModule('records-single').
----------------------------------------------------------------------------- */
async function renderRecordsSingle(recordId) {
  // --- 1. Layout: full-width canvas, no sidebar ---
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns(false, "1fr");
  }

  // --- 2. Show loading state ---
  if (typeof window._setColumn === "function") {
    window._setColumn(
      "main",
      `
            <div class="state-loading">
                <span class="state-loading__label">Loading record editor…</span>
            </div>
        `,
    );
  }

  // --- 3. Resolve record ID (null/undefined = create-new mode) ---
  const resolvedId = _resolveRecordId(recordId);
  // resolvedId may be null/undefined — that's valid: it means "create new record"

  // --- 4. Load HTML template into the main column ---
  try {
    const htmlResponse = await fetch(
      "../../admin/frontend/dashboard_records_single.html",
      { cache: "no-cache" },
    );
    if (!htmlResponse.ok) {
      throw new Error(`Failed to load HTML template: ${htmlResponse.status}`);
    }
    const html = await htmlResponse.text();

    if (typeof window._setColumn === "function") {
      window._setColumn("main", html);
    }
  } catch (err) {
    console.error("[dashboard_records_single] HTML load failed:", err);
    if (typeof window._setColumn === "function") {
      window._setColumn(
        "main",
        `
                <div class="state-error">
                    <span class="state-error__label">Error loading the record editor.</span>
                    <p>Please refresh the page and try again.</p>
                </div>
            `,
      );
    }
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Failed to load the record editor interface.");
    }
    return;
  }

  // --- 5. Inject all required JS dependencies ---
  await _injectScripts(RECORDS_SINGLE_SCRIPTS);

  // --- 6. Initialise all sub-editor components ---
  await _initialiseAllEditors(resolvedId);

  // --- 7. Wire section navigator for smooth-scroll jumping ---
  _wireSectionNavigator();

  // --- 8. Wire status buttons (Save Draft, Publish, Delete) ---
  if (typeof window.wireStatusButtons === "function") {
    window.wireStatusButtons();
  }

  // --- 9. Surface ready state ---
  if (typeof window.surfaceError === "function") {
    window.surfaceError("Record editor ready.");
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Resolve record ID from arguments, URL, or module context
----------------------------------------------------------------------------- */
function _resolveRecordId(recordId) {
  // If passed directly as argument
  if (recordId && typeof recordId === "string" && recordId.length > 0) {
    return recordId;
  }

  // Check for a global set by All Records or context links
  if (
    typeof window._selectedRecordId === "string" &&
    window._selectedRecordId
  ) {
    return window._selectedRecordId;
  }

  // Try parsing from URL: /admin/records/{id}
  const pathMatch = window.location.pathname.match(
    /\/admin\/records\/([A-Za-z0-9]+)/,
  );
  if (pathMatch) {
    return pathMatch[1];
  }

  // Try query parameter: ?recordId=...
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get("recordId") || params.get("id");
  if (queryId) {
    return queryId;
  }

  return null;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Inject multiple JS scripts sequentially
----------------------------------------------------------------------------- */
function _injectScripts(scriptPaths) {
  return Promise.all(
    scriptPaths.map(function (src) {
      return new Promise(function (resolve, reject) {
        // Skip if already loaded
        const existing = document.querySelector('script[src="' + src + '"]');
        if (existing) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = function () {
          resolve();
        };
        script.onerror = function () {
          console.warn(
            "[dashboard_records_single] Failed to load script:",
            src,
          );
          resolve(); // Continue even if one fails
        };
        document.head.appendChild(script);
      });
    }),
  );
}

/* -----------------------------------------------------------------------------
   INTERNAL: Initialise all editor sub-components in sequence
----------------------------------------------------------------------------- */
async function _initialiseAllEditors(recordId) {
  // Load the CSS first so styles are ready when components render
  _injectStylesheet(
    "../../css/2.0_records/dashboard/dashboard_records_single.css",
  );

  // ---- Shared Tool Initialisation (order matters for dependencies) ----

  // Taxonomy selectors
  if (typeof window.renderTaxonomySelectors === "function") {
    window.renderTaxonomySelectors("section-taxonomy");
  }

  // Map fields
  if (typeof window.renderMapFields === "function") {
    window.renderMapFields("section-taxonomy");
  }

  // External refs
  if (typeof window.renderExternalRefs === "function") {
    window.renderExternalRefs("external-refs-container");
  }

  // Parent selector — placed with taxonomy fields
  if (typeof window.renderParentSelector === "function") {
    window.renderParentSelector("section-taxonomy");
  }

  // URL array editor
  if (typeof window.renderUrlArrayEditor === "function") {
    window.renderUrlArrayEditor("url-array-editor-container");
  }

  // Bibliography editor
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("bibliography-editor-container");
  }

  // Context links editor
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("context-links-container", []);
  }

  // Picture handler
  if (typeof window.renderEditPicture === "function") {
    window.renderEditPicture("picture-preview-container", recordId);
  }

  // Metadata widget — shared unified slug/snippet/metadata UI
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        // Auto-save as draft unless already published
        const statusRadio = document.querySelector(
          'input[name="record-status"]:checked',
        );
        if (statusRadio && statusRadio.value === "published") {
          return;
        }

        // Sync widget-generated values into the canonical form fields
        // so that collectAllFormData() picks them up on save.
        if (recordData) {
          // Slug → Section 1
          if (recordData.slug) {
            var slugInput = document.getElementById("record-slug");
            if (slugInput) slugInput.value = recordData.slug;
          }
          // Snippet → Section 3 snippet editor
          if (
            recordData.snippet &&
            typeof window.renderDescriptionEditor === "function"
          ) {
            var paragraphs;
            try {
              paragraphs = JSON.parse(recordData.snippet);
              if (!Array.isArray(paragraphs)) paragraphs = [recordData.snippet];
            } catch (e) {
              paragraphs = [recordData.snippet];
            }
            window.renderDescriptionEditor(
              "snippet-editor-container",
              paragraphs,
            );
          }
          // Metadata JSON → hidden form field
          if (recordData.metadata_json) {
            var metaEl = document.getElementById("record-metadata-json");
            if (metaEl) metaEl.value = recordData.metadata_json;
          }
        }

        // Trigger a save draft via the status handler
        var btnSaveDraft = document.getElementById("btn-save-draft");
        if (btnSaveDraft) {
          btnSaveDraft.click();
        }
      },
      getRecordTitle: function () {
        const titleInput = document.getElementById("record-title");
        return titleInput ? titleInput.value : "";
      },
      getRecordId: function () {
        const slugInput = document.getElementById("record-slug");
        return slugInput ? slugInput.value : window._recordSlug || "";
      },
    });
  }

  // ---- Fetch and hydrate record data ----
  // For new records (recordId is null/undefined), fetchAndDisplaySingleRecord
  // skips the API call and returns null — all form fields remain blank.
  let record = null;
  if (typeof window.fetchAndDisplaySingleRecord === "function") {
    record = await window.fetchAndDisplaySingleRecord(recordId);
  }

  // Store the record title globally for error messages in all sub-components
  if (record && record.title) {
    window._recordTitle = record.title;
    window._recordSlug = record.slug || recordId;
  } else {
    window._recordTitle = "";
    window._recordSlug = recordId;
  }

  // Store the loaded record for dirty-checking
  window._loadedRecordData = record;

  // ---- Bidirectional slug sync between Section 1 and Metadata widget ----
  _wireSlugSync();
}

/* -----------------------------------------------------------------------------
   INTERNAL: Wire bidirectional slug sync
   Keeps #record-slug (Section 1) and #metadata-widget-slug (Section 7)
   in sync as the user types in either field. The GENERATE button for
   auto-generating the slug lives in the metadata widget only.
----------------------------------------------------------------------------- */
function _wireSlugSync() {
  const slug1 = document.getElementById("record-slug");
  const slug2 = document.getElementById("metadata-widget-slug");
  if (!slug1 || !slug2) return;

  var syncing = false;

  slug1.addEventListener("input", function () {
    if (syncing) return;
    syncing = true;
    slug2.value = slug1.value;
    syncing = false;
  });

  slug2.addEventListener("input", function () {
    if (syncing) return;
    syncing = true;
    slug1.value = slug2.value;
    syncing = false;
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: Wire the section navigator for smooth-scroll between sections
----------------------------------------------------------------------------- */
function _wireSectionNavigator() {
  const navLinks = document.querySelectorAll(".section-nav__link");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      if (!targetId) return;

      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      // Highlight active nav link
      navLinks.forEach(function (l) {
        l.classList.remove("section-nav__link--active");
      });
      link.classList.add("section-nav__link--active");
    });
  });

  // Scroll spy: highlight the nav link corresponding to the currently visible section
  _setupScrollSpy(navLinks);
}

/* -----------------------------------------------------------------------------
   INTERNAL: Scroll spy — update active nav link based on scroll position
----------------------------------------------------------------------------- */
function _setupScrollSpy(navLinks) {
  const mainColumn = document.getElementById("providence-col-main");
  if (!mainColumn) return;

  const sections = document.querySelectorAll(".form-section");

  mainColumn.addEventListener(
    "scroll",
    function () {
      let currentSection = null;

      sections.forEach(function (section) {
        const rect = section.getBoundingClientRect();
        // Consider a section "active" when its top is near the top of the viewport
        if (rect.top <= 200) {
          currentSection = section.id;
        }
      });

      if (currentSection) {
        navLinks.forEach(function (link) {
          link.classList.remove("section-nav__link--active");
          if (link.getAttribute("href") === "#" + currentSection) {
            link.classList.add("section-nav__link--active");
          }
        });
      }
    },
    { passive: true },
  );
}

/* -----------------------------------------------------------------------------
   INTERNAL: Dynamically inject a CSS stylesheet if not already present
----------------------------------------------------------------------------- */
function _injectStylesheet(href) {
  // Fetch the CSS fresh (conditional revalidation) and inject it into a
  // single <style> element. This replaces any previous injection so edits
  // to the CSS file are always visible without a full page reload.
  const styleId = "records-single-dynamic-styles";

  fetch(href, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) {
        console.warn(
          "[dashboard_records_single] Failed to load CSS:",
          href,
          res.status,
        );
        return;
      }
      return res.text();
    })
    .then(function (css) {
      if (!css) return;
      var el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
      }
      el.textContent = css;
    })
    .catch(function (err) {
      console.warn("[dashboard_records_single] CSS fetch failed:", href, err);
    });
}

/* -----------------------------------------------------------------------------
   PUBLIC: setRecordId
   Allows external modules (e.g., All Records list, context links) to set the
   current record ID before calling renderRecordsSingle().
----------------------------------------------------------------------------- */
function setRecordId(recordId) {
  window._selectedRecordId = recordId;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
   renderRecordsSingle is the canonical entry point registered in
   dashboard_app.js MODULE_RENDERERS as 'records-single'.
----------------------------------------------------------------------------- */
window.renderRecordsSingle = renderRecordsSingle;
window.setRecordId = setRecordId;
