(function initMapZoom() {
    "use strict";

    var canvas = document.getElementById("map-canvas");
    var zoomInBtn = document.getElementById("zoom-in");
    var zoomOutBtn = document.getElementById("zoom-out");
    var resetBtn = document.getElementById("zoom-reset");
    
    var scale = 1;
    var translateX = 0;
    var translateY = 0;
    var isDragging = false;
    var startX = 0;
    var startY = 0;

    function applyTransform() {
        if(canvas) {
            canvas.style.transform = "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
            canvas.style.transition = "transform 0.1s ease-out";
        }
    }

    function reset() {
        scale = 1; translateX = 0; translateY = 0;
        applyTransform();
    }

    if (zoomInBtn) zoomInBtn.addEventListener("click", function () { scale = Math.min(4, scale + 0.25); applyTransform(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { scale = Math.max(0.5, scale - 0.25); applyTransform(); });
    if (resetBtn) resetBtn.addEventListener("click", reset);

    if (canvas) {
        canvas.addEventListener("wheel", function (e) { 
            e.preventDefault(); 
            scale = Math.max(0.5, Math.min(4, scale + (e.deltaY > 0 ? -0.1 : 0.1))); 
            applyTransform(); 
        });

        canvas.addEventListener("mousedown", function (e) { 
            isDragging = true; 
            startX = e.clientX - translateX; 
            startY = e.clientY - translateY; 
            canvas.style.cursor = "grabbing"; 
            canvas.style.transition = "none";
        });
        document.addEventListener("mousemove", function (e) { 
            if (!isDragging) return; 
            translateX = e.clientX - startX; 
            translateY = e.clientY - startY; 
            applyTransform(); 
        });
        document.addEventListener("mouseup", function () { 
            isDragging = false; 
            if (canvas) canvas.style.cursor = "grab"; 
        });
    }

    // Determine region from URL, defaulting appropriately
    var pathParts = window.location.pathname.split('/');
    var currentRegion = "Overview";
    if (pathParts.includes("galilee")) currentRegion = "Galilee";
    else if (pathParts.includes("jerusalem")) currentRegion = "Jerusalem";
    else if (pathParts.includes("judea")) currentRegion = "Judea";
    else if (pathParts.includes("levant")) currentRegion = "Levant";
    else if (pathParts.includes("rome")) currentRegion = "Rome";

    var locationLinks = document.querySelectorAll("[data-loc]");
    locationLinks.forEach(function (link) {
        link.addEventListener("click", async function (e) {
            e.preventDefault();
            var loc = this.getAttribute("data-loc");
            
            // Pan/zoom the map to the clicked location
            scale = 1.5;
            translateX = (Math.random() - 0.5) * 100;
            translateY = (Math.random() - 0.5) * 100;
            applyTransform();

            try {
                const res = await fetch("/api/v1/records");
                const json = await res.json();
                const records = json.data && json.data.records ? json.data.records : [];
                
                const filtered = records.filter(r => {
                    const rRegion = (r.map_data && r.map_data.region) ? r.map_data.region.toLowerCase() : "";
                    const locLower = loc.toLowerCase().replace(/-/g, ' ');
                    
                    // Match MapType region OR it matches literally what was asked
                    const matchesRegion = rRegion === locLower || rRegion === currentRegion.toLowerCase();
                    
                    const rName = (r.name || "").toLowerCase();
                    const rDesc = (r.description || "").toLowerCase();
                    const matchesLoc = rName.includes(locLower) || rDesc.includes(locLower);
                    
                    return (matchesRegion && matchesLoc) || rRegion === locLower;
                });

                let container = document.getElementById("location-records-container");
                if (!container) {
                    container = document.createElement("div");
                    container.id = "location-records-container";
                    container.style.marginTop = "2rem";
                    container.style.paddingTop = "1rem";
                    container.style.borderTop = "1px solid var(--border-color)";
                    
                    const listHeader = document.createElement("h3");
                    listHeader.className = "label";
                    listHeader.id = "location-records-header";
                    container.appendChild(listHeader);
                    
                    const ul = document.createElement("ul");
                    ul.className = "record-list";
                    ul.id = "location-records-list";
                    container.appendChild(ul);
                    
                    const aside = document.querySelector("aside") || document.querySelector("main");
                    if (aside) aside.appendChild(container);
                }
                
                document.getElementById("location-records-header").innerText = `Records near ${loc.replace(/-/g, ' ')}`;
                const ul = document.getElementById("location-records-list");
                ul.innerHTML = "";
                
                if (filtered.length === 0) {
                    ul.innerHTML = `<li><span style="color:var(--text-muted); font-size:0.9em;">No records found matching this area.</span></li>`;
                } else {
                    filtered.forEach(r => {
                        const li = document.createElement("li");
                        
                        let verseStr = "";
                        if (r.primary_verse && r.primary_verse.book) {
                            verseStr = `${r.primary_verse.book} ${r.primary_verse.chapter}:${r.primary_verse.verse}`;
                        }
                        
                        li.innerHTML = `
                            <span class="record-list__title" style="display:block; font-weight:600;">${r.name || "Untitled"}</span>
                            <span class="primary-verse-display" style="font-size:0.8rem; color:var(--text-muted); display:inline-block; margin-top:2px;">${verseStr}</span>
                        `;
                        ul.appendChild(li);
                    });
                }
            } catch (err) {
                console.error("Error fetching location records:", err);
            }
        });
    });
})();
