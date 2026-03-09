import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID = 'wgt-draft-results';

// START initDraftResults
export function initDraftResults() {
    // Find the heading by iterating through h3 elements (replaces invalid :contains selector)
    const headings = document.querySelectorAll('h3');
    let draftsHeading = null;
    for (const h3 of headings) {
        if (h3.textContent.trim() === 'Drafts & Results') {
            draftsHeading = h3;
            break;
        }
    }

    const draftsBox = draftsHeading?.parentElement;
    if (!draftsBox) return;

    if (draftsBox.dataset.draftsInit) return;
    draftsBox.dataset.draftsInit = "true";

    try {
        fetchDraftCounts();
    } catch (error) {
        console.error(`[Draft Results] Init failed: ${error.message}`);
    }
}
// END

// START fetchDraftCounts
async function fetchDraftCounts() {
    try {
        const response = await fetch('/api/v1/system/draft_counts');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        updateDraftUI(data.records, data.essays, data.responses);

        // Dispatch event for Agent integration (§6 Priority 3)
        dispatchWidgetEvent(CARD_ID, 'DraftCountsEvent', {
            records: data.records,
            essays: data.essays,
            responses: data.responses,
            priority: 3
        });
    } catch (error) {
        console.error(`[Draft Results] Fetch failed: ${error.message}`);
    }
}
// END

// START updateDraftUI
function updateDraftUI(records, essays, responses) {
    try {
        // A temporary workaround since we wiped IDs inside the results list
        const lists = document.querySelectorAll('.record-list');
        // Let's find the specific list for Drafts & Results by looking at adjacent sibling
        let targetList = null;
        for (const ul of lists) {
            if (ul.previousElementSibling && ul.previousElementSibling.textContent === 'Drafts & Results') {
                targetList = ul;
                break;
            }
        }

        if (targetList) {
            const items = targetList.querySelectorAll('li span.label');
            if (items.length >= 3) {
                items[0].textContent = records;
                items[1].textContent = essays;
                items[2].textContent = responses;
            }
        }
    } catch (error) {
        console.error(`[Draft Results] UI update failed: ${error.message}`);
    }
}
// END

// Auto-initialize
document.addEventListener('DOMContentLoaded', initDraftResults);
