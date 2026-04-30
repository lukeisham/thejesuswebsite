// =============================================================================
//
//   THE JESUS WEBSITE — BIBLIOGRAPHY DISPLAY
//   File:    js/5.0_essays_responses/frontend/sources_biblio_display.js
//   Version: 1.1.0
//   Purpose: Parses the bibliography JSON blob and renders it in MLA format.
//   Source:  guide_appearance.md §2.2, vibe_coding_rules.md §2
//
// =============================================================================

function renderBibliography(record) {
    var biblioContainer = document.getElementById('record-section-bibliography');
    var biblioContent = document.getElementById('record-bibliography-content');

    if (!biblioContainer || !biblioContent) return;

    if (!record.bibliography) {
        biblioContainer.classList.add('is-hidden');
        biblioContainer.classList.remove('is-visible-block');
        return;
    }

    try {
        var biblioData = typeof record.bibliography === 'string' ? JSON.parse(record.bibliography) : record.bibliography;
        var entriesHtml = [];

        // MLA citations fields based on data_schema.md
        var mlaFields = [
            'mla_book',
            'mla_article',
            'mla_website',
            'mla_book_inline',
            'mla_article_inline',
            'mla_website_inline'
        ];

        mlaFields.forEach(function(field) {
            if (biblioData[field]) {
                if (typeof biblioData[field] === 'string') {
                    entriesHtml.push('<div class="biblio-entry">' + biblioData[field] + '</div>');
                } else if (Array.isArray(biblioData[field])) {
                    for (var i = 0; i < biblioData[field].length; i++) {
                        entriesHtml.push('<div class="biblio-entry">' + biblioData[field][i] + '</div>');
                    }
                }
            }
        });

        // Ensure we handle arrays correctly if biblioData is just an array of strings
        if (Array.isArray(biblioData)) {
             for (var j = 0; j < biblioData.length; j++) {
                  if (typeof biblioData[j] === 'string') {
                      entriesHtml.push('<div class="biblio-entry">' + biblioData[j] + '</div>');
                  }
             }
        }

        if (entriesHtml.length > 0) {
            biblioContent.innerHTML = entriesHtml.join('\n');
            biblioContainer.classList.add('is-visible-block');
            biblioContainer.classList.remove('is-hidden');
        } else {
            biblioContainer.classList.add('is-hidden');
            biblioContainer.classList.remove('is-visible-block');
        }

    } catch (e) {
        console.error('[sources_biblio_display.js] Failed to parse bibliography:', e);
        biblioContainer.classList.add('is-hidden');
        biblioContainer.classList.remove('is-visible-block');
    }
}

document.addEventListener('recordMainRendered', function(event) {
    if (event.detail && event.detail.record) {
        renderBibliography(event.detail.record);
    }
});
