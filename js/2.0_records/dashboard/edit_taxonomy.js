// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: TAXONOMY & DIAGRAMS
//   File:    js/2.0_records/dashboard/edit_taxonomy.js
//   Version: 1.0.0
//   Purpose: Taxonomy and diagram fields (era, timeline, map_label,
//            gospel_category, geo_id, parent_id) for the single-record editor.
//            Extracted from edit_record.js per plan.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditTaxonomy(containerId)
// Function: Renders and manages the Taxonomy & Diagrams form section.
// Output: Injects form fields into container; exposes load/collect APIs

window.renderEditTaxonomy = function (containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<section id="taxonomy-diagrams" class="record-section-spacing">\n' +
    '<p>TAXONOMY &amp; DIAGRAMS</p>\n' +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">era</label>\n' +
    '<select id="record-era" class="blog-editor-field-input">\n' +
    '<option value="">— Select Era —</option>\n' +
    "<option>PreIncarnation</option>\n" +
    "<option>OldTestament</option>\n" +
    "<option>EarlyLife</option>\n" +
    "<option>Life</option>\n" +
    "<option>GalileeMinistry</option>\n" +
    "<option>JudeanMinistry</option>\n" +
    "<option>PassionWeek</option>\n" +
    "<option>Post-Passion</option>\n" +
    "</select>\n" +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">timeline</label>\n' +
    '<select id="record-timeline" class="blog-editor-field-input">\n' +
    '<option value="">— Select Timeline —</option>\n' +
    "<option>PreIncarnation</option>\n" +
    "<option>OldTestament</option>\n" +
    "<option>EarlyLifeUnborn</option>\n" +
    "<option>EarlyLifeBirth</option>\n" +
    "<option>EarlyLifeInfancy</option>\n" +
    "<option>EarlyLifeChildhood</option>\n" +
    "<option>LifeTradie</option>\n" +
    "<option>LifeBaptism</option>\n" +
    "<option>LifeTemptation</option>\n" +
    "<option>GalileeCallingTwelve</option>\n" +
    "<option>GalileeSermonMount</option>\n" +
    "<option>GalileeMiraclesSea</option>\n" +
    "<option>GalileeTransfiguration</option>\n" +
    "<option>JudeanOutsideJudea</option>\n" +
    "<option>JudeanMissionSeventy</option>\n" +
    "<option>JudeanTeachingTemple</option>\n" +
    "<option>JudeanRaisingLazarus</option>\n" +
    "<option>JudeanFinalJourney</option>\n" +
    "<option>PassionPalmSunday</option>\n" +
    "<option>PassionMondayCleansing</option>\n" +
    "<option>PassionTuesdayTeaching</option>\n" +
    "<option>PassionWednesdaySilent</option>\n" +
    "<option>PassionMaundyThursday</option>\n" +
    "<option>PassionMaundyLastSupper</option>\n" +
    "<option>PassionMaundyGethsemane</option>\n" +
    "<option>PassionMaundyBetrayal</option>\n" +
    "<option>PassionFridaySanhedrin</option>\n" +
    "<option>PassionFridayCivilTrials</option>\n" +
    "<option>PassionFridayCrucifixionBegins</option>\n" +
    "<option>PassionFridayDarkness</option>\n" +
    "<option>PassionFridayDeath</option>\n" +
    "<option>PassionFridayBurial</option>\n" +
    "<option>PassionSaturdayWatch</option>\n" +
    "<option>PassionSundayResurrection</option>\n" +
    "<option>PostResurrectionAppearances</option>\n" +
    "<option>Ascension</option>\n" +
    "<option>OurResponse</option>\n" +
    "<option>ReturnOfJesus</option>\n" +
    "</select>\n" +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">map_label</label>\n' +
    '<select id="record-map-label" class="blog-editor-field-input">\n' +
    '<option value="">— Select Map Label —</option>\n' +
    "<option>Overview</option>\n" +
    "<option>Empire</option>\n" +
    "<option>Levant</option>\n" +
    "<option>Judea</option>\n" +
    "<option>Galilee</option>\n" +
    "<option>Jerusalem</option>\n" +
    "</select>\n" +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">gospel_category</label>\n' +
    '<select id="record-gospel-category" class="blog-editor-field-input">\n' +
    '<option value="">— Select Category —</option>\n' +
    "<option>event</option>\n" +
    "<option>location</option>\n" +
    "<option>person</option>\n" +
    "<option>theme</option>\n" +
    "<option>object</option>\n" +
    "</select>\n" +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">geo_id</label>\n' +
    '<input type="number" id="record-geo-id" class="blog-editor-field-input" placeholder="Geographic node ID">\n' +
    "</div>\n" +
    '<div class="blog-editor-field">\n' +
    '<label class="blog-editor-field-label">parent_id</label>\n' +
    '<input type="text" id="record-parent-id" class="blog-editor-field-input" placeholder="Parent record ID (FK)">\n' +
    "</div>\n" +
    "</section>";
};

window.loadEditTaxonomy = function (data) {
  var elEra = document.getElementById("record-era");
  var elTimeline = document.getElementById("record-timeline");
  var elMapLabel = document.getElementById("record-map-label");
  var elGospelCategory = document.getElementById("record-gospel-category");
  var elGeoId = document.getElementById("record-geo-id");
  var elParentId = document.getElementById("record-parent-id");

  if (elEra) elEra.value = (data && data.era) || "";
  if (elTimeline) elTimeline.value = (data && data.timeline) || "";
  if (elMapLabel) elMapLabel.value = (data && data.map_label) || "";
  if (elGospelCategory)
    elGospelCategory.value = (data && data.gospel_category) || "";
  if (elGeoId)
    elGeoId.value = data && data.geo_id != null ? String(data.geo_id) : "";
  if (elParentId) elParentId.value = (data && data.parent_id) || "";
};

window.collectEditTaxonomy = function () {
  var elEra = document.getElementById("record-era");
  var elTimeline = document.getElementById("record-timeline");
  var elMapLabel = document.getElementById("record-map-label");
  var elGospelCategory = document.getElementById("record-gospel-category");
  var elGeoId = document.getElementById("record-geo-id");
  var elParentId = document.getElementById("record-parent-id");

  return {
    era: elEra ? elEra.value : "",
    timeline: elTimeline ? elTimeline.value : "",
    map_label: elMapLabel ? elMapLabel.value : "",
    gospel_category: elGospelCategory ? elGospelCategory.value : "",
    geo_id:
      elGeoId && elGeoId.value !== "" ? parseInt(elGeoId.value, 10) : null,
    parent_id: elParentId ? elParentId.value : "",
  };
};
