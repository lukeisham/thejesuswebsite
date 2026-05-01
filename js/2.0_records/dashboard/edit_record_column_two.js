// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: COLUMN 2 SECTION NAVIGATOR
//   File:    js/2.0_records/dashboard/edit_record_column_two.js
//   Version: 1.0.0
//   Purpose: Replaces the static text-only index in Column 2 with interactive
//            scroll-spy buttons. Each button smooth-scrolls Column 3 to the
//            matching form section. An IntersectionObserver highlights the
//            currently-visible section as the user scrolls.
//   Source:  dashboard_record_column_two.md
//
// =============================================================================

// Trigger: edit_record.js -> window.renderEditRecordColumnTwo()
// Function: Renders 8 clickable section-navigator buttons into #canvas-col-list,
//           wires an IntersectionObserver for scroll-spy highlighting, and
//           binds click handlers that smooth-scroll Column 3 to the target section.
// Output: Interactive navigation buttons rendered in Column 2; .is-active
//         class applied to the button whose matching section is visible.

window.renderEditRecordColumnTwo = function () {
  var colList = document.getElementById("canvas-col-list");
  if (!colList) return;

  // ---- Section definitions (order matches Column 3 layout) ----
  var sections = [
    { id: "core-identifiers-section", label: "CORE IDENTIFIERS" },
    { id: "picture-section",          label: "PICTURE" },
    { id: "taxonomy-diagrams-section", label: "TAXONOMY & DIAGRAMS" },
    { id: "verses-section",           label: "VERSES" },
    { id: "text-content-section",     label: "TEXT CONTENT" },
    { id: "bibliography-section",     label: "BIBLIOGRAPHY" },
    { id: "relations-links-section",  label: "LINKS" },
    { id: "misc-section",             label: "MISCELLANEOUS" },
  ];

  // ---- Render the navigator container and buttons ----
  var navHtml = '<nav class="record-column-two" aria-label="Record section navigation">';
  for (var i = 0; i < sections.length; i++) {
    navHtml +=
      '<button class="record-column-two-btn" data-scroll-target="' +
      sections[i].id +
      '" type="button">' +
      sections[i].label +
      "</button>";
  }
  navHtml += "</nav>";

  // Clear any existing static content and inject the navigator
  colList.innerHTML = "";
  colList.insertAdjacentHTML("beforeend", navHtml);

  // ---- Scroll-spy: IntersectionObserver on Column 3 sections ----
  var colEditor = document.getElementById("canvas-col-editor");
  if (!colEditor) return;

  var allButtons = colList.querySelectorAll(".record-column-two-btn");

  var observerOptions = {
    root: colEditor,
    rootMargin: "0px 0px -60% 0px",
    threshold: 0,
  };

  var observerCallback = function (entries) {
    for (var j = 0; j < entries.length; j++) {
      var entry = entries[j];
      if (!entry.isIntersecting) continue;

      // Find the button whose data-scroll-target matches the intersecting section
      var targetId = entry.target.id;
      for (var k = 0; k < allButtons.length; k++) {
        var btn = allButtons[k];
        if (btn.getAttribute("data-scroll-target") === targetId) {
          // Remove .is-active from all buttons, add to the matched one
          for (var m = 0; m < allButtons.length; m++) {
            allButtons[m].classList.remove("is-active");
          }
          btn.classList.add("is-active");
          break;
        }
      }
    }
  };

  var observer = new IntersectionObserver(observerCallback, observerOptions);

  // Observe every target section in Column 3
  for (var n = 0; n < sections.length; n++) {
    var sectionEl = document.getElementById(sections[n].id);
    if (sectionEl) {
      observer.observe(sectionEl);
    }
  }

  // ---- Click handlers: smooth-scroll Column 3 to the target section ----
  var buttons = colList.querySelectorAll(".record-column-two-btn");
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function (e) {
      var targetId = e.currentTarget.getAttribute("data-scroll-target");
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      // Scroll the section into view inside the Column 3 container
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });

      // Immediately update active state
      for (var x = 0; x < buttons.length; x++) {
        buttons[x].classList.remove("is-active");
      }
      e.currentTarget.classList.add("is-active");
    });
  }
};
