// Trigger: DOMContentLoaded -> renderWikipediaList('wikipedia-list-container')
// Function: fetchWikipediaEntries fetches live API data, groups by id to merge weight
//           from sub_type rows, sorts by rank, and injects ranked HTML rows
// Output:  Ranked list of published Wikipedia entries with title links and weight scores

function renderWikipediaList(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<p class="text-sm text-muted">Loading Wikipedia entries...</p>';

  fetch("/api/public/wikipedia?status=published")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch Wikipedia entries (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var rows = data.wikipedia || data || [];
      if (!Array.isArray(rows)) {
        throw new Error("Unexpected API response format");
      }

      var entries = [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.status && row.status !== "published") continue;
        if (!row.wikipedia_title) continue;

        var score = null;
        if (row.wikipedia_weight) {
          var rawWeight = row.wikipedia_weight;
          try {
            var parsed =
              typeof rawWeight === "string" ? JSON.parse(rawWeight) : rawWeight;
            if (typeof parsed === "number") {
              score = parsed;
            } else if (typeof parsed === "object" && parsed !== null) {
              var vals = Object.values(parsed);
              if (vals.length > 0) {
                score = vals.reduce(function (acc, v) {
                  var n = parseFloat(v);
                  return isNaN(n) ? acc : acc * n;
                }, 1.0);
              }
            }
          } catch (e) {
            // Weight parse failed
          }
        }

        var linkUrl = "";
        if (row.wikipedia_link) {
          if (typeof row.wikipedia_link === "object" && row.wikipedia_link.url) {
            linkUrl = row.wikipedia_link.url;
          } else if (typeof row.wikipedia_link === "string") {
            try {
              var linkParsed = JSON.parse(row.wikipedia_link);
              linkUrl = linkParsed.url || row.wikipedia_link;
            } catch (e) {
              linkUrl = row.wikipedia_link;
            }
          }
        }

        entries.push({
          title: row.wikipedia_title,
          link: linkUrl,
          rank: row.wikipedia_rank,
          score: score,
        });
      }

      // Sort by rank (numeric or string comparison)
      entries.sort(function (a, b) {
        var ra = parseInt(a.rank, 10);
        var rb = parseInt(b.rank, 10);
        if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
        return String(a.rank).localeCompare(String(b.rank));
      });

      if (entries.length === 0) {
        container.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No Wikipedia entries available yet.</p>' +
          "</div>";
        return;
      }

      container.innerHTML = entries
        .map(function (entry, index) {
          var rankDisplay = entry.rank || index + 1;
          var titleHtml = entry.link
            ? '<a href="' +
              escapeHtml(entry.link) +
              '" target="_blank" rel="noopener" class="text-primary hover:text-accent">' +
              escapeHtml(entry.title) +
              "</a>"
            : '<span class="text-primary">' +
              escapeHtml(entry.title) +
              "</span>";

          var scoreHtml = "";
          if (entry.score !== null && !isNaN(entry.score)) {
            scoreHtml =
              '<span class="badge badge--accent ml-2">Score: ' +
              Number(entry.score).toFixed(2) +
              "</span>";
          }

          return (
            '<div class="list-row flex gap-4 py-4" style="border-bottom: 1px solid var(--color-border);">' +
            '<div class="list-rank text-lg font-bold text-muted w-8">' +
            rankDisplay +
            ".</div>" +
            '<div class="list-content flex-1">' +
            '<h2 class="text-lg font-semibold mb-1">' +
            titleHtml +
            "</h2>" +
            '<div class="mt-2">' +
            '<span class="badge badge--muted">Rank ' +
            rankDisplay +
            "</span>" +
            scoreHtml +
            (entry.link
              ? '<a href="' +
                escapeHtml(entry.link) +
                '" target="_blank" rel="noopener" class="text-xs text-accent ml-2">External Link \u2197</a>'
              : "") +
            "</div>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    })
    .catch(function (err) {
      console.error("Wikipedia list error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">Unable to load Wikipedia entries.</p>' +
        '<p class="text-sm text-secondary mt-2">Please try again later.</p>' +
        "</div>";
    });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", function () {
  renderWikipediaList("wikipedia-list-container");
});
