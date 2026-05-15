// Trigger: DOMContentLoaded -> renderResponseList('responses-list-container')
// Function: fetchResponses fetches published challenge_response records from the API,
//           renders each with title, linked challenge_id, date, and snippet
// Output:  Ranked list of published challenge responses with titles and challenge links

function renderResponseList(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<p class="text-sm text-muted">Loading responses...</p>';

  fetch("/api/public/responses?type=challenge_response&status=published")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch responses (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var rows = data.responses || data || [];
      if (!Array.isArray(rows)) {
        throw new Error("Unexpected API response format");
      }

      // Filter to only published challenge_response records (defense-in-depth)
      var responses = [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.status && row.status !== "published") continue;
        if (!row.title) continue;
        responses.push(row);
      }

      // Sort by created_at descending (newest first)
      responses.sort(function (a, b) {
        var dateA = a.created_at || "";
        var dateB = b.created_at || "";
        return dateB.localeCompare(dateA);
      });

      if (responses.length === 0) {
        container.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No responses available yet.</p>' +
          "</div>";
        return;
      }

      container.innerHTML = responses
        .map(function (resp, index) {
          var title = resp.title || "Untitled Response";
          var slug = resp.slug || "";
          var dateStr = resp.updated_at || resp.created_at || "";
          var challengeId = resp.challenge_id || "";

          // Format date
          var formattedDate = formatDate(dateStr);

          // Title as link to response detail page
          var titleLink = slug
            ? '<a href="../response.html?id=' +
              encodeURIComponent(slug) +
              '" class="text-primary hover:text-accent font-semibold">' +
              escapeHtml(title) +
              "</a>"
            : '<span class="text-primary font-semibold">' +
              escapeHtml(title) +
              "</span>";

          // Challenge link
          var challengeHtml = "";
          if (challengeId) {
            var challengeLabel = resp.challenge_title || challengeId;
            challengeHtml =
              '<span class="badge badge--muted">Challenge: ' +
              '<a href="../debate/challenge.html?id=' +
              encodeURIComponent(challengeId) +
              '" class="text-accent hover:underline">' +
              escapeHtml(challengeLabel) +
              "</a></span>";
          }

          // Snippet
          var snippetHtml = "";
          if (resp.snippet) {
            var snippet = resp.snippet;
            try {
              var parsed =
                typeof snippet === "string" ? JSON.parse(snippet) : snippet;
              if (Array.isArray(parsed) && parsed.length > 0) {
                snippet = parsed[0];
              } else if (typeof parsed === "object" && parsed.text) {
                snippet = parsed.text;
              }
            } catch (e) {
              // Use raw snippet as-is
            }
            snippetHtml =
              '<p class="inline-snippet text-sm text-secondary mt-1">' +
              escapeHtml(
                typeof snippet === "string"
                  ? snippet.length > 200
                    ? snippet.substring(0, 200) + "..."
                    : snippet
                  : String(snippet),
              ) +
              "</p>";
          }

          var rowHtml =
            '<div class="list-row flex gap-4 py-4" style="border-bottom: 1px solid var(--color-border);">' +
            '<div class="list-rank text-lg font-bold text-muted w-8">' +
            (index + 1) +
            ".</div>" +
            '<div class="list-content flex-1">' +
            '<h2 class="text-lg mb-1">' +
            titleLink +
            "</h2>" +
            snippetHtml +
            '<div class="mt-2">' +
            challengeHtml +
            (formattedDate
              ? '<span class="text-xs text-muted ml-2">' +
                escapeHtml(formattedDate) +
                "</span>"
              : "") +
            "</div>" +
            "</div>" +
            "</div>";

          return rowHtml;
        })
        .join("");
    })
    .catch(function (err) {
      console.error("Responses list error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">Unable to load responses.</p>' +
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

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    var d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return isoString;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  renderResponseList("responses-list-container");
});
