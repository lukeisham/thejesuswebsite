// Trigger: DOMContentLoaded -> renderAcademicChallengesList('academic-challenges-container')
// Function: fetchAcademicChallenges fetches live API data, groups by id to merge weight
//           from sub_type rows, sorts by rank, and injects ranked HTML rows
// Output:  Ranked list of published academic challenges with title links and weight scores

function renderAcademicChallengesList(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<p class="text-sm text-muted">Loading academic challenges...</p>';

  fetch("/api/public/challenges?type=challenge_academic&status=published")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch challenges (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var rows = data.challenges || data || [];
      if (!Array.isArray(rows)) {
        throw new Error("Unexpected API response format");
      }

      // Group rows by id so we can merge main entries with their weight sub-type rows
      var groups = {};
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rowId = row.id;
        if (!rowId) continue;
        if (!groups[rowId]) {
          groups[rowId] = { main: null, weight: null };
        }
        var sub = row.sub_type;
        if (sub === "ranked_weight") {
          groups[rowId].weight = row;
        } else if (!sub || sub === null || sub === "ranked_search_term") {
          // Main entry or search-term row — prefer the null sub_type as main
          if (!sub || sub === null) {
            groups[rowId].main = row;
          } else if (!groups[rowId].main) {
            groups[rowId].main = row;
          }
        }
      }

      // Build a clean list of challenges with merged weight scores
      var challenges = [];
      for (var id in groups) {
        if (!groups.hasOwnProperty(id)) continue;
        var grp = groups[id];
        var main = grp.main;
        if (!main) continue;
        // Skip if not published (defense-in-depth beyond API filter)
        if (main.status && main.status !== "published") continue;
        // Skip if missing required fields
        if (!main.academic_challenge_title) continue;

        var score = null;
        if (grp.weight && grp.weight.academic_challenge_weight) {
          var rawWeight = grp.weight.academic_challenge_weight;
          try {
            var parsed =
              typeof rawWeight === "string" ? JSON.parse(rawWeight) : rawWeight;
            // Weight may be a single number, an array, or an object with score/weight/value keys
            if (typeof parsed === "number") {
              score = parsed;
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              score = Number(parsed[0]) || null;
            } else if (typeof parsed === "object" && parsed !== null) {
              score =
                Number(parsed.weight || parsed.score || parsed.value) || null;
            }
          } catch (e) {
            // Weight parse failed — skip score display
          }
        }

        challenges.push({
          title: main.academic_challenge_title,
          link: main.academic_challenge_link || "",
          rank: main.academic_challenge_rank,
          score: score,
        });
      }

      // Sort by rank (numeric or string comparison)
      challenges.sort(function (a, b) {
        var ra = parseInt(a.rank, 10);
        var rb = parseInt(b.rank, 10);
        if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
        return String(a.rank).localeCompare(String(b.rank));
      });

      if (challenges.length === 0) {
        container.innerHTML =
          '<div class="empty-state text-center py-12">' +
          '<p class="text-lg text-muted font-serif">No academic challenges available yet.</p>' +
          "</div>";
        return;
      }

      container.innerHTML = challenges
        .map(function (challenge, index) {
          var rankDisplay = challenge.rank || index + 1;
          var titleHtml = challenge.link
            ? '<a href="' +
              escapeHtml(challenge.link) +
              '" target="_blank" class="text-primary hover:text-accent">' +
              escapeHtml(challenge.title) +
              "</a>"
            : '<span class="text-primary">' +
              escapeHtml(challenge.title) +
              "</span>";

          var scoreHtml = "";
          if (challenge.score !== null && !isNaN(challenge.score)) {
            scoreHtml =
              '<span class="badge badge--accent ml-2">Score: ' +
              Number(challenge.score).toFixed(2) +
              "</span>";
          }

          return (
            '<div class="list-row flex gap-4 py-4">' +
            '<div class="list-rank text-lg font-bold text-muted w-8">' +
            rankDisplay +
            ".</div>" +
            '<div class="list-content flex-1">' +
            '<h2 class="text-lg font-semibold mb-1">' +
            titleHtml +
            "</h2>" +
            '<div class="mt-2">' +
            '<span class="badge badge--muted">Academic Rank ' +
            rankDisplay +
            "</span>" +
            scoreHtml +
            "</div>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    })
    .catch(function (err) {
      console.error("Academic challenges list error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">Unable to load academic challenges.</p>' +
        '<p class="text-sm text-secondary mt-2">Please try again later.</p>' +
        "</div>";
    });
}

document.addEventListener("DOMContentLoaded", function () {
  renderAcademicChallengesList("academic-challenges-container");
});
