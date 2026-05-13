// Trigger:  Called by the orchestrator to wire the CSV file input button.
//           Activated when the admin clicks "Upload CSV" and selects a .csv file.
// Main:    initBulkCsvUpload() — wires the file input change handler. On file
//           selection, parses the CSV with vanilla JS (split by newlines/commas,
//           with quote handling), maps column headers to schema fields, validates
//           each row client-side (required fields, enum values, patterns), and
//           passes valid/invalid rows to the ephemeral review store via
//           window.loadBulkReviewRows(). NO database writes occur in this phase.
// Output:  Parsed and validated rows loaded into the ephemeral bulk review store.
//           Auto-selects the "Bulk" toggle to show the review panel.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — BULK CSV UPLOAD HANDLER (Phase 1: Parse & Validate)
   File:    js/2.0_records/dashboard/bulk_csv_upload_handler.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Handles CSV file selection, client-side parsing, and validation.
            This is Phase 1 of the bulk upload workflow — NO data is written
            to the database. Parsed rows are loaded into the ephemeral review
            store for admin review in Phase 2.
============================================================================= */

/* -----------------------------------------------------------------------------
   VALID ENUM VALUES — mirrors server-side validation in admin_api.py
----------------------------------------------------------------------------- */
const VALID_ERAS = [
  "PreIncarnation",
  "OldTestament",
  "EarlyLife",
  "Life",
  "GalileeMinistry",
  "JudeanMinistry",
  "PassionWeek",
  "Post-Passion",
];

const VALID_TIMELINES = [
  "PreIncarnation",
  "OldTestament",
  "EarlyLifeUnborn",
  "EarlyLifeBirth",
  "EarlyLifeInfancy",
  "EarlyLifeChildhood",
  "LifeTradie",
  "LifeBaptism",
  "LifeTemptation",
  "GalileeCallingTwelve",
  "GalileeSermonMount",
  "GalileeMiraclesSea",
  "GalileeTransfiguration",
  "JudeanOutsideJudea",
  "JudeanMissionSeventy",
  "JudeanTeachingTemple",
  "JudeanRaisingLazarus",
  "JudeanFinalJourney",
  "PassionPalmSunday",
  "PassionMondayCleansing",
  "PassionTuesdayTeaching",
  "PassionWednesdaySilent",
  "PassionMaundyThursday",
  "PassionMaundyLastSupper",
  "PassionMaundyGethsemane",
  "PassionMaundyBetrayal",
  "PassionFridaySanhedrin",
  "PassionFridayCivilTrials",
  "PassionFridayCrucifixionBegins",
  "PassionFridayDarkness",
  "PassionFridayDeath",
  "PassionFridayBurial",
  "PassionSaturdayWatch",
  "PassionSundayResurrection",
  "PostResurrectionAppearances",
  "Ascension",
  "OurResponse",
  "ReturnOfJesus",
];

const VALID_MAP_LABELS = [
  "Overview",
  "Empire",
  "Levant",
  "Judea",
  "Galilee",
  "Jerusalem",
];

const VALID_GOSPEL_CATEGORIES = [
  "event",
  "location",
  "person",
  "theme",
  "object",
];

/* Schema field mapping — CSV column header → records table column */
const CSV_FIELD_MAP = {
  title: "title",
  slug: "slug",
  primary_verse: "primary_verse",
  description: "description",
  snippet: "snippet",
  era: "era",
  timeline: "timeline",
  gospel_category: "gospel_category",
  map_label: "map_label",
  geo_id: "geo_id",
  bibliography: "bibliography",
  context_links: "context_links",
  iaa: "iaa",
  pledius: "pledius",
  manuscript: "manuscript",
};

/* -----------------------------------------------------------------------------
   PUBLIC: initBulkCsvUpload
   Wires the CSV file input to trigger parsing on file selection.
----------------------------------------------------------------------------- */
function initBulkCsvUpload() {
  const fileInput = document.getElementById("records-all-csv-input");
  if (!fileInput) return;

  fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith(".csv")) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: Only CSV files are accepted. Please select a .csv file.",
        );
      }
      if (typeof window.updateRecordsAllStatusBar === "function") {
        window.updateRecordsAllStatusBar(
          "Error: Only CSV files are accepted.",
          "is-error",
        );
      }
      fileInput.value = "";
      return;
    }

    // Parse the CSV file
    _parseCsvFile(file);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _parseCsvFile
   Reads the file as text, splits into lines, parses CSV rows with basic
   quote handling, maps headers, and validates each row.
