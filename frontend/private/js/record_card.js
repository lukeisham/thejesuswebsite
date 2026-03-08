/**
 * record_card.js
 * ────────────────
 * Shared module for rendering full Record cards.
 */

function formatVerse(verseInfo) {
    if (!verseInfo || !verseInfo.book) return "";
    return verseInfo.book + " " + verseInfo.chapter + ":" + verseInfo.verse;
}

function createRecordCard(record) {
    const article = document.createElement("article");
    article.className = "record-card";

    // 1. Header
    const title = record.name || "Untitled Record";
    const primaryVerse = formatVerse(record.primary_verse);

    const header = document.createElement("div");
    header.className = "record-card__header";
    header.innerHTML = `<h3>${title}</h3>`;
    if (primaryVerse) {
        header.innerHTML += `<div class="record-card__verse primary-verse-display" data-verse="${primaryVerse}">${primaryVerse}</div>`;
    }
    article.appendChild(header);

    // 2. Picture (if bytes are available)
    if (record.picture_bytes && record.picture_bytes.length > 0) {
        try {
            const img = document.createElement("img");
            img.className = "record-card__image";
            // Convert byte array to Uint8Array, then to binary string, then base64
            // (Assuming JPEG/PNG data)
            const u8 = new Uint8Array(record.picture_bytes);
            let bin = "";
            for (let i = 0; i < u8.length; i++) {
                bin += String.fromCharCode(u8[i]);
            }
            img.src = "data:image/png;base64," + btoa(bin);
            img.alt = title;
            article.appendChild(img);
        } catch (e) {
            console.error("Failed to render picture bytes for", title, e);
        }
    }

    // 3. Description (dot points)
    if (record.description && record.description.length > 0) {
        const descDiv = document.createElement("div");
        descDiv.className = "record-card__desc";
        const ul = document.createElement("ul");
        record.description.forEach(line => {
            const li = document.createElement("li");
            li.textContent = line;
            ul.appendChild(li);
        });
        descDiv.appendChild(ul);
        article.appendChild(descDiv);
    }

    // 4. Secondary Bible Verses
    if (record.secondary_verse) {
        const secVerse = formatVerse(record.secondary_verse);
        if (secVerse) {
            const secDiv = document.createElement("div");
            secDiv.className = "record-card__verse";
            secDiv.textContent = "See also: " + secVerse;
            article.appendChild(secDiv);
        }
    }

    // 5. Sources (Bibliography)
    if (record.bibliography && record.bibliography.length > 0) {
        const bibDiv = document.createElement("div");
        bibDiv.className = "record-card__sources";
        bibDiv.innerHTML = "<strong>Sources:</strong>";
        record.bibliography.forEach(src => {
            const srcSpan = document.createElement("span");
            srcSpan.textContent = "• " + (src.title || src.id || "Unknown Source");
            bibDiv.appendChild(srcSpan);
        });
        article.appendChild(bibDiv);
    }

    // 6. Meta / Other fields (Unique IDs, Category, Content) 
    const metaDiv = document.createElement("div");
    metaDiv.className = "record-card__meta";

    // Convert object fields to string if they are complex objects, or just show keys
    const category = typeof record.category === 'object' ? Object.keys(record.category)[0] : String(record.category || 'N/A');
    const contentObj = typeof record.content === 'object' ? Object.keys(record.content)[0] : String(record.content || 'N/A');

    metaDiv.innerHTML = `
        <span><strong>ID:</strong> ${record.id}</span>
        <span><strong>Category:</strong> ${category}</span>
        <span><strong>Content:</strong> ${contentObj}</span>
    `;
    article.appendChild(metaDiv);

    return article;
}

// Export for module systems (or make available globally if included via <script>)
if (typeof module !== "undefined" && module.exports) {
    module.exports = { createRecordCard, formatVerse };
} else {
    window.createRecordCard = createRecordCard;
    window.formatVerse = formatVerse;
}
