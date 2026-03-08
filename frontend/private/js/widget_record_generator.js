document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-auto-scraper');
    if (!runBtn || runBtn.dataset.wgtInit) return;
    runBtn.dataset.wgtInit = "true";

    const progressDiv = document.getElementById('scraper-progress');
    const currFileSpan = document.getElementById('scraper-current-file');
    const countSpan = document.getElementById('scraper-count');
    const listUl = document.getElementById('scraper-list');

    // Bible books from app_core logic
    const BIBLE_BOOKS = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
        "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
        "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
        "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
        "Zechariah", "Malachi",
        "Matthew", "Matt", "Mark", "Luke", "John", "Acts", "Romans",
        "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
        "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
        "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
        "1 John", "2 John", "3 John", "Jude", "Revelation"
    ];

    const booksRegexStr = BIBLE_BOOKS.map(b => b.replace(/\s+/g, '\\s+')).join('|');
    // Match Book Chap:Vs, capturing book (1), chap (2), vs (3)
    const refRegex = new RegExp(`\\b(${booksRegexStr})\\s+(\\d+):(\\d+)(?:[-–—]\\d+)?\\b`, 'gi');

    const filesToScrape = [
        '/resource/list_of_events.html',
        '/resource/list_of_objects.html',
        '/resource/list_of_people.html',
        '/resource/list_of_places.html',
        '/resource/list_of_miracles.html',
        '/resource/list_of_OT_verses.html'
    ];

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        progressDiv.style.display = 'block';
        listUl.innerHTML = '';
        let totalCount = 0;

        for (const fileUrl of filesToScrape) {
            const fileName = fileUrl.split('/').pop();
            currFileSpan.textContent = fileName;
            try {
                const res = await fetch(fileUrl);
                if (!res.ok) continue;
                const htmlText = await res.text();

                // Parse HTML to extract text content of list items
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const listItems = doc.querySelectorAll('li');

                for (let li of listItems) {
                    const text = li.textContent.trim();
                    if (!text) continue;

                    let match;
                    let primaryVerse = null;
                    let secondaryVerses = [];
                    let firstMatchBook = null;
                    let firstMatchCh = null;
                    let firstMatchVs = null;

                    refRegex.lastIndex = 0; // Reset regex state

                    while ((match = refRegex.exec(text)) !== null) {
                        if (!primaryVerse) {
                            primaryVerse = match[0];
                            firstMatchBook = match[1];
                            firstMatchCh = parseInt(match[2], 10);
                            firstMatchVs = parseInt(match[3], 10);
                        } else {
                            secondaryVerses.push(match[0]);
                        }
                    }

                    if (primaryVerse) {
                        totalCount++;
                        countSpan.textContent = totalCount;

                        // Extract name by removing verses in parens or trailing verses
                        let name = text.replace(new RegExp(`\\([^)]*\\b(?:${booksRegexStr})\\b[^)]*\\)`, 'gi'), '').trim();
                        name = name.replace(refRegex, '').trim();
                        // Truncate cleanly
                        name = name.substring(0, 80).split('—')[0].split('-')[0].trim();
                        if (!name) name = `Scraped item from ${fileName}`;

                        // Map secondary verse reference struct cleanly if it exists
                        const mappedSecondary = secondaryVerses.length > 0
                            ? { book: secondaryVerses[0], chapter: 1, verse: 1 } // hack for string based schema compatibility
                            : null;

                        const recordData = {
                            id: "01HXXXX",
                            parent_id: null,
                            metadata: {
                                id: "01HXXXX",
                                name: name,
                                system_tags: ["auto-scraped"],
                                custom_tags: [],
                                version: 1
                            },
                            name: name,
                            picture_bytes: [],
                            description: [`Auto-generated record from ${fileName}.\nOriginal Source: ${text}`],
                            bibliography: [],
                            timeline: {
                                era: "Ancient",
                                year: 33,
                                month: 4,
                                day: 3
                            },
                            map_data: { points: [] },
                            category: "Literary",
                            primary_verse: {
                                book: firstMatchBook,
                                chapter: firstMatchCh,
                                verse: firstMatchVs
                            },
                            secondary_verse: mappedSecondary,
                            passion_info: null,
                            created_at: new Date().toISOString(),
                            updated_at: null
                        };

                        try {
                            const postRes = await fetch('/api/v1/records/publish', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(recordData)
                            });

                            const liElem = document.createElement('li');
                            if (postRes.ok) {
                                liElem.innerHTML = `<a href="#">${name} <span class="label" style="float: right;">success</span></a>`;
                            } else {
                                liElem.innerHTML = `<a href="#" style="color:red">${name} <span class="label" style="float: right;">failed</span></a>`;
                            }
                            listUl.insertBefore(liElem, listUl.firstChild);
                        } catch (err) {
                            console.error("Error posting record", err);
                        }
                    }
                }
            } catch (e) {
                console.error(`Error scraping ${fileUrl}`, e);
            }
        }

        currFileSpan.textContent = "Done";
        runBtn.textContent = `Scraped ${totalCount} Records!`;
    });
});