----------------------------------------------------------------------------- */
function _parseCsvFile(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;

    try {
      const lines = _splitCsvLines(text);
      if (lines.length < 2) {
        throw new Error("CSV file is empty or missing data rows.");
      }

      // Extract headers from first line
      const headers = _parseCsvLine(lines[0]);
      const dataLines = lines.slice(1);

      // Parse and validate each row
      const parsedRows = [];

      dataLines.forEach(function (line, index) {
        if (!line.trim()) return; // Skip empty lines

        const values = _parseCsvLine(line);
        const rowData = {};
        const rowErrors = [];

        // Map CSV columns to schema fields
        headers.forEach(function (header, colIdx) {
          const normalizedHeader = header
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_");
          const schemaField =
            CSV_FIELD_MAP[normalizedHeader] || normalizedHeader;

          if (colIdx < values.length) {
            rowData[schemaField] = values[colIdx].trim();
          }
        });

        // Validate required fields
        if (!rowData.title) {
          rowErrors.push("Missing title");
        }
        if (!rowData.slug) {
          rowErrors.push("Missing slug");
        }

        // Validate primary_verse is valid JSON (if present)
        if (rowData.primary_verse && rowData.primary_verse.trim()) {
          try {
            JSON.parse(rowData.primary_verse.trim());
          } catch (jsonErr) {
            rowErrors.push(
              'Invalid primary_verse JSON: "' + rowData.primary_verse + '"',
            );
          }
        }

        // Validate enum fields
        if (rowData.era && !VALID_ERAS.includes(rowData.era)) {
          rowErrors.push('Invalid era "' + rowData.era + '"');
        }

        if (rowData.timeline && !VALID_TIMELINES.includes(rowData.timeline)) {
          rowErrors.push('Invalid timeline "' + rowData.timeline + '"');
        }

        if (
          rowData.gospel_category &&
          !VALID_GOSPEL_CATEGORIES.includes(rowData.gospel_category)
        ) {
          rowErrors.push(
            'Invalid gospel_category "' + rowData.gospel_category + '"',
          );
        }

        if (
          rowData.map_label &&
          !VALID_MAP_LABELS.includes(rowData.map_label)
        ) {
          rowErrors.push('Invalid map_label "' + rowData.map_label + '"');
        }

        // Validate geo_id is a valid integer if present
        if (rowData.geo_id && rowData.geo_id.length > 0) {
          const geoNum = parseInt(rowData.geo_id, 10);
          if (isNaN(geoNum) || !Number.isInteger(geoNum)) {
            rowErrors.push(
              'Invalid geo_id "' + rowData.geo_id + '" — must be an integer',
            );
          }
        }

        parsedRows.push({
          rowIndex: index + 2, // 1-based + header row
          fields: rowData,
          valid: rowErrors.length === 0,
          checked: rowErrors.length === 0, // Pre-check valid rows
          errors: rowErrors,
        });
      });

      // Count validation results
      const totalRows = parsedRows.length;
      const validCount = parsedRows.filter(function (r) {
        return r.valid;
      }).length;
      const invalidCount = totalRows - validCount;

      if (parsedRows.length === 0) {
        if (typeof window.surfaceError === "function") {
          window.surfaceError("Error: No data rows found in the CSV file.");
        }
        if (typeof window.updateRecordsAllStatusBar === "function") {
          window.updateRecordsAllStatusBar(
            "Error: No data rows found in the CSV file.",
            "is-error",
          );
        }
        return;
      }

      // If there are errors, surface them
      if (invalidCount > 0) {
        if (typeof window.surfaceError === "function") {
          window.surfaceError(
            "Error: CSV validation failed. " +
              invalidCount +
              " row(s) contain missing or invalid fields.",
          );
        }
      }

      // Load rows into the ephemeral review store (Phase 2)
      if (typeof window.loadBulkReviewRows === "function") {
        window.loadBulkReviewRows(parsedRows);
      } else {
        console.warn("[bulk_csv_upload] loadBulkReviewRows not available");
        if (typeof window.surfaceError === "function") {
          window.surfaceError(
            "Error: Bulk review panel is not available. Please reload the page.",
          );
        }
      }
    } catch (err) {
      console.error("[bulk_csv_upload] Parse error:", err);
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: CSV file could not be parsed. Check the file format and try again.",
        );
      }
      if (typeof window.updateRecordsAllStatusBar === "function") {
        window.updateRecordsAllStatusBar(
          "Error: CSV file could not be parsed. Check the file format and try again.",
          "is-error",
        );
      }
    } finally {
      // Reset file input so the same file can be re-uploaded
      fileInput.value = "";
    }
  };

  reader.onerror = function () {
    console.error("[bulk_csv_upload] File read error");
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Could not read the CSV file. Please try again.",
      );
    }
    if (typeof window.updateRecordsAllStatusBar === "function") {
      window.updateRecordsAllStatusBar(
        "Error: Could not read the CSV file.",
        "is-error",
      );
    }
  };

  reader.readAsText(file);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _splitCsvLines
   Splits text into lines, handling both \n and \r\n line endings.
----------------------------------------------------------------------------- */
function _splitCsvLines(text) {
  return text.split(/\r?\n/);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _parseCsvLine
   Parses a single CSV line into an array of values. Handles quoted fields
   that may contain commas and escaped double-quotes.
----------------------------------------------------------------------------- */
function _parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote (double-double-quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  // Push the last value
  result.push(current);
  return result;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initBulkCsvUpload = initBulkCsvUpload;
