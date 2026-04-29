// =============================================================================
//
//   THE JESUS WEBSITE — LIST VIEW RENDERER
//   File:    frontend/display_big/list_view.js
//   Version: 1.1.0
//   Purpose: Reads URL params, queries DB for lists, and injects row-based HTML.
//   Source:  guide_appearance.md §2.3, §2.4
//
// =============================================================================

function renderListView() {
  var db = window.TheJesusDB;
  if (!db || !db.ready) return;

  var urlParams = new URLSearchParams(window.location.search);
  var searchParam = urlParams.get("search");
  var eraParam = urlParams.get("era");
  var categoryParam = urlParams.get("category");
  var mapParam = urlParams.get("map");
  var pageParam = parseInt(urlParams.get("page"), 10) || 1;
  var limit = 50;
  var offset = (pageParam - 1) * limit;

  // Set Header Title
  var titleEl = document.getElementById("list-title");
  if (titleEl) {
    if (searchParam) {
      titleEl.textContent = 'Search Results: "' + searchParam + '"';
    } else if (urlParams.get("title")) {
      titleEl.textContent = urlParams.get("title");
    } else if (categoryParam) {
      titleEl.textContent =
        "Category: " +
        (categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1));
    } else if (eraParam) {
      titleEl.textContent = "Era: " + eraParam;
    } else {
      titleEl.textContent = "Records List";
    }
  }

  var records = [];

  if (searchParam) {
    records = db.searchRecords(searchParam, limit);
    // Note: db.searchRecords limits results to the standard limit.
  } else {
    records = db.getRecordList({
      era: eraParam,
      gospel_category: categoryParam,
      map_label: mapParam,
      limit: limit + 1, // Fetch one extra to see if there's a next page
      offset: offset,
    });
  }

  var hasNext = !searchParam && records.length > limit;
  if (!searchParam && records.length > limit) {
    records.pop(); // remove the extra record since it's just for peek
  }

  var listEl = document.getElementById("record-list");
  if (!listEl) return;

  if (records.length === 0) {
    listEl.innerHTML =
      '<li class="list-row-item"><p>No records found matching your criteria.</p></li>';
  } else {
    var html = records
      .map(function (record) {
        // Parse Snippet
        var snip = "";
        if (record.snippet) {
          try {
            var parsed = JSON.parse(record.snippet);
            snip = Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (e) {
            snip = record.snippet;
          }
        } else {
          snip = "No description available.";
        }

        // Parse Primary Verse
        var verseText = "";
        if (record.primary_verse) {
          try {
            var verseArr = JSON.parse(record.primary_verse);
            if (Array.isArray(verseArr) && verseArr.length > 0) {
              var v = verseArr[0];
              verseText = v.book + " " + v.chapter + ":" + v.verse;
            }
          } catch (e) {}
        }

        var recordUrl = "/record/" + encodeURIComponent(record.slug);

        // Format depending on presence of verse reference (matches Guide Appearance 2.3 vs 2.4/others)
        if (verseText) {
          return [
            '<li class="resource-row">',
            '    <a href="' +
              recordUrl +
              '" class="resource-title">' +
              record.title +
              "</a>",
            "    <div>",
            '        <span class="resource-meta">' + verseText + "</span>",
            '        <span class="resource-desc">' + snip + "</span>",
            "    </div>",
            "</li>",
          ].join("\n");
        } else {
          // If no verse, potentially provide map label or era as prefix meta tag
          var metaText = record.map_label || record.era || "";
          var metaHtml = metaText
            ? '<strong style="font-family:var(--font-mono);font-size:var(--text-xs);margin-right:8px;">[' +
              metaText +
              "]</strong>"
            : "";
          return [
            '<li class="list-row-item">',
            '    <div class="list-row-content">',
            '        <a href="' +
              recordUrl +
              '" class="list-row-title">' +
              record.title +
              "</a>",
            '        <p class="list-row-snippet">',
            "            " + metaHtml + snip,
            "        </p>",
            "    </div>",
            "</li>",
          ].join("\n");
        }
      })
      .join("");
    listEl.innerHTML = html;
  }

  // Handle Pagination Display logic
  var paginationEl = document.getElementById("list-pagination");
  if (paginationEl) {
    if (!searchParam && (pageParam > 1 || hasNext)) {
      paginationEl.classList.remove("is-hidden");
      paginationEl.classList.add("is-visible-flex");
      var navHtml = "";

      if (pageParam > 1) {
        var prevParams = new URLSearchParams(window.location.search);
        prevParams.set("page", pageParam - 1);
        navHtml +=
          '<a href="?' +
          prevParams.toString() +
          '" class="pagination-btn">← Previous</a>';
      }
      if (hasNext) {
        var nextParams = new URLSearchParams(window.location.search);
        nextParams.set("page", pageParam + 1);
        navHtml +=
          '<a href="?' +
          nextParams.toString() +
          '" class="pagination-btn">Next →</a>';
      }

      paginationEl.innerHTML = navHtml;
    } else {
      paginationEl.classList.add("is-hidden");
      paginationEl.classList.remove("is-visible-flex");
    }
  }
}

// Bind to event dispatcher or direct execute
window.addEventListener("thejesusdb:ready", function () {
  renderListView();
});

// Failsafe if event fired before this script was completely loaded
if (window.TheJesusDB && window.TheJesusDB.ready) {
  renderListView();
}
