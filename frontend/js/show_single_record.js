/**
 * show_single_record.js
 * ───────────────────────
 * Manages the single-record view (the 'Record' tab).
 * Handles default placeholder state and populating from records.
 */
(function initShowSingleRecord() {
    "use strict";

    const singleSection = document.getElementById("record-single");
    if (!singleSection) return;

    /**
     * Renders a blank placeholder record card when no data is available.
     */
    function renderPlaceholder() {
        if (!singleSection) return;
        
        singleSection.innerHTML = `
            <article class="record-card record-card--placeholder">
                <div class="record-card__header">
                    <h3 class="field-empty">Select a Record...</h3>
                    <div class="record-card__sub field-empty">CATEGORY / ERA</div>
                </div>
                <div class="record-card__verse field-empty">Primary Bible Reference</div>
                <div class="record-card__image-placeholder" style="width: 100%; height: 200px; background: #eee; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">
                    No Image Selected
                </div>
                <div class="record-card__desc field-empty">
                    Search for a record or click one from the Feed/Grid to view details here.
                </div>
                <div class="record-card__meta field-empty" style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
                    <span>Timeline: Era / Location details</span>
                </div>
            </article>
        `;
    }

    /**
     * Shows a specific record in the 'Record' tab.
     * @param {Object} record - The record data object.
     */
    window.showRecordDetail = function (record) {
        if (!record) {
            renderPlaceholder();
            return;
        }

        if (singleSection && typeof window.createRecordCard === "function") {
            singleSection.innerHTML = "";
            const card = window.createRecordCard(record);
            card.classList.add("is-single-view");
            singleSection.appendChild(card);

            // Trigger verse expansion if expand_verse.js is present
            if (typeof window.expandVerses === "function") {
                window.expandVerses();
            }

            // Optional: Smooth scroll if not on page load
            const mainHeader = document.querySelector(".nav-header");
            if (mainHeader) {
                // Only scroll if the section is already visible or being switched to
                // avoid jarring scrolls on initial page load refresh
            }
        }
    };

    // Initial render - placeholder by default
    renderPlaceholder();

})();
