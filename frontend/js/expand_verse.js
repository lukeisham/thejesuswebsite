(function() {
    "use strict";

    async function expandVerses() {
        const elements = document.querySelectorAll('.primary-verse-display[data-verse]:not(.expanded)');
        
        for (const el of elements) {
            const verseValue = el.getAttribute('data-verse');
            if (!verseValue) continue;
            
            el.classList.add('expanded');
            
            try {
                const response = await fetch(`/api/v1/expand_verse?q=${encodeURIComponent(verseValue)}`);
                if (!response.ok) continue;
                
                const responseText = await response.text();
                let esvText = responseText;
                
                try {
                    const data = JSON.parse(responseText);
                    if (data.passages && data.passages.length > 0) {
                        esvText = data.passages[0].trim();
                    } else if (data.text) {
                        esvText = data.text;
                    }
                } catch (e) {
                    // Not JSON, use raw text
                }
                
                const span = document.createElement('span');
                span.style.display = 'block';
                span.style.marginTop = '0.5rem';
                span.style.fontStyle = 'italic';
                span.style.fontSize = '0.9em';
                span.textContent = `"${esvText.replace(/\n\s*/g, ' ')}"`;
                
                el.appendChild(span);
            } catch (err) {
                console.error(`Failed to expand verse ${verseValue}:`, err);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', expandVerses);
    } else {
        expandVerses();
    }
})();
