/* =============================================================================
   THE JESUS WEBSITE
   File:    frontend/display_other/maps_display.js
   Version: 1.0.0
   Trigger: DOMContentLoaded on maps.html
   Function: Renders overlapping geographic data layers dynamically
   Output: Interactive SVG Map Nodes filtered by era and location with Metadata side-panel updates
============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initMapSystem();
});

function initMapSystem() {
    const nodeLayer = document.getElementById('node-layer');
    const viewSelectors = document.querySelectorAll('input[name="map_view"]');
    const eraSlider = document.getElementById('era-filter');
    const eraDisplay = document.getElementById('era-display');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const mapCanvas = document.getElementById('interactive-map');
    
    let currentZoom = 1;
    let records = [];

    // Zoom Controls setup
    if(zoomInBtn && zoomOutBtn && mapCanvas) {
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom + Math.log10(currentZoom + 1) * 2, 5);
            mapCanvas.style.transform = `scale(${currentZoom})`;
        });
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom - 0.5, 1);
            mapCanvas.style.transform = `scale(${currentZoom})`;
        });
    }

    // Era Slider filtering trigger
    if(eraSlider && eraDisplay) {
        eraSlider.addEventListener('input', (e) => {
            let eraVal = parseInt(e.target.value);
            // Snap to 0 for strict dates or add standard era tagging
            const tag = eraVal < 0 ? 'BC' : 'AD';
            eraDisplay.textContent = `${Math.abs(eraVal)} ${tag}`;
            filterNodesByEra(eraVal);
        });
    }

    // Load Database Records once SQLite is ready
    if(window.dbReadyPromise) {
        window.dbReadyPromise.then(db => {
            // Retrieve sample points
            const res = db.exec("SELECT id, title, era, gospel_category, description, primary_verse FROM records LIMIT 100");
            if(res.length > 0 && res[0].values) {
                records = res[0].values.map(row => ({
                    id: row[0],
                    title: row[1],
                    era: row[2],
                    category: row[3],
                    description: row[4],
                    primaryVerse: row[5],
                    map_label: (row[0] % 2 === 0) ? 'judea' : 'galilee' 
                }));
                
                const checkedRadio = document.querySelector('input[name="map_view"]:checked');
                const defaultView = checkedRadio ? checkedRadio.value : 'judea';
                renderNodesForView(defaultView, records);
            }
        });
    }

    // Register View Switching toggler
    viewSelectors.forEach(radio => {
        radio.addEventListener('change', (e) => {
            renderNodesForView(e.target.value, records);
        });
    });
}

function parseEraYear(eraString) {
    if (!eraString) return 30;
    if (eraString.includes('Life')) return 30;
    if (eraString.includes('Early')) return 50;
    return 30;
}

function renderNodesForView(viewName, allRecords) {
    const nodeLayer = document.getElementById('node-layer');
    if(!nodeLayer) return;
    
    nodeLayer.innerHTML = ''; 
    const viewRecords = allRecords.filter(r => (r.map_label || '').toLowerCase() === viewName.toLowerCase() || viewName === 'empire');

    viewRecords.forEach((record, index) => {
        const x = 150 + ((record.id * 83) % 700);
        const y = 150 + ((record.id * 111) % 500);
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '5'); 
        circle.setAttribute('class', 'map-node map-node-item');
        circle.dataset.recordId = record.id;
        circle.dataset.era = parseEraYear(record.era); // Ensure filtering logic has data
        
        circle.addEventListener('click', () => {
            showMetadata(record);
            const allNodes = document.querySelectorAll('.map-node-item');
            allNodes.forEach(n => n.classList.remove('is-active'));
            circle.classList.add('is-active'); 
        });
        
        nodeLayer.appendChild(circle);
    });
    
    // Force sync with the era slider configuration upon reloading view arrays
    const eraSlider = document.getElementById('era-filter');
    if(eraSlider) {
        filterNodesByEra(parseInt(eraSlider.value));
    }
}

function filterNodesByEra(eraValue) {
    const nodes = document.querySelectorAll('.map-node-item');
    nodes.forEach(node => {
        const nodeEra = parseInt(node.dataset.era) || 0;
        // Permissive window of display logic - typical tolerance radius
        if(Math.abs(nodeEra - eraValue) <= 40) {
            node.style.display = '';
        } else {
            node.style.display = 'none';
        }
    });
}

function showMetadata(record) {
    const panel = document.getElementById('map-metadata-panel');
    const rTitle = document.getElementById('metadata-title');
    const rDate = document.getElementById('metadata-date');
    const rCategory = document.getElementById('metadata-category');
    const rVerse = document.getElementById('metadata-verse');
    const rDesc = document.getElementById('metadata-snippet');
    const rLink = document.getElementById('metadata-link');
    
    if(panel && rTitle && rDate && rCategory && rVerse && rDesc && rLink) {
        rTitle.textContent = record.title || "Unidentified Geo-Site";
        rDate.textContent = `Era: ${record.era || 'Unknown'}`;
        rCategory.textContent = `Category: ${record.category || 'Historic Event'}`;
        
        // Populate Verse
        rVerse.textContent = formatVerseText(record.primaryVerse);
        
        rDesc.textContent = record.description ? record.description.substring(0, 160) + '...' : "No substantive description documented.";
        rLink.href = `record.html?id=${record.id}`;
        
        panel.classList.remove('is-hidden');
        panel.classList.add('is-visible');
    }
}

function formatVerseText(verseJson) {
    // Helper to transform primary_verse JSON array into human-readable reference
    if (!verseJson) return "";
    try {
        const data = JSON.parse(verseJson);
        if (Array.isArray(data) && data.length > 0) {
            const v = data[0];
            return `${v.book} ${v.chapter}:${v.verse}`;
        }
    } catch (e) {
        return verseJson;
    }
    return "";
}
