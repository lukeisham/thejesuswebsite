/**
 * widget_spellcheck.js
 * ────────────────────
 * Controls the Spell Check AI widget on the Dashboard.
 */

document.addEventListener("DOMContentLoaded", () => {
    const runBtn = document.getElementById("run-spellcheck");
    const list = document.getElementById("spellcheck-list");

    if (!runBtn || !list || runBtn.dataset.wgtInit) return;
    runBtn.dataset.wgtInit = "true";

    runBtn.addEventListener("click", async () => {
        // UI Feedback
        runBtn.disabled = true;
        runBtn.textContent = "Scanning Database...";
        list.innerHTML = `<li><a href="#" style="color: #999;">Running scan... <span class="label" style="float: right;">working</span></a></li>`;

        try {
            const response = await fetch("/api/widgets/spellcheck/run");

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const data = await response.json();
            renderResults(data.issues || []);
        } catch (err) {
            console.error(err);
            list.innerHTML = `<li style="color: red; padding: 10px;">Error: ${err.message}</li>`;
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = "Run Scan";
        }
    });

    function renderResults(issues) {
        list.innerHTML = "";

        if (issues.length === 0) {
            list.innerHTML = `<li><a href="#" style="color: green;">All clear! No errors found.</a></li>`;
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
            desc.innerHTML = `<strong>${issue.bad_word}</strong> in <em>"${issue.text.length > 30 ? issue.text.substring(0, 30) + "..." : issue.text}"</em>`;

            // Action block
            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "5px";

            const btnCorrect = document.createElement("button");
            btnCorrect.textContent = issue.suggestion ? `Fix (${issue.suggestion})` : "Fix manually";
            btnCorrect.className = "btn-secondary";
            btnCorrect.style.fontSize = "0.7rem";
            btnCorrect.style.padding = "4px 8px";
            btnCorrect.onclick = () => handleCorrect(issue, btnCorrect);

            const btnIgnore = document.createElement("button");
            btnIgnore.textContent = "Add to Dictionary";
            btnIgnore.className = "btn-secondary";
            btnIgnore.style.fontSize = "0.7rem";
            btnIgnore.style.padding = "4px 8px";
            btnIgnore.style.background = "#eef2ee";
            btnIgnore.onclick = () => handleAddToDict(issue.bad_word, btnIgnore);

            actions.appendChild(btnCorrect);
            actions.appendChild(btnIgnore);

            li.appendChild(desc);
            li.appendChild(actions);
            list.appendChild(li);
        });
    }

    async function handleCorrect(issue, btn) {
        console.log("Correcting:", issue);
        const originalText = btn.textContent;
        btn.textContent = "Sending...";
        btn.disabled = true;

        try {
            const response = await fetch("/api/widgets/spellcheck/correct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(issue)
            });

            if (!response.ok) throw new Error("Correction failed");

            btn.textContent = "Corrected";
            btn.style.background = "green";
            btn.style.color = "white";
        } catch (err) {
            console.error(err);
            btn.textContent = "Retry";
            btn.disabled = false;
        }
    }

    async function handleAddToDict(word, btn) {
        console.log("Adding to dictionary:", word);
        btn.textContent = "Saving...";
        btn.disabled = true;

        try {
            const response = await fetch("/api/widgets/spellcheck/dictionary/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word })
            });

            if (!response.ok) throw new Error("Add to dictionary failed");

            btn.textContent = "Added";
            btn.style.background = "#5b7065";
            btn.style.color = "white";
        } catch (err) {
            console.error(err);
            btn.textContent = "Retry";
            btn.disabled = false;
        }
    }
});
