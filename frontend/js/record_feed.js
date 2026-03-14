/**
 * record_feed.js
 * ────────────────
 * Module for rendering compact Record feed items.
 * Optimized for a single-column list view.
 */

function createRecordFeedItem(record) {
    const article = document.createElement("article");
    article.className = "record-feed-item";
    article.setAttribute("data-id", record.id);

    // For sorting/filtering
    const categoryName = typeof record.category === 'object' ? Object.keys(record.category)[0] : String(record.category || '');
    article.setAttribute("data-category", categoryName);
    article.setAttribute("data-created", record.created_at || "");
    article.setAttribute("data-name", (record.name || "").toLowerCase());

    // ── 1. Thumbnail ──
    const thumbDiv = document.createElement("div");
    thumbDiv.className = "record-feed-item__thumb";
    if (record.picture_bytes && record.picture_bytes.length > 0) {
        try {
            const img = document.createElement("img");
            const u8 = new Uint8Array(record.picture_bytes);
            let bin = "";
            for (let i = 0; i < u8.length; i++) {
                bin += String.fromCharCode(u8[i]);
            }
            img.src = "data:image/png;base64," + btoa(bin);
            img.alt = record.name || "Record Thumbnail";
            thumbDiv.appendChild(img);
        } catch (e) {
            thumbDiv.className += " record-feed-item__thumb--error";
        }
    } else {
        thumbDiv.className += " record-feed-item__thumb--empty";
    }
    article.appendChild(thumbDiv);

    // ── 2. Body (Title, Snippet, Verse) ──
    const bodyDiv = document.createElement("div");
    bodyDiv.className = "record-feed-item__body";

    const title = document.createElement("h4");
    title.className = "record-feed-item__title";
    title.textContent = record.name || "Untitled Record";
    bodyDiv.appendChild(title);

    const snippet = document.createElement("p");
    snippet.className = "record-feed-item__snippet";
    if (record.description && record.description.length > 0) {
        const firstLine = record.description[0];
        snippet.textContent = firstLine.length > 120 ? firstLine.substring(0, 117) + "..." : firstLine;
    } else {
        snippet.textContent = "No description available.";
    }
    bodyDiv.appendChild(snippet);

    const verse = document.createElement("div");
    verse.className = "record-feed-item__verse";
    const primaryVerse = typeof window.formatVerse === "function" ? window.formatVerse(record.primary_verse) : "";
    if (primaryVerse) {
        verse.textContent = primaryVerse;
        verse.setAttribute("data-verse", primaryVerse);
    }
    bodyDiv.appendChild(verse);

    article.appendChild(bodyDiv);

    // ── 3. Meta (Era, Category, Sources, Location, Date) ──
    const metaDiv = document.createElement("div");
    metaDiv.className = "record-feed-item__meta";

    const era = (record.timeline && record.timeline.era) ? record.timeline.era : "";
    if (era) {
        const eraBadge = document.createElement("span");
        eraBadge.className = "record-feed-item__badge record-feed-item__badge--era";
        eraBadge.textContent = era;
        metaDiv.appendChild(eraBadge);
    }

    const category = typeof record.category === 'object' ? Object.keys(record.category)[0] : String(record.category || '');
    if (category) {
        const catBadge = document.createElement("span");
        catBadge.className = "record-feed-item__badge record-feed-item__badge--category";
        catBadge.textContent = category;
        metaDiv.appendChild(catBadge);
    }

    const sourceCount = (record.bibliography && record.bibliography.length) || 0;
    const sources = document.createElement("span");
    sources.className = "record-feed-item__sources";
    sources.textContent = `${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
    metaDiv.appendChild(sources);

    const location = (record.map_data && record.map_data.label) ? record.map_data.label : "";
    if (location) {
        const locSpan = document.createElement("span");
        locSpan.className = "record-feed-item__location";
        locSpan.textContent = location;
        metaDiv.appendChild(locSpan);
    }

    const date = document.createElement("span");
    date.className = "record-feed-item__date";
    date.textContent = record.created_at ? new Date(record.created_at).toLocaleDateString() : "";
    metaDiv.appendChild(date);

    article.appendChild(metaDiv);

    // Make the entire row clickable to show details
    article.addEventListener("click", () => {
        if (typeof window.showRecordDetail === "function") {
            window.showRecordDetail(record);
        }
    });

    return article;
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = { createRecordFeedItem };
} else {
    window.createRecordFeedItem = createRecordFeedItem;
}
