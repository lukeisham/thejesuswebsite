// =============================================================================
//   THE JESUS WEBSITE — BULK UPLOAD MODULE
//   File:    admin/frontend/edit_modules/edit_bulk_upload.js
//   Version: 1.1.0
//   Purpose: UI for bulk uploading CSV files to create records.
//            Includes client-side CSV row validation preview before upload.
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderBulkUpload(containerId)
// Function: Renders the bulk CSV upload form with client-side row validation preview
// Output: Injects the bulk upload HTML into the specified container element

window.renderBulkUpload = function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // ---- Valid enum sets (must match backend) ----
  var VALID_ERAS = {
    PreIncarnation: true,
    OldTestament: true,
    EarlyLife: true,
    Life: true,
    GalileeMinistry: true,
    JudeanMinistry: true,
    PassionWeek: true,
    "Post-Passion": true,
  };

  var VALID_TIMELINES = {
    PreIncarnation: true,
    OldTestament: true,
    EarlyLifeUnborn: true,
    EarlyLifeBirth: true,
    EarlyLifeInfancy: true,
    EarlyLifeChildhood: true,
    LifeTradie: true,
    LifeBaptism: true,
    LifeTemptation: true,
    GalileeCallingTwelve: true,
    GalileeSermonMount: true,
    GalileeMiraclesSea: true,
    GalileeTransfiguration: true,
    JudeanOutsideJudea: true,
    JudeanMissionSeventy: true,
    JudeanTeachingTemple: true,
    JudeanRaisingLazarus: true,
    JudeanFinalJourney: true,
    PassionPalmSunday: true,
    PassionMondayCleansing: true,
    PassionTuesdayTeaching: true,
    PassionWednesdaySilent: true,
    PassionMaundyThursday: true,
    PassionMaundyLastSupper: true,
    PassionMaundyGethsemane: true,
    PassionMaundyBetrayal: true,
    PassionFridaySanhedrin: true,
    PassionFridayCivilTrials: true,
    PassionFridayCrucifixionBegins: true,
    PassionFridayDarkness: true,
    PassionFridayDeath: true,
    PassionFridayBurial: true,
    PassionSaturdayWatch: true,
    PassionSundayResurrection: true,
    PostResurrectionAppearances: true,
    Ascension: true,
    OurResponse: true,
    ReturnOfJesus: true,
  };

  var VALID_MAP_LABELS = {
    Overview: true,
    Empire: true,
    Levant: true,
    Judea: true,
    Galilee: true,
    Jerusalem: true,
  };

  var VALID_GOSPEL_CATEGORIES = {
    event: true,
    location: true,
    person: true,
    theme: true,
    object: true,
  };

  // ---- State ----
  var currentFile = null;
  var headerRow = [];
  var validRows = [];
  var allRowErrors = []; // per-row error strings (for display)

  // ---- Shell HTML ----
  var html =
    '        <div class="admin-module-header">\n' +
    "            <h2>Editing Module: Bulk Upload CSV</h2>\n" +
    '            <p class="text-sm text-muted">Technical Ledger Interface \u2014 Data Ingestion</p>\n' +
    "        </div>\n" +
    "\n" +
    '        <div class="admin-card bulk-upload-card" id="bulk-upload-card">\n' +
    '            <h3 class="font-serif">Upload Database Records</h3>\n' +
    "            <p class=\"font-body text-sm bulk-upload-subtitle\">Select or drag and drop a valid CSV file (max 5MB) to bulk create records. Must include 'title' and 'slug' columns.</p>\n" +
    "\n" +
    '            <div id="drop-zone" class="drop-zone">\n' +
    '                <p class="font-mono text-sm drop-zone-text">DRAG &amp; DROP CSV FILE HERE</p>\n' +
    '                <p class="font-mono text-xs drop-zone-subtext">OR CLICK TO BROWSE</p>\n' +
    '                <input type="file" id="csv-file-input" class="csv-file-input" accept=".csv">\n' +
    "            </div>\n" +
    "\n" +
    '            <div id="selected-file-display" class="is-hidden font-mono text-sm selected-file-display">\n' +
    '                <span id="file-name"></span>\n' +
    '                <button id="clear-file-btn" class="quick-action-btn">Clear</button>\n' +
    "            </div>\n" +
    "\n" +
    "            <!-- Validation Preview -->\n" +
    '            <div id="validation-preview" class="is-hidden validation-preview">\n' +
    '                <div id="validation-summary" class="validation-summary"></div>\n' +
    '                <div id="validation-errors-container" class="is-hidden validation-errors-container">\n' +
    '                    <h4 class="font-serif validation-errors-heading">Row Errors</h4>\n' +
    '                    <ul id="validation-error-list" class="validation-error-list"></ul>\n' +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    '            <div id="upload-status-area" class="status-feedback is-hidden upload-status-area">\n' +
    '                <div class="status-indicator-block">\n' +
    '                    <span id="status-icon" class="status-dot"></span>\n' +
    '                    <span id="status-text" class="status-text-mono"></span>\n' +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    '            <div id="upload-results" class="is-hidden upload-results">\n' +
    '                <h4 class="font-serif">Upload Results</h4>\n' +
    '                <div id="success-summary" class="text-sm upload-success-summary"></div>\n' +
    '                <ul id="error-list" class="text-sm font-mono upload-error-list">\n' +
    "                </ul>\n" +
    "            </div>\n" +
    "\n" +
    '            <footer class="admin-action-bar upload-action-bar">\n' +
    '                <button id="upload-submit-btn" class="btn-primary" disabled>Start Upload</button>\n' +
    "            </footer>\n" +
    "        </div>";

  container.innerHTML = html;

  // ---- DOM refs ----
  var dropZone = document.getElementById("drop-zone");
  var fileInput = document.getElementById("csv-file-input");
  var selectedFileDisplay = document.getElementById("selected-file-display");
  var fileNameDisplay = document.getElementById("file-name");
  var clearFileBtn = document.getElementById("clear-file-btn");
  var submitBtn = document.getElementById("upload-submit-btn");
  var statusArea = document.getElementById("upload-status-area");
  var statusText = document.getElementById("status-text");
  var resultsContainer = document.getElementById("upload-results");
  var successSummary = document.getElementById("success-summary");
  var errorList = document.getElementById("error-list");
  var validationPreview = document.getElementById("validation-preview");
  var validationSummary = document.getElementById("validation-summary");
  var validationErrorsContainer = document.getElementById(
    "validation-errors-container",
  );
  var validationErrorList = document.getElementById("validation-error-list");

  // ---- CSV Parsing (no external libraries) ----

  function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseCSV(text) {
    var lines = text.split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [] };

    var headers = parseCSVLine(lines[0]);
    var rows = [];

    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var values = parseCSVLine(line);
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j].trim()] = values[j] || "";
      }
      rows.push(row);
    }

    return { headers: headers, rows: rows };
  }

  // ---- Validation ----

  function validateCSV(text) {
    var parsed = parseCSV(text);
    var headers = parsed.headers;
    var rows = parsed.rows;

    if (rows.length === 0) {
      allRowErrors = ["CSV file contains no data rows after the header."];
      validRows = [];
      renderValidation(true);
      return;
    }

    // Check required columns exist
    var headerSet = {};
    for (var hi = 0; hi < headers.length; hi++) {
      headerSet[headers[hi].trim().toLowerCase()] = true;
    }

    if (!headerSet["title"]) {
      allRowErrors = [
        'Missing required column: "title". Please ensure your CSV has a "title" column.',
      ];
      validRows = [];
      renderValidation(true);
      return;
    }
    if (!headerSet["slug"]) {
      allRowErrors = [
        'Missing required column: "slug". Please ensure your CSV has a "slug" column.',
      ];
      validRows = [];
      renderValidation(true);
      return;
    }

    allRowErrors = [];
    validRows = [];

    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var rowNum = ri + 2; // 1-based + header
      var rowErrors = [];

      var title = (row.title || "").trim();
      var slug = (row.slug || "").trim();

      if (!title) {
        rowErrors.push("missing title");
      }
      if (!slug) {
        rowErrors.push("missing slug");
      }

      // Enum validation (only if value is provided)
      var era = (row.era || "").trim();
      if (era && !VALID_ERAS[era]) {
        rowErrors.push("invalid era '" + era + "'");
      }

      var timeline = (row.timeline || "").trim();
      if (timeline && !VALID_TIMELINES[timeline]) {
        rowErrors.push("invalid timeline '" + timeline + "'");
      }

      var mapLabel = (row.map_label || "").trim();
      if (mapLabel && !VALID_MAP_LABELS[mapLabel]) {
        rowErrors.push("invalid map_label '" + mapLabel + "'");
      }

      var gospelCategory = (row.gospel_category || "").trim();
      if (gospelCategory && !VALID_GOSPEL_CATEGORIES[gospelCategory]) {
        rowErrors.push("invalid gospel_category '" + gospelCategory + "'");
      }

      // Primary verse JSON validation
      var primaryVerse = (row.primary_verse || "").trim();
      if (primaryVerse) {
        try {
          JSON.parse(primaryVerse);
        } catch (e) {
          rowErrors.push("invalid JSON in primary_verse");
        }
      }

      if (rowErrors.length > 0) {
        allRowErrors.push(
          "Row " + rowNum + ": " + rowErrors.join("; ") + " \u2014 skipped",
        );
      } else {
        // Keep the row data for valid rows (preserve original column order)
        var cleanRow = {};
        for (var ci = 0; ci < headers.length; ci++) {
          var colName = headers[ci].trim();
          cleanRow[colName] = row[colName] || "";
        }
        validRows.push(cleanRow);
      }
    }

    renderValidation(validRows.length === 0 && allRowErrors.length > 0);
  }

  function renderValidation(isFatal) {
    var totalRows = validRows.length + allRowErrors.length;
    var summaryText =
      validRows.length +
      " of " +
      totalRows +
      " rows valid \u2014 " +
      (validRows.length > 0 ? "ready to insert" : "no valid rows to insert");

    validationSummary.textContent = summaryText;
    validationSummary.className = "validation-summary";

    if (isFatal || allRowErrors.length > 0) {
      validationSummary.classList.add("invalid");
    } else {
      validationSummary.classList.add("valid");
    }

    validationPreview.classList.remove("is-hidden");

    // Show/hide error list
    if (allRowErrors.length > 0) {
      validationErrorsContainer.classList.remove("is-hidden");
      var errorHtml = "";
      for (var ei = 0; ei < allRowErrors.length; ei++) {
        errorHtml += "<li>" + escapeHtml(allRowErrors[ei]) + "</li>";
      }
      validationErrorList.innerHTML = errorHtml;
    } else {
      validationErrorsContainer.classList.add("is-hidden");
      validationErrorList.innerHTML = "";
    }

    // Enable submit only if there are valid rows
    submitBtn.disabled = validRows.length === 0;
  }

  function resetValidation() {
    headerRow = [];
    validRows = [];
    allRowErrors = [];
    validationPreview.classList.add("is-hidden");
    validationSummary.textContent = "";
    validationSummary.className = "validation-summary";
    validationErrorsContainer.classList.add("is-hidden");
    validationErrorList.innerHTML = "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---- Build CSV string from valid rows only ----
  function buildCSVString(headers, rows) {
    // Header line
    var csv = headers.join(",") + "\n";
    // Data rows
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var values = [];
      for (var ci = 0; ci < headers.length; ci++) {
        var val = row[headers[ci]] || "";
        // Escape quotes and wrap in quotes if contains comma or newline or quote
        if (
          val.indexOf(",") !== -1 ||
          val.indexOf('"') !== -1 ||
          val.indexOf("\n") !== -1
        ) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        values.push(val);
      }
      csv += values.join(",") + "\n";
    }
    return csv;
  }

  // ---- Event Handlers ----

  // Drag and Drop
  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("drag-over");

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  clearFileBtn.addEventListener("click", function () {
    currentFile = null;
    fileInput.value = "";
    selectedFileDisplay.classList.add("is-hidden");
    dropZone.classList.remove("is-hidden");
    submitBtn.disabled = true;
    hideResults();
    hideStatus();
    resetValidation();
  });

  function handleFileSelect(file) {
    hideResults();
    hideStatus();
    resetValidation();

    // Client-side validation
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showStatus("ERROR: FILE MUST BE A .CSV", "error");
      return;
    }

    var maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showStatus("ERROR: FILE EXCEEDS 5MB LIMIT", "error");
      return;
    }

    currentFile = file;
    fileNameDisplay.textContent =
      file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
    selectedFileDisplay.classList.remove("is-hidden");
    dropZone.classList.add("is-hidden");
    submitBtn.disabled = true; // Will be enabled after validation

    // Read file content and validate
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;

      // Strip BOM if present
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }

      validateCSV(text);
    };
    reader.onerror = function () {
      showStatus("ERROR: FAILED TO READ FILE", "error");
    };
    reader.readAsText(file);
  }

  function showStatus(message, type) {
    statusArea.className = "status-feedback status-" + type;
    statusText.innerText = message.toUpperCase();
    statusArea.classList.remove("is-hidden");

    if (type === "loading") {
      statusArea.classList.add("pulse-animation");
    } else {
      statusArea.classList.remove("pulse-animation");
    }
  }

  function hideStatus() {
    statusArea.classList.add("is-hidden");
  }

  function hideResults() {
    resultsContainer.classList.add("is-hidden");
    errorList.innerHTML = "";
    errorList.style.display = "none";
    successSummary.textContent = "";
  }

  // ---- Submit (sends only valid rows as CSV) ----

  submitBtn.addEventListener("click", async function () {
    if (!currentFile || validRows.length === 0) return;

    submitBtn.disabled = true;
    clearFileBtn.disabled = true;
    hideResults();
    showStatus("UPLOADING AND PROCESSING...", "loading");

    // Build CSV from only the valid rows
    var parsed = parseCSV("");
    var headers = [];

    // Re-derive headers from the first valid row
    if (validRows.length > 0) {
      for (var key in validRows[0]) {
        if (validRows[0].hasOwnProperty(key)) {
          headers.push(key);
        }
      }
    }

    var csvContent = buildCSVString(headers, validRows);
    var blob = new Blob([csvContent], { type: "text/csv" });

    var formData = new FormData();
    formData.append(
      "file",
      blob,
      currentFile.name.replace(".csv", "_valid.csv"),
    );

    try {
      var response = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      var result = await response.json();

      if (response.ok && result.success) {
        showStatus("UPLOAD SUCCESSFUL", "success");
        successSummary.textContent = result.message;
        resultsContainer.classList.remove("is-hidden");

        // Clear the file
        currentFile = null;
        fileInput.value = "";
        resetValidation();
        setTimeout(function () {
          selectedFileDisplay.classList.add("is-hidden");
          dropZone.classList.remove("is-hidden");
          clearFileBtn.disabled = false;
        }, 2000);
      } else {
        showStatus("UPLOAD FAILED WITH ERRORS", "error");
        if (result.errors && result.errors.length > 0) {
          errorList.innerHTML = result.errors
            .map(function (err) {
              return "<li>- " + escapeHtml(err) + "</li>";
            })
            .join("");
          errorList.style.display = "block";
        } else if (result.detail) {
          errorList.innerHTML = "<li>- " + escapeHtml(result.detail) + "</li>";
          errorList.style.display = "block";
        }
        resultsContainer.classList.remove("is-hidden");
        submitBtn.disabled = false;
        clearFileBtn.disabled = false;
      }
    } catch (error) {
      showStatus("NETWORK ERROR", "error");
      errorList.innerHTML = "<li>- " + escapeHtml(error.message) + "</li>";
      errorList.style.display = "block";
      resultsContainer.classList.remove("is-hidden");
      submitBtn.disabled = false;
      clearFileBtn.disabled = false;
    }
  });
};
