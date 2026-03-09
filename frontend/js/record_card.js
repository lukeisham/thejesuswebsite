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
    pvDiv.className = "record-card__verse";
    if (primaryVerse) {
        pvDiv.setAttribute("data-verse", primaryVerse);
        pvDiv.textContent = primaryVerse;
    } else {
        pvDiv.innerHTML = '<span class="field-empty">No verse assigned</span>';
    }
    article.appendChild(pvDiv);

    // ── 3. Picture ──
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

    // ── 4. Description ──
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

    // ── 5. Secondary Verse ──
    const secDiv = document.createElement("div");
    secDiv.className = "record-card__verse";
    if (record.secondary_verse) {
        const secVerse = formatVerse(record.secondary_verse);
        if (secVerse) {
            secDiv.textContent = "See also: " + secVerse;
        } else {
            secDiv.innerHTML = '<span class="field-empty">No secondary verse</span>';
        }
    } else {
        secDiv.innerHTML = '<span class="field-empty">No secondary verse</span>';
    }
    article.appendChild(secDiv);

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

    // ── 7. Timeline ──
    const tlDiv = document.createElement("div");
    tlDiv.className = "record-card__timeline record-field";
    tlDiv.innerHTML = '<div class="record-field-label">Timeline</div>';
    if (record.timeline && record.timeline.event_name) {
        const era = record.timeline.era || "—";
        tlDiv.innerHTML += `<span>${record.timeline.event_name}</span>`;
        tlDiv.innerHTML += `<span style="margin-left: 6px;" class="label" style="font-size: 0.7rem;">${era}</span>`;
        if (record.timeline.description) {
            tlDiv.innerHTML += `<div style="font-size: 0.85rem; color: #666;">${record.timeline.description}</div>`;
        }
    } else {
        tlDiv.innerHTML += '<span class="field-empty">No timeline data</span>';
    }
    article.appendChild(tlDiv);

    // ── 8. Map Data ──
    const mapDiv = document.createElement("div");
    mapDiv.className = "record-card__map record-field";
    mapDiv.innerHTML = '<div class="record-field-label">Map</div>';
    if (record.map_data && record.map_data.label) {
        const pointCount = (record.map_data.points && record.map_data.points.length) || 0;
        mapDiv.innerHTML += `<span>${record.map_data.label} &mdash; ${pointCount} point${pointCount !== 1 ? 's' : ''}</span>`;
    } else {
        mapDiv.innerHTML += '<span class="field-empty">No map data</span>';
    }
    article.appendChild(mapDiv);

    // ── 9. Metadata / Keywords ──
    const kwDiv = document.createElement("div");
    kwDiv.className = "record-card__keywords record-field";
    kwDiv.innerHTML = '<div class="record-field-label">Keywords</div>';
    if (record.metadata && record.metadata.keywords && record.metadata.keywords.length > 0) {
        kwDiv.innerHTML += record.metadata.keywords.map(k =>
            `<span class="label" style="font-size: 0.7rem; margin-right: 4px;">${k}</span>`
        ).join('');
    } else {
        kwDiv.innerHTML += '<span class="field-empty">No keywords</span>';
    }
    article.appendChild(kwDiv);

    // ── 10–11. Category & Content (meta footer) ──
    const metaDiv = document.createElement("div");
    metaDiv.className = "record-card__meta";

    const category = typeof record.category === 'object' ? Object.keys(record.category)[0] : String(record.category || 'N/A');
    const contentObj = typeof record.content === 'object' ? Object.keys(record.content)[0] : String(record.content || 'N/A');

    metaDiv.innerHTML = `
        <span><strong>ID:</strong> ${record.id}</span>
        <span><strong>Category:</strong> ${category}</span>
        <span><strong>Content:</strong> ${contentObj}</span>
    `;
    article.appendChild(metaDiv);

    // ── 12–13. Timestamps ──
    const tsDiv = document.createElement("div");
    tsDiv.className = "record-card__timestamps";
    const created = record.created_at ? new Date(record.created_at).toLocaleDateString() : "Unknown";
    const updated = record.updated_at ? new Date(record.updated_at).toLocaleDateString() : "Never updated";
    tsDiv.innerHTML = `Created: ${created} &middot; Updated: ${updated}`;
    article.appendChild(tsDiv);

    return article;
}

// Export for module systems (or make available globally if included via <script>)
if (typeof module !== "undefined" && module.exports) {
    module.exports = { createRecordCard, formatVerse };
} else {
    window.createRecordCard = createRecordCard;
    window.formatVerse = formatVerse;
}
