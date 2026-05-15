// Trigger: DOMContentLoaded -> renderAcademicChallengesWithResponses('academic-challenge-list-container')
// Function: fetchAcademicChallengesWithResponses fetches challenges + responses from live API,
//           matches responses to challenges by challenge_id FK, and injects paired HTML rows
// Output:  Ranked list of academic challenges, each with a response sub-card when available

function renderAcademicChallengesWithResponses(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<p class="text-sm text-muted">Loading academic challenges...</p>';

  // Fetch challenges and responses in parallel
  var challengesPromise = fetch(
    "/api/public/challenges?type=challenge_academic&status=published",
  ).then(function (res) {
    if (!res.ok)
      throw new Error("Challenges fetch failed (HTTP " + res.status + ")");
    return res.json();
  });

  var responsesPromise = fetch(
    "/api/public/responses?type=challenge_response&status=published",
  ).then(function (res) {
    if (!res.ok)
      throw new Error("Responses fetch failed (HTTP " + res.status + ")");
    return res.json();
  });

  Promise.all([challengesPromise, responsesPromise])
    .then(function (results) {
      var challengesData = results[0];
      var responsesData = results[1];

      var rows = challengesData.challenges || challengesData || [];
      if (!Array.isArray(rows)) {
        throw new Error("Unexpected challenges API response format");
      }

      var respRows = responsesData.responses || responsesData || [];
      if (!Array.isArray(respRows)) {
        respRows = [];
      }

      // Group challenge rows by id to merge main entries with weight sub-type rows
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
        } else if (!sub || sub === null) {
          groups[rowId].main = row;
        } else if (sub === "ranked_search_term" && !groups[rowId].main) {
          groups[rowId].main = row;
        }
      }

      // Index responses by challenge_id for fast lookup
      var responsesByChallengeId = {};
      for (var j = 0; j < respRows.length; j++) {
        var resp = respRows[j];
        if (!resp.challenge_id) continue;
        if (resp.status && resp.status !== "published") continue;
        // Only keep the first published response per challenge
        if (!responsesByChallengeId[resp.challenge_id]) {
          responsesByChallengeId[resp.challenge_id] = resp;
        }
      }

      // Only keep responses whose challenge_id matches an id in our groups
      for (var cid in responsesByChallengeId) {
        if (!responsesByChallengeId.hasOwnProperty(cid)) continue;
        if (!groups[cid]) {
          delete responsesByChallengeId[cid];
        }
      }

      // Build clean challenge list with merged weights and matched responses
      var challenges = [];
      for (var id in groups) {
        if (!groups.hasOwnProperty(id)) continue;
        var grp = groups[id];
        var main = grp.main;
        if (!main) continue;
        if (main.status && main.status !== "published") continue;
        if (!main.academic_challenge_title) continue;

        var score = null;
        if (grp.weight && grp.weight.academic_challenge_weight) {
          var rawWeight = grp.weight.academic_challenge_weight;
          try {
            var parsed =
              typeof rawWeight === "string" ? JSON.parse(rawWeight) : rawWeight;
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

        var matchedResponse = responsesByChallengeId[main.id] || null;

        challenges.push({
          id: main.id,
          title: main.academic_challenge_title,
          link: main.academic_challenge_link || "",
          rank: main.academic_challenge_rank,
          score: score,
          response: matchedResponse,
        });
      }

      // Sort by rank
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

          // Build challenge title link
          var titleHtml = challenge.link
            ? '<a href="' +
              escapeHtml(challenge.link) +
              '" target="_blank" class="text-primary hover:text-accent">' +
              escapeHtml(challenge.title) +
              "</a>"
            : '<span class="text-primary">' +
              escapeHtml(challenge.title) +
              "</span>";

          // Score badge
          var scoreHtml = "";
          if (challenge.score !== null && !isNaN(challenge.score)) {
            scoreHtml =
              '<span class="badge badge--accent ml-2">Score: ' +
              Number(challenge.score).toFixed(2) +
              "</span>";
          }

          // Challenge row HTML
          var html =
            '<div class="list-card-group mb-6">' +
            '<div class="list-row flex gap-4 py-4" style="border-bottom: 1px dashed var(--color-border);">' +
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
            "</div>";

          // Response sub-card when a published response is linked
          if (challenge.response) {
            var resp = challenge.response;
            var respTitle = resp.title || "Response";
            var respSlug = resp.slug || "";
            var respLink = respSlug
              ? "../response.html?id=" + encodeURIComponent(respSlug)
              : "#";

            html +=
              '<div class="list-row flex gap-4 py-4 pl-12 bg-secondary" style="border-bottom: 1px solid var(--color-border); border-left: 4px solid var(--color-dash-accent);">' +
              '<div class="list-content flex-1">' +
              '<h3 class="text-base font-semibold mb-1">' +
              '<a href="' +
              escapeHtml(respLink) +
              '" class="text-accent hover:underline">Response: ' +
              escapeHtml(respTitle) +
              "</a>" +
              "</h3>" +
              '<div class="mt-2 text-xs">' +
              '<a href="' +
              escapeHtml(respLink) +
              '" class="btn-primary">Read Full Academic Response \u2192</a>' +
              "</div>" +
              "</div>" +
              "</div>";
          }

          html += "</div>";
          return html;
        })
        .join("");
    })
    .catch(function (err) {
      console.error("Academic challenges with responses error:", err);
      container.innerHTML =
        '<div class="empty-state text-center py-12">' +
        '<p class="text-lg text-muted font-serif">Unable to load academic challenges.</p>' +
        '<p class="text-sm text-secondary mt-2">Please try again later.</p>' +
        "</div>";
    });
}

document.addEventListener("DOMContentLoaded", function () {
  renderAcademicChallengesWithResponses("academic-challenge-list-container");
});
