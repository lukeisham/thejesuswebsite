// Trigger:  Called by dashboard_challenge.js:
//           - window.initInsertChallengeResponse() — wires the dialog on init
//           - window.insertChallengeResponse()     — opens the insert dialog
// Main:    insertChallengeResponse() — opens a dialog to collect a response
//           title, then POSTs to /api/admin/responses to create a new draft
//           response record linked to the currently selected parent challenge.
//           On success, navigates to the Challenge Response editor for the
//           newly created record.
// Output:  New draft response record created in the database with challenge_id
//          populated (FK → records.id). The challenge list is refreshed to
//          show the new response sub-card.
//          Errors routed through window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initInsertChallengeResponse
   Wires the insert response dialog buttons (cancel, create) and prepares
   the dialog for future use.
----------------------------------------------------------------------------- */
function initInsertChallengeResponse() {
    var dialog   = document.getElementById('challenge-insert-response-dialog');
    var btnCancel = document.getElementById('btn-challenge-response-cancel');
    var btnCreate = document.getElementById('btn-challenge-response-create');

    if (!dialog) return;

    // Cancel button — close dialog
    if (btnCancel) {
        btnCancel.addEventListener('click', function () {
            dialog.close();
        });
    }

    // Close on backdrop click
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) {
            dialog.close();
        }
    });
}

/* -----------------------------------------------------------------------------
   FUNCTION: insertChallengeResponse
   Opens the insert response dialog pre-filled with context about the
   selected parent challenge. On confirmation, creates the response via API.

   This is the function called by the "Insert Response" button in the
   function bar.
----------------------------------------------------------------------------- */
function insertChallengeResponse() {
    var dialog    = document.getElementById('challenge-insert-response-dialog');
    var titleInput = document.getElementById('challenge-response-title-input');
    var parentLabel = document.getElementById('challenge-response-parent-label');
    var btnCreate  = document.getElementById('btn-challenge-response-create');

    if (!dialog) return;

    // Get selected challenge info
    var parentSlug  = window._challengeModuleState.activeRecordSlug;
    var parentTitle = window._challengeModuleState.activeRecordTitle;

    if (!parentSlug) {
        if (typeof window.surfaceError === 'function') {
            window.surfaceError('Please select a challenge before inserting a response.');
        }
        return;
    }

    // Populate dialog
    if (titleInput) {
        titleInput.value = '';
        titleInput.placeholder = 'Response to: ' + parentTitle;
    }
    if (parentLabel) {
        parentLabel.textContent = 'Parent challenge: ' + parentTitle;
    }

    // Wire create button (remove previous listeners by cloning)
    if (btnCreate) {
        var newBtn = btnCreate.cloneNode(true);
        btnCreate.parentNode.replaceChild(newBtn, btnCreate);

        newBtn.addEventListener('click', async function () {
            var title = titleInput ? titleInput.value.trim() : '';
            if (!title) {
                if (typeof window.surfaceError === 'function') {
                    window.surfaceError('Please enter a title for the new response.');
                }
                return;
            }

            newBtn.disabled = true;
            newBtn.textContent = 'Creating...';

            try {
                var response = await fetch('/api/admin/responses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        parent_slug: parentSlug,
                        title: title
                    })
                });

                if (!response.ok) {
                    var errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { detail: 'HTTP ' + response.status };
                    }
                    throw new Error(errorData.detail || 'Failed to create response');
                }

                var data = await response.json();

                // Close dialog
                dialog.close();

                if (typeof window.surfaceError === 'function') {
                    window.surfaceError('Response "' + title + '" created as draft.');
                }

                // Refresh the challenge list to show the new response sub-card
                var mode = window._challengeModuleState.mode;
                if (typeof window.displayChallengeList === 'function') {
                    await window.displayChallengeList(mode);
                }

                // Navigate to the Challenge Response editor for the new record
                if (typeof window.loadModule === 'function') {
                    // Store the response slug in state so the response editor can pick it up
                    window._challengeNewResponseSlug = data.slug;
                    window.loadModule('challenge-response');
                }

            } catch (err) {
                console.error('[insert_challenge_response] Creation failed:', err);
                if (typeof window.surfaceError === 'function') {
                    window.surfaceError(
                        "Error: Failed to create response for challenge '" + parentTitle + "'."
                    );
                }
                newBtn.disabled = false;
                newBtn.textContent = 'Create Draft Response';
            }
        });
    }

    // Show dialog
    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
    } else {
        // Fallback for browsers without dialog support
        dialog.setAttribute('open', 'true');
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initInsertChallengeResponse = initInsertChallengeResponse;
window.insertChallengeResponse     = insertChallengeResponse;
