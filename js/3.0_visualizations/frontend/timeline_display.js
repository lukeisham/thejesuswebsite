/* =============================================================================
   THE JESUS WEBSITE
   File:    js/3.0_visualizations/frontend/timeline_display.js
   Version: 2.0.0
   Trigger: DOMContentLoaded on timeline.html
   Function: Renders timeline chronological dots with zone-based placement
   Output: Interactive SVG Timeline Nodes with zoom-responsive stacking
============================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initTimelineSystem();
});

const TIMELINE_STAGES = [
  "PreIncarnation",
  "OldTestament",
  "EarlyLifeUnborn",
  "EarlyLifeBirth",
  "EarlyLifeInfancy",
  "EarlyLifeChildhood",
  "LifeTradie",
  "LifeBaptism",
  "LifeTemptation",
  "GalileeCallingTwelve",
  "GalileeSermonMount",
  "GalileeMiraclesSea",
  "GalileeTransfiguration",
  "JudeanOutsideJudea",
  "JudeanMissionSeventy",
  "JudeanTeachingTemple",
  "JudeanRaisingLazarus",
  "JudeanFinalJourney",
  "PassionPalmSunday",
  "PassionMondayCleansing",
  "PassionTuesdayTeaching",
  "PassionWednesdaySilent",
  "PassionMaundyThursday",
  "PassionMaundyLastSupper",
  "PassionMaundyGethsemane",
  "PassionMaundyBetrayal",
  "PassionFridaySanhedrin",
  "PassionFridayCivilTrials",
  "PassionFridayCrucifixionBegins",
  "PassionFridayDarkness",
  "PassionFridayDeath",
  "PassionFridayBurial",
  "PassionSaturdayWatch",
  "PassionSundayResurrection",
  "PostResurrectionAppearances",
  "Ascension",
  "OurResponse",
  "ReturnOfJesus",
];

function initTimelineSystem() {
  const nodeLayer = document.getElementById("node-layer");
  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const timelineSvg = document.getElementById("interactive-timeline");

  const prevEraBtn = document.getElementById("prev-era");
  const nextEraBtn = document.getElementById("next-era");
  const eraDisplay = document.getElementById("current-era-display");

  let currentScale = 1;
  let records = [];
  let currentEraIndex = 10;

  if (zoomInBtn && zoomOutBtn && timelineSvg) {
    zoomInBtn.addEventListener("click", () => {
      currentScale = Math.min(currentScale + 0.2, 3);
      renderTimelineNodes(records, currentScale);
    });
    zoomOutBtn.addEventListener("click", () => {
      currentScale = Math.max(currentScale - 0.2, 0.5);
      renderTimelineNodes(records, currentScale);
    });
  }

  if (prevEraBtn && nextEraBtn && eraDisplay) {
    prevEraBtn.addEventListener("click", () => {
      currentEraIndex = Math.max(0, currentEraIndex - 1);
      scrollToEra(currentEraIndex);
    });
    nextEraBtn.addEventListener("click", () => {
      currentEraIndex = Math.min(
        TIMELINE_STAGES.length - 1,
        currentEraIndex + 1,
      );
      scrollToEra(currentEraIndex);
    });
  }

  if (window.dbReadyPromise) {
    window.dbReadyPromise.then((db) => {
      const query =
        "SELECT id, title, timeline, era, gospel_category, description, primary_verse, slug, map_label FROM records WHERE timeline IS NOT NULL AND type = 'record' AND status = 'published' LIMIT 200";
      try {
        const res = db.exec(query);
        if (res.length > 0 && res[0].values) {
          records = res[0].values.map((row) => {
            return {
              id: row[0],
              title: row[1] || "Unknown",
              timeline: row[2],
              era: row[3] || "Unknown",
              category: row[4] || "event",
              description: row[5],
              primaryVerse: row[6],
              slug: row[7],
              mapLabel: row[8] || null,
            };
          });

          renderTimelineNodes(records, currentScale);
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
  if (index === -1) {
    let hash = 0;
    for (let i = 0; i < timelineStage.length; i++) {
      hash = (hash * 31 + timelineStage.charCodeAt(i)) % 2000;
    }
    return startX + hash;
  }
  return startX + index * spacing;
}

function deterministicScatter(id, axis, min, max) {
  let hash = 0;
  const str = String(id) + axis;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 37 + str.charCodeAt(i)) % 10007;
  }
  return min + (hash % (max - min));
}

function scrollToEra(index) {
  const wrapper = document.getElementById("timeline-canvas-wrapper");
  const eraDisplay = document.getElementById("current-era-display");
  if (!wrapper || !eraDisplay) return;

  const stage = TIMELINE_STAGES[index];
  const x = getXForTimelineStage(stage);

  wrapper.scrollTo({
    left: x - wrapper.clientWidth / 2,
    behavior: "smooth",
  });

  eraDisplay.textContent = stage.replace(/([A-Z])/g, " $1").trim();
}

function renderTimelineNodes(records, scale) {
  const nodeLayer = document.getElementById("node-layer");
  const axisLayer = document.getElementById("axis-markers-layer");

  if (!nodeLayer || !axisLayer) return;

  nodeLayer.innerHTML = "";
  axisLayer.innerHTML = "";

  const baseSpacing = 14;
  const nodeSpacing = baseSpacing + (scale - 1) * 7;

  // Group regular nodes by timeline stage for stacking
  const stageGroups = {};
  const supernaturalNodes = [];
  const spiritualNodes = [];
  const regularNodes = [];

  records.forEach((record) => {
    if (record.mapLabel === "supernatural") {
      supernaturalNodes.push(record);
    } else if (record.mapLabel === "spiritual") {
      spiritualNodes.push(record);
    } else {
      regularNodes.push(record);
      const stage = record.timeline;
      if (!stageGroups[stage]) stageGroups[stage] = [];
      stageGroups[stage].push(record);
    }
  });

  const renderedLabels = new Set();

  // Render regular nodes stacked centered on axis (Y=300)
  Object.keys(stageGroups).forEach((stage) => {
    const group = stageGroups[stage];
    const x = getXForTimelineStage(stage);
    const count = group.length;

    group.forEach((record, i) => {
      const offset = (i - (count - 1) / 2) * nodeSpacing;
      const y = 300 + offset;

      _createNode(nodeLayer, x, y, record, "default");
    });

    // Render axis label once per stage
    if (!renderedLabels.has(stage)) {
      renderedLabels.add(stage);
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", x);
      text.setAttribute("y", 340 + (count - 1) / 2 * nodeSpacing);
      text.setAttribute("class", "timeline-label");
      text.setAttribute("text-anchor", "middle");
      text.textContent = stage
        .replace(/([A-Z])/g, " $1")
        .trim()
        .substring(0, 15);
      axisLayer.appendChild(text);
    }
  });

  // Render supernatural nodes in loose cloud at top (Y=50-150), spread by era
  supernaturalNodes.forEach((record) => {
    const x = getXForTimelineStage(record.timeline);
    const y = deterministicScatter(record.id, "y", 50, 150);
    _createNode(nodeLayer, x, y, record, "supernatural");
  });

  // Render spiritual nodes scattered below axis (Y=350-500), detached from X
  spiritualNodes.forEach((record) => {
    const x = deterministicScatter(record.id, "x", 100, 2000);
    const y = deterministicScatter(record.id, "y", 360, 500);
    _createNode(nodeLayer, x, y, record, "spiritual");
  });

  // Adjust SVG viewBox to fit content
  const allX = records.map((r) => {
    if (r.mapLabel === "spiritual") {
      return deterministicScatter(r.id, "x", 100, 2000);
    }
    return getXForTimelineStage(r.timeline);
  });
  const maxX = Math.max(...allX, 2000);
  const targetWidth = maxX + 300;

  const svgEl = document.getElementById("interactive-timeline");
  if (svgEl) {
    svgEl.setAttribute("viewBox", `0 0 ${Math.max(2000, targetWidth)} 600`);
  }
  const gridRect = document.querySelector("#grid-layer rect");
  if (gridRect) {
    gridRect.setAttribute("width", Math.max(2000, targetWidth));
  }
  const axisLine = document.querySelector(".timeline-axis-line");
  if (axisLine) {
    axisLine.setAttribute("x2", Math.max(2000, targetWidth));
  }
}

function _createNode(container, x, y, record, zone) {
  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", "6");
  circle.setAttribute("class", "timeline-node timeline-node-item");
  circle.setAttribute("data-zone", zone);

  const titleTooltip = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "title",
  );
  titleTooltip.textContent = record.title;
  circle.appendChild(titleTooltip);

  circle.addEventListener("click", () => {
    document
      .querySelectorAll(".timeline-node")
      .forEach((n) => n.classList.remove("selected"));
    circle.classList.add("selected");
    showMetadata(record);
  });

  container.appendChild(circle);
}

function showMetadata(record) {
  const panel = document.getElementById("timeline-metadata-panel");
  const rTitle = document.getElementById("metadata-title");
  const rDate = document.getElementById("metadata-date");
  const rCategory = document.getElementById("metadata-category");
  const rVerse = document.getElementById("metadata-verse");
  const rDesc = document.getElementById("metadata-snippet");
  const rLink = document.getElementById("metadata-link");

  if (panel && rTitle && rDate && rCategory && rVerse && rDesc && rLink) {
    rTitle.textContent = record.title || "Unidentified Event";
    rDate.textContent = `Era/Timeline: ${record.era} > ${record.timeline}`;
    rCategory.textContent = `Category: ${record.category}`;

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

    rDesc.textContent = descText && descText.length > 200
      ? descText.substring(0, 200) + "..."
      : descText || "";
    rLink.href = `/record/${record.slug}`;

    panel.classList.remove("is-hidden");
    panel.classList.add("is-visible");
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
