// Trigger:  Called by dashboard_challenge_academic.js or dashboard_challenge_popular.js → window.displayChallengeList(mode)
//           on initial load for both academic and popular, and after Refresh.
// Main:    displayChallengeList(mode) — fetches records from the API filtered
//           by challenge type (academic/popular), sorts by rank, renders the
//           ranked list with nested response sub-cards, adds a frontend-page
//           link to each row, and manages row selection for agent search and
//           insert response operations. Targets mode-specific containers.
// Output:  Ranked challenge list rendered in #academic-challenge-ranked-list
//          or #popular-challenge-ranked-list with selection state tracked in
//          _challengeModuleState. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayChallengeList
   Fetches records for the active challenge mode, sorts by rank, and renders
   them as a ranked ordered list. Each challenge row is expandable to reveal
   nested response sub-cards showing Draft/Published status, and includes a
   link to the public frontend page.

   Parameters:
     mode (string) — 'academic' or 'popular'
----------------------------------------------------------------------------- */
async function displayChallengeList(mode) {
  const loadingEl = document.getElementById(mode + "-challenge-list-loading");
  const listEl = document.getElementById(mode + "-challenge-ranked-list");
  const emptyEl = document.getElementById(mode + "-challenge-list-empty");
  const errorEl = document.getElementById(mode + "-challenge-list-error");

  // Show loading state
  if (loadingEl) loadingEl.style.display = "flex";
  if (listEl) listEl.innerHTML = "";
  if (emptyEl) emptyEl.setAttribute("aria-hidden", "true");
  if (errorEl) errorEl.setAttribute("aria-hidden", "true");

  try {
    // Fetch all records — the API returns the full records table.
    // We filter client-side by checking the appropriate challenge title column.
    const response = await fetch("/api/admin/records", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();
    const allRecords = data.records || data;

    // Determine which columns to filter/sort by based on mode
    const titleCol =
      mode === "academic"
        ? "academic_challenge_title"
        : "popular_challenge_title";
    const rankCol =
      mode === "academic"
        ? "academic_challenge_rank"
        : "popular_challenge_rank";
    const weightCol =
      mode === "academic"
        ? "academic_challenge_weight"
        : "popular_challenge_weight";

    // Filter: only records of the correct challenge type that have a challenge title set
    const expectedType =
      mode === "academic" ? "challenge_academic" : "challenge_popular";
    const challenges = allRecords.filter(function (rec) {
      return (
        rec.type === expectedType &&
        rec[titleCol] &&
        rec[titleCol].trim() !== ""
      );
    });

    // Sort by rank (ascending), nulls/empty at the bottom
    challenges.sort(function (a, b) {
      const rankA = parseInt(a[rankCol], 10) || Number.MAX_SAFE_INTEGER;
      const rankB = parseInt(b[rankCol], 10) || Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });

    // Store in module state
    if (mode === "academic") {
      window._challengeModuleState.academicChallenges = challenges;
    } else {
      window._challengeModuleState.popularChallenges = challenges;
    }

    // Hide loading
    if (loadingEl) loadingEl.style.display = "none";

    if (challenges.length === 0) {
      // Show empty state
      if (emptyEl) emptyEl.removeAttribute("aria-hidden");
      return;
    }

    // Hide empty state
    if (emptyEl) emptyEl.setAttribute("aria-hidden", "true");

    // Render each challenge as a row
    if (listEl) {
      listEl.innerHTML = "";
      challenges.forEach(function (challenge, index) {
        const rowEl = _buildChallengeRow(challenge, index, mode);
        listEl.appendChild(rowEl);
      });
    }
  } catch (err) {
    console.error("[challenge_list_display] Fetch failed:", err);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.removeAttribute("aria-hidden");
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load challenge list. Please refresh and try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _buildChallengeRow
   Constructs a single challenge row DOM element. The row includes:
   - Rank number (from list position)
   - Challenge title (with frontend-page link anchor)
   - Total score (derived from weight × rank)
   - Status badge (Draft / Published)
   - Expandable body showing nested response sub-cards

   Parameters:
     challenge (object) — record object from the API
     index (number)     — position in the sorted array
     mode (string)      — 'academic' or 'popular'
   Returns:
     HTMLLIElement — the list item row element
----------------------------------------------------------------------------- */
function _buildChallengeRow(challenge, index, mode) {
  const rowEl = document.createElement("li");
  rowEl.className = "challenge-row";
  rowEl.setAttribute("data-record-id", challenge.id || "");
  rowEl.setAttribute("data-record-slug", challenge.slug || "");

  const rankCol =
    mode === "academic" ? "academic_challenge_rank" : "popular_challenge_rank";
  const titleCol =
    mode === "academic"
      ? "academic_challenge_title"
      : "popular_challenge_title";
  const weightCol =
    mode === "academic"
      ? "academic_challenge_weight"
      : "popular_challenge_weight";

  const title = challenge[titleCol] || "Untitled Challenge";
  const rank = parseInt(challenge[rankCol], 10) || 0;
  const status = challenge.status || "draft";
  const weightRaw = challenge[weightCol] || "{}";

  // Build the frontend page URL for this record
  const frontendPage =
    mode === "academic" ? "academic_challenge.html" : "popular_challenge.html";
  const frontendUrl =
    "/frontend/pages/debate/" +
    frontendPage +
    "?id=" +
    encodeURIComponent(challenge.slug || "");

  // Compute total score from weight criteria
  let totalScore = 0;
  try {
    const weights =
      typeof weightRaw === "string" ? JSON.parse(weightRaw) : weightRaw;
    if (weights && typeof weights === "object") {
      const values = Object.values(weights);
      values.forEach(function (val) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          totalScore += num;
        }
      });
      // Multiply by rank position — lower rank (higher position) = higher score
      totalScore = Math.round(totalScore * (index + 1));
    }
  } catch (e) {
    // If weight parsing fails, use rank as score
    totalScore = (index + 1) * 10;
  }

  // --- Header ---
  const headerEl = document.createElement("div");
  headerEl.className = "challenge-row__header";

  // Rank number
  const rankEl = document.createElement("span");
  rankEl.className = "challenge-row__rank";
  rankEl.textContent = String(index + 1);
  headerEl.appendChild(rankEl);

  // Title (with link to public frontend page)
  const titleEl = document.createElement("span");
  titleEl.className = "challenge-row__title";
  const titleLink = document.createElement("a");
  titleLink.className = "challenge-row__title-link";
  titleLink.href = frontendUrl;
  titleLink.target = "_blank";
  titleLink.rel = "noopener";
  titleLink.textContent = title;
  titleLink.title = "Open " + title + " on the public site";
  titleEl.appendChild(titleLink);
  headerEl.appendChild(titleEl);

  // Score
  const scoreEl = document.createElement("span");
  scoreEl.className = "challenge-row__score";
  scoreEl.textContent = "Score: " + totalScore;
  headerEl.appendChild(scoreEl);

  // Status badge
  const statusEl = document.createElement("span");
  statusEl.className = "challenge-row__status";
  if (status === "published") {
    statusEl.classList.add("challenge-row__status--published");
    statusEl.innerHTML = "&#9679;P";
    statusEl.title = "Published";
  } else {
    statusEl.classList.add("challenge-row__status--draft");
    statusEl.innerHTML = "&#9675;D";
    statusEl.title = "Draft";
  }
  headerEl.appendChild(statusEl);

  rowEl.appendChild(headerEl);

  // --- Expandable Body (Response sub-cards) ---
  const bodyEl = document.createElement("div");
  bodyEl.className = "challenge-row__body";

  // Parse responses array
  let responses = [];
  try {
    responses =
      typeof challenge.responses === "string"
        ? JSON.parse(challenge.responses)
        : challenge.responses || [];
  } catch (e) {
    responses = [];
  }

  if (responses.length > 0) {
    const respListEl = document.createElement("ul");
    respListEl.className = "challenge-responses-list";

    responses.forEach(function (resp) {
      const respCardEl = document.createElement("li");
      respCardEl.className = "challenge-response-card";

      const respTitleEl = document.createElement("span");
      respTitleEl.className = "challenge-response-card__title";
      respTitleEl.textContent = resp.title || "Untitled Response";
      respCardEl.appendChild(respTitleEl);

      const respStatusEl = document.createElement("span");
      respStatusEl.className = "challenge-response-card__status";
      if (resp.status === "published") {
        respStatusEl.classList.add(
          "challenge-response-card__status--published",
        );
        respStatusEl.innerHTML = "&#9679;P";
        respStatusEl.title = "Published";
      } else {
        respStatusEl.classList.add("challenge-response-card__status--draft");
        respStatusEl.innerHTML = "&#9675;D";
        respStatusEl.title = "Draft";
      }
      respCardEl.appendChild(respStatusEl);

      respListEl.appendChild(respCardEl);
    });

    bodyEl.appendChild(respListEl);
  } else {
    const emptyRespEl = document.createElement("p");
    emptyRespEl.className = "challenge-responses-empty";
    emptyRespEl.textContent = "No responses yet.";
    bodyEl.appendChild(emptyRespEl);
  }

  rowEl.appendChild(bodyEl);

  // --- Click Handler: Select row + toggle expansion ---
  // Only the header area triggers selection; the title link has stopPropagation
  // so clicking the link opens the frontend page without selecting the row.
  titleLink.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  headerEl.addEventListener("click", function () {
    // Deselect all rows in THIS mode's list only
    const listEl = document.getElementById(mode + "-challenge-ranked-list");
    const allRows = listEl
      ? listEl.querySelectorAll(".challenge-row")
      : document.querySelectorAll(".challenge-row");
    allRows.forEach(function (r) {
      r.classList.remove("challenge-row--selected");
    });

    // Select this row
    rowEl.classList.add("challenge-row--selected");

    // Toggle expansion
    const wasExpanded = rowEl.classList.contains("challenge-row--expanded");
    // Collapse all rows in THIS mode's list only
    allRows.forEach(function (r) {
      r.classList.remove("challenge-row--expanded");
    });
    if (!wasExpanded) {
      rowEl.classList.add("challenge-row--expanded");
    }

    // Update module state — getters route to correct per-mode slot
    window._challengeModuleState.activeRecordId = challenge.id || "";
    window._challengeModuleState.activeRecordTitle = title;
    window._challengeModuleState.activeRecordSlug = challenge.slug || "";

    // Load search terms for this record into the sidebar
    if (typeof window.loadChallengeSearchTerms === "function") {
      window.loadChallengeSearchTerms(challenge);
    }

    // Populate the shared metadata widget with the selected record
    if (typeof window.populateMetadataWidget === "function") {
      window.populateMetadataWidget("metadata-widget-container", challenge);
    }
  });

  return rowEl;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_challenge.js
----------------------------------------------------------------------------- */
window.displayChallengeList = displayChallengeList;
