/* =============================================================================
   THE JESUS WEBSITE
   File:    frontend/display_other/timeline_display.js
   Version: 1.1.0
   Trigger: DOMContentLoaded on timeline.html
   Function: Renders timeline chronological dots and progression loops
   Output: Interactive SVG Timeline Nodes filtered by layer
============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initTimelineSystem();
});

const TIMELINE_STAGES = [
    'PreIncarnation', 'OldTestament', 'EarlyLifeUnborn', 'EarlyLifeBirth', 
    'EarlyLifeInfancy', 'EarlyLifeChildhood', 'LifeTradie', 'LifeBaptism', 
    'LifeTemptation', 'GalileeCallingTwelve', 'GalileeSermonMount', 
    'GalileeMiraclesSea', 'GalileeTransfiguration', 'JudeanOutsideJudea', 
    'JudeanMissionSeventy', 'JudeanTeachingTemple', 'JudeanRaisingLazarus', 
    'JudeanFinalJourney', 'PassionPalmSunday', 'PassionMondayCleansing', 
    'PassionTuesdayTeaching', 'PassionWednesdaySilent', 'PassionMaundyThursday', 
    'PassionMaundyLastSupper', 'PassionMaundyGethsemane', 'PassionMaundyBetrayal', 
    'PassionFridaySanhedrin', 'PassionFridayCivilTrials', 'PassionFridayCrucifixionBegins', 
    'PassionFridayDarkness', 'PassionFridayDeath', 'PassionFridayBurial', 
    'PassionSaturdayWatch', 'PassionSundayResurrection', 'PostResurrectionAppearances', 
    'Ascension', 'OurResponse', 'ReturnOfJesus'
];

function initTimelineSystem() {
    const nodeLayer = document.getElementById('node-layer');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const timelineSvg = document.getElementById('interactive-timeline');
    


    const prevEraBtn = document.getElementById('prev-era');
    const nextEraBtn = document.getElementById('next-era');
    const eraDisplay = document.getElementById('current-era-display');

    let currentScale = 1;
    let records = [];
    let currentEraIndex = 10; // Default to Galilee Ministry (approx index)

    // Zoom setup
    if(zoomInBtn && zoomOutBtn && timelineSvg) {
        zoomInBtn.addEventListener('click', () => {
            currentScale = Math.min(currentScale + 0.2, 3);
            timelineSvg.style.transform = `scale(${currentScale})`;
            timelineSvg.style.transformOrigin = "left center";
            // Update wrapper scroll to keep view stable if needed
        });
        zoomOutBtn.addEventListener('click', () => {
            currentScale = Math.max(currentScale - 0.2, 0.5);
            timelineSvg.style.transform = `scale(${currentScale})`;
            timelineSvg.style.transformOrigin = "left center";
        });
    }

    // Era Navigation
    if (prevEraBtn && nextEraBtn && eraDisplay) {
        prevEraBtn.addEventListener('click', () => {
            currentEraIndex = Math.max(0, currentEraIndex - 1);
            scrollToEra(currentEraIndex);
        });
        nextEraBtn.addEventListener('click', () => {
            currentEraIndex = Math.min(TIMELINE_STAGES.length - 1, currentEraIndex + 1);
            scrollToEra(currentEraIndex);
        });
    }

    // Load Database Records
    if(window.dbReadyPromise) {
        window.dbReadyPromise.then(db => {
            const query = "SELECT id, title, timeline, era, gospel_category, description, primary_verse FROM records WHERE timeline IS NOT NULL LIMIT 200";
            try {
                const res = db.exec(query);
                if(res.length > 0 && res[0].values) {
                    records = res[0].values.map(row => {
                        return {
                            id: row[0],
                            title: row[1] || 'Unknown',
                            timeline: row[2],
                            era: row[3] || 'Unknown',
                            category: row[4] || 'event', 
                            description: row[5],
                            primaryVerse: row[6]
                        };
                    });
                    
                    // Simple categorization for layers
                    records.forEach((r, i) => {
                        if (r.era === 'OldTestament' || r.timeline.includes('Prophecy')) {
                            r.lane = 'prophecy';
                        } else if (i % 5 === 0) {
                            r.lane = 'secular';
                        } else {
                            r.lane = 'biblical';
                        }
                    });

                    renderTimelineNodes(records);
                }
            } catch (err) {
                console.error("Timeline Query Error: ", err);
            }
        });
    }


}

function getXForTimelineStage(timelineStage) {
    const startX = 100;
    const spacing = 80;
    const index = TIMELINE_STAGES.indexOf(timelineStage);
    if (index === -1) return startX + (Math.random() * 1000); // fallback
    return startX + (index * spacing);
}

function getYForLane(lane) {
    switch(lane) {
        case 'prophecy': return 150; // Top lane
        case 'biblical': return 300; // Middle lane (Main Axis)
        case 'secular': return 450;  // Bottom lane
        default: return 300;
    }
}

function scrollToEra(index) {
    const wrapper = document.getElementById('timeline-canvas-wrapper');
    const eraDisplay = document.getElementById('current-era-display');
    if (!wrapper || !eraDisplay) return;

    const stage = TIMELINE_STAGES[index];
    const x = getXForTimelineStage(stage);
    
    // Smooth scroll the container
    wrapper.scrollTo({
        left: x - (wrapper.clientWidth / 2),
        behavior: 'smooth'
    });

    // Update label
    eraDisplay.textContent = stage.replace(/([A-Z])/g, ' $1').trim();
}

function renderTimelineNodes(records) {
    const nodeLayer = document.getElementById('node-layer');
    const axisLayer = document.getElementById('axis-markers-layer');
    const linkLayer = document.getElementById('link-layer');

    if(!nodeLayer || !axisLayer) return;
    
    nodeLayer.innerHTML = '';
    axisLayer.innerHTML = '';
    linkLayer.innerHTML = '';

    // Draw nodes
    records.forEach(record => {
        const x = getXForTimelineStage(record.timeline);
        const y = getYForLane(record.lane);
        
        // Add axis marker for timeline stage
        if (record.lane === 'biblical') {
             const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
             text.setAttribute('x', x);
             text.setAttribute('y', 330);
             text.setAttribute('class', 'timeline-label');
             text.setAttribute('text-anchor', 'middle');
             text.textContent = record.timeline.replace(/([A-Z])/g, ' $1').trim().substring(0, 15);
             axisLayer.appendChild(text);
        }

        // Draw vertical link
        if (record.lane !== 'biblical') {
             const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
             line.setAttribute('x1', x);
             line.setAttribute('y1', y);
             line.setAttribute('x2', x);
             line.setAttribute('y2', 300);
             line.setAttribute('class', 'timeline-link');
             linkLayer.appendChild(line);
        }

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '6'); 
        circle.setAttribute('class', `timeline-node timeline-node-item lane-${record.lane}`);
        circle.setAttribute('data-category', record.lane); 
        
        const titleTooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleTooltip.textContent = record.title;
        circle.appendChild(titleTooltip);

        circle.addEventListener('click', () => {
            document.querySelectorAll('.timeline-node').forEach(n => n.classList.remove('selected'));
            circle.classList.add('selected');
            showMetadata(record);
        });
        
        nodeLayer.appendChild(circle);
    });

    const maxIndex = Math.max(...records.map(r => TIMELINE_STAGES.indexOf(r.timeline)));
    if (maxIndex > 0) {
        const targetWidth = getXForTimelineStage(TIMELINE_STAGES[maxIndex]) + 300;
        document.getElementById('interactive-timeline').setAttribute('viewBox', `0 0 ${Math.max(2000, targetWidth)} 600`);
        document.querySelector('#grid-layer rect').setAttribute('width', Math.max(2000, targetWidth));
        document.querySelector('.timeline-axis-line').setAttribute('x2', Math.max(2000, targetWidth));
    }
}



function showMetadata(record) {
    const panel = document.getElementById('timeline-metadata-panel');
    const rTitle = document.getElementById('metadata-title');
    const rDate = document.getElementById('metadata-date');
    const rCategory = document.getElementById('metadata-category');
    const rVerse = document.getElementById('metadata-verse');
    const rDesc = document.getElementById('metadata-snippet');
    const rLink = document.getElementById('metadata-link');
    
    if(panel && rTitle && rDate && rCategory && rVerse && rDesc && rLink) {
        rTitle.textContent = record.title || "Unidentified Event";
        rDate.textContent = `Era/Timeline: ${record.era} > ${record.timeline}`;
        rCategory.textContent = `Lane: ${record.lane.toUpperCase()} | Type: ${record.category}`;
        
        // Populate Verse
        rVerse.textContent = formatVerseText(record.primaryVerse);
        
        let descText = "No description provided.";
        try {
            if (record.description) {
                const parsed = JSON.parse(record.description);
                descText = Array.isArray(parsed) ? parsed[0] : parsed;
            }
        } catch (e) {
            descText = record.description;
        }

        rDesc.textContent = descText ? descText.substring(0, 200) + '...' : "";
        rLink.href = `record.html?id=${record.id}`;
        
        panel.classList.remove('is-hidden');
        panel.classList.add('is-visible');
    }
}

function formatVerseText(verseJson) {
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
