/**
 * widget_deadlinks.js
 * ───────────────────
 * Controls the Deadlink AI widget on the Dashboard.
 */

document.addEventListener("DOMContentLoaded", () => {
    const runBtn = document.getElementById("run-deadlinks");
    const list = document.getElementById("deadlinks-list");

    if (!runBtn || !list || runBtn.dataset.wgtInit) return;
    runBtn.dataset.wgtInit = "true";

    runBtn.addEventListener("click", async () => {
        // UI Feedback
        runBtn.disabled = true;
        runBtn.textContent = "Scanning URLs...";
        list.innerHTML = `<li><a href="#" style="color: #999;">Testing connections... <span class="label" style="float: right;">working</span></a></li>`;

        try {
            const response = await fetch("/api/widgets/deadlinks/run");

            if (!response.ok) {
                throw new Error("Scan failed");
            }

            const data = await response.json();
            renderResults(data.dead_links || []);
        } catch (err) {
            console.error(err);
            list.innerHTML = `<li><span style="color: red;">Scan failed: ${err.message}</span></li>`;
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = "Scan for Broken Links";
        }
    });

    function renderResults(issues) {
        list.innerHTML = "";

        if (issues.length === 0) {
            list.innerHTML = `<li><a href="#" style="color: green;">All clean! No deadlinks found.</a></li>`;
            return;
        }

        issues.forEach(issue => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.flexDirection = "column";
            li.style.gap = "5px";
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid #ebebeb";

            // Description block
            const desc = document.createElement("div");
            desc.innerHTML = `<strong style="color: #cc0000; font-family: monospace;">[${issue.status}]</strong> <a href="${issue.url}" target="_blank" style="word-break: break-all;">${issue.url}</a><br><span style="font-size: 0.8rem; color: #666;">Context: ${issue.context}</span>`;

            // Action block
            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "5px";

            const btnReplace = document.createElement("button");
            btnReplace.textContent = "Replace Link";
            btnReplace.className = "btn-secondary";
            btnReplace.style.fontSize = "0.7rem";
            btnReplace.style.padding = "4px 8px";
            btnReplace.onclick = () => handleReplace(issue, btnReplace);

            const btnRemove = document.createElement("button");
            btnRemove.textContent = "Remove Link entirely";
            btnRemove.className = "btn-secondary";
            btnRemove.style.fontSize = "0.7rem";
            btnRemove.style.padding = "4px 8px";
            btnRemove.style.background = "#fbeae8";
            btnRemove.style.color = "#cc0000";
            btnRemove.onclick = () => handleRemove(issue, btnRemove);

            actions.appendChild(btnReplace);
            actions.appendChild(btnRemove);

            li.appendChild(desc);
            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    async function handleReplace(issue, btn) {
        const newUrl = prompt(`Enter replacement URL for: ${issue.url}`);
        if (!newUrl) return;

        btn.textContent = "Replacing...";
        btn.disabled = true;

        try {
            const res = await fetch("/api/widgets/deadlinks/replace", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: issue.id, old_url: issue.url, new_url: newUrl })
            });

            if (!res.ok) throw new Error("Replace failed");

            btn.textContent = "Replaced!";
            btn.style.background = "green";
            btn.style.color = "white";
        } catch (err) {
            console.error(err);
            btn.textContent = "Error";
            btn.disabled = false;
        }
    }

    async function handleRemove(issue, btn) {
        if (!confirm(`Remove link ${issue.url} entirely from this record?`)) return;

        btn.textContent = "Removing...";
        btn.disabled = true;

        try {
            const res = await fetch("/api/widgets/deadlinks/replace", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: issue.id, old_url: issue.url, new_url: "" })
            });

            if (!res.ok) throw new Error("Remove failed");

            btn.textContent = "Removed";
            btn.style.background = "#999";
            btn.style.color = "white";
        } catch (err) {
            console.error(err);
            btn.textContent = "Error";
            btn.disabled = false;
        }
    }
});
