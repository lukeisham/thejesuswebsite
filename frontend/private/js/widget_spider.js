/**
 * widget_spider.js
 * ────────────────
 * Runs a mock Web Crawler to search for mentions of the site on the web,
 * attempting to guess if the mention is from a Human or an AI Agent.
 */

(function initWebCrawler() {
    "use strict";

    var runBtn = document.getElementById("run-web-crawler");
    var crawlerList = document.getElementById("crawler-list");

    if (!runBtn || !crawlerList || runBtn.dataset.wgtInit) return;
    runBtn.dataset.wgtInit = "true";

    function renderMentions(dataArray) {
        crawlerList.innerHTML = "";
        if (!dataArray || dataArray.length === 0) {
            crawlerList.innerHTML = '<li><span style="color: #999; font-size: 0.85rem;">No recent mentions found.</span></li>';
            return;
        }

        dataArray.forEach(function (mention) {
            var li = document.createElement("li");
            li.style.cssText = "padding: 8px 0; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 4px;";

            var topRow = document.createElement("div");
            topRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;";

            var sourceLabel = document.createElement("span");
            sourceLabel.textContent = mention.source_type;

            // Color logic: Human = Green, Agent = Blue
            if (mention.source_type === "Human") {
                sourceLabel.style.cssText = "padding: 2px 6px; border-radius: 4px; font-weight: bold; background: #f0fdf4; color: #16a34a; border: 1px solid #4ade80; font-size: 0.65rem; text-transform: uppercase;";
            } else {
                sourceLabel.style.cssText = "padding: 2px 6px; border-radius: 4px; font-weight: bold; background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; font-size: 0.65rem; text-transform: uppercase;";
            }

            var d = new Date(mention.created_at);
            var dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            var timeSpan = document.createElement("span");
            timeSpan.textContent = dateStr;
            timeSpan.style.color = "#999";

            topRow.appendChild(sourceLabel);
            topRow.appendChild(timeSpan);

            var bottomRow = document.createElement("div");
            bottomRow.style.cssText = "font-size: 0.85rem; color: #444; word-break: break-all;";
            var urlLink = '<a href="' + mention.url + '" target="_blank" style="text-decoration: underline; color: #2563eb;">' + mention.url.substring(0, 30) + '...</a>';
            bottomRow.innerHTML = "<strong>" + urlLink + "</strong><br/>" + mention.snippet;

            li.appendChild(topRow);
            li.appendChild(bottomRow);
            crawlerList.appendChild(li);
        });
    }

    function fetchMentions() {
        var token = sessionStorage.getItem("auth_token") || "";
        fetch("/api/v1/admin/mentions", {
            headers: { "Authorization": "Bearer " + token }
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load mentions");
                return res.json();
            })
            .then(renderMentions)
            .catch(function (err) {
                console.error("Crawl fetch error:", err);
                crawlerList.innerHTML = '<li><span style="color: red; font-size: 0.85rem;">Error loading mentions.</span></li>';
            });
    }

    // Initial load
    fetchMentions();

    runBtn.addEventListener("click", function () {
        var token = sessionStorage.getItem("auth_token") || "";

        // Optimistic UI updates
        runBtn.disabled = true;
        runBtn.textContent = "Crawling the Web...";
        crawlerList.innerHTML = '<li><span style="color: #666; font-size: 0.85rem;">Scanning selected domains...</span></li>';

        fetch("/api/v1/admin/mentions", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Crawler API returned " + res.status);
                return res.json();
            })
            .then(function (data) {
                runBtn.textContent = "Run Web Crawler";
                runBtn.disabled = false;

                // Send event to the chat window
                if (data.summary) {
                    var event = new CustomEvent("CrawlSummaryEvent", { detail: data.summary });
                    window.dispatchEvent(event);
                }

                // Immediately fetch the updated list
                fetchMentions();
            })
            .catch(function (err) {
                runBtn.textContent = "Retry Crawler";
                runBtn.disabled = false;
                crawlerList.innerHTML = '<li><a href="#" style="color: red;">Crawl Failed <span class="label" style="float: right;">error</span></a></li>';
                console.error(err);
            });
    });
})();
