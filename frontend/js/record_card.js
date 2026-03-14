/**
 * record_card.js
 * ────────────────
 * Shared module for rendering full Record cards.
 * All 14 Record fields are always rendered — empty fields show placeholder text.
 */

function formatVerse(verseInfo) {
    if (!verseInfo || !verseInfo.book) return "";
    return verseInfo.book + " " + verseInfo.chapter + ":" + verseInfo.verse;
}

function createRecordCard(record) {
    const article = document.createElement("article");
    article.className = "record-card";

    // ── 1. Header: Name ──
    const title = record.name || "Untitled Record";
    const header = document.createElement("div");
    header.className = "record-card__header";
    header.innerHTML = `<h3>${title}</h3>`;
    article.appendChild(header);

    // ── 2. Primary Verse ──
    const primaryVerse = formatVerse(record.primary_verse);
    const pvDiv = document.createElement("div");
    pvDiv.className = "record-card__verse primary-verse-display";
    if (primaryVerse) {
        pvDiv.setAttribute("data-verse", primaryVerse);
        pvDiv.textContent = primaryVerse;
    } else {
        pvDiv.innerHTML = '<span class="field-empty">No verse assigned</span>';
    }
    article.appendChild(pvDiv);

    // ── 3. Secondary Verse ──
    const secDiv = document.createElement("div");
    secDiv.className = "record-card__verse";
    if (record.secondary_verse) {
        const secVerse = formatVerse(record.secondary_verse);
        if (secVerse) {
            secDiv.textContent = secVerse;
        } else {
            secDiv.innerHTML = '<span class="field-empty">No secondary verse</span>';
        }
    } else {
        secDiv.innerHTML = '<span class="field-empty">No secondary verse</span>';
    }
    article.appendChild(secDiv);

    // ── 4. Picture ──
    const picDiv = document.createElement("div");
    picDiv.className = "record-field";
    if (record.picture_bytes && record.picture_bytes.length > 0) {
        try {
            const img = document.createElement("img");
            img.className = "record-card__image";
            const u8 = new Uint8Array(record.picture_bytes);
            let bin = "";
            for (let i = 0; i < u8.length; i++) {
                bin += String.fromCharCode(u8[i]);
            }
            img.src = "data:image/png;base64," + btoa(bin);
            img.alt = title;
            picDiv.appendChild(img);
        } catch (e) {
            console.error("Failed to render picture bytes for", title, e);
            picDiv.innerHTML = '<span class="field-empty">Image failed to load</span>';
        }
    } else {
        picDiv.innerHTML = '<span class="field-empty">No image</span>';
    }
    article.appendChild(picDiv);

    // ── 5. Description ──
    const descDiv = document.createElement("div");
    descDiv.className = "record-card__desc";
    if (record.description && record.description.length > 0) {
        const ul = document.createElement("ul");
        record.description.forEach(line => {
            const li = document.createElement("li");
            li.textContent = line;
            ul.appendChild(li);
        });
        descDiv.appendChild(ul);
    } else {
        descDiv.innerHTML = '<span class="field-empty">No description yet</span>';
    }
    article.appendChild(descDiv);

    // ── 6. Bibliography ──
    const bibDiv = document.createElement("div");
    bibDiv.className = "record-card__sources";
    if (record.bibliography && record.bibliography.length > 0) {
        bibDiv.innerHTML = "<strong>Sources:</strong>";
        record.bibliography.forEach(src => {
            const srcSpan = document.createElement("span");
            const srcTitle = (src.title && src.title.text) ? src.title.text : (src.title || src.id || "Unknown Source");
            srcSpan.textContent = "\u2022 " + srcTitle;
            bibDiv.appendChild(srcSpan);
        });
    } else {
        bibDiv.innerHTML = '<strong>Sources:</strong> <span class="field-empty">No sources yet</span>';
    }
    article.appendChild(bibDiv);

    // ── 7. Created At ──
    const createdDiv = document.createElement("div");
    createdDiv.className = "record-card__timestamps record-card__created";
    const created = record.created_at ? new Date(record.created_at).toLocaleDateString() : "Unknown";
    createdDiv.innerHTML = `Created: ${created}`;
    article.appendChild(createdDiv);

    // ── 8. Updated At ──
    const updatedDiv = document.createElement("div");
    updatedDiv.className = "record-card__timestamps record-card__updated";
    const updated = record.updated_at ? new Date(record.updated_at).toLocaleDateString() : "Never updated";
    updatedDiv.innerHTML = `Updated: ${updated}`;
    article.appendChild(updatedDiv);

    // ── 9. Interactivity: Click to view single ──
    article.addEventListener("click", function() {
        // Avoid re-triggering if already in single view
        if (article.closest("#record-single")) return;

        if (typeof window.showRecordDetail === "function") {
            window.showRecordDetail(record);
        }
    });

    return article;
}

// Export for module systems (or make available globally if included via <script>)
if (typeof module !== "undefined" && module.exports) {
    module.exports = { createRecordCard, formatVerse };
} else {
    window.createRecordCard = createRecordCard;
    window.formatVerse = formatVerse;
}
