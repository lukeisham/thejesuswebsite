/**
 * wgt_draft_results.js
 * Function: Fetch and display unified draft/result counts
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initDraftResults
export function initDraftResults() {
    const draftsBox = document.querySelector('h3:contains("Drafts & Results")')?.parentElement;
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
        // Placeholder for the real /api/v1/system/draft_counts endpoint 
        // that targets the new app_core::types::system::draft_counts::DraftCounts type
        const mockResponse = {
            records: 12,
            essays: 4,
            responses: 2
        };

        updateDraftUI(mockResponse.records, mockResponse.essays, mockResponse.responses);
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
