document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-auto-scraper');
    if (!runBtn || runBtn.dataset.wgtInit) return;
    runBtn.dataset.wgtInit = "true";

    const progressDiv = document.getElementById('scraper-progress');
    const currFileSpan = document.getElementById('scraper-current-file');
    const countSpan = document.getElementById('scraper-count');
    const listUl = document.getElementById('scraper-list');

    // Bible books
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
    const refRegex = new RegExp(`\\b(${booksRegexStr})\\s+(\\d+):(\\d+)(?:[-–—]\\d+)?\\b`, 'gi');

    const filesToScrape = [
        '/list_events.html',
        '/list_objects.html',
        '/list_people.html',
        '/list_places.html',
        '/list_miracles.html',
        '/list_ot_verses.html'
    ];

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        progressDiv.style.display = 'block';
        listUl.innerHTML = '';
        let totalCount = 0;
        let bulkPayload = [];

        for (const fileUrl of filesToScrape) {
            const fileName = fileUrl.split('/').pop();
            currFileSpan.textContent = fileName;
            try {
                const res = await fetch(fileUrl);
                if (!res.ok) continue;
                const htmlText = await res.text();

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const listItems = doc.querySelectorAll('li');

                for (let li of listItems) {
                    const text = li.textContent.trim();
                    if (!text) continue;

                    let match;
                    let primaryVerse = null;

                    refRegex.lastIndex = 0; 

                    while ((match = refRegex.exec(text)) !== null) {
                        if (!primaryVerse) {
                            primaryVerse = {
                                book: match[1],
                                chapter: parseInt(match[2], 10),
                                verse: parseInt(match[3], 10)
                            };
                            break;
                        }
                    }

                    if (primaryVerse) {
                        totalCount++;
                        countSpan.textContent = totalCount;

                        let name = text.replace(new RegExp(`\\([^)]*\\b(?:${booksRegexStr})\\b[^)]*\\)`, 'gi'), '').trim();
                        name = name.replace(refRegex, '').trim();
                        name = name.substring(0, 80).split('—')[0].split('-')[0].trim();
                        if (!name) name = `Scraped item from ${fileName}`;

                        const categoryMap = {
                            'list_events.html': 'Event',
                            'list_people.html': 'Person',
                            'list_places.html': 'Location'
                        };

                        bulkPayload.push({
                            name: name,
                            description: [`Auto-generated record from ${fileName}.\nOriginal Source: ${text}`],
                            category: categoryMap[fileName] || 'Theme',
                            primary_verse: `${primaryVerse.book} ${primaryVerse.chapter}:${primaryVerse.verse}`,
                            timeline: {
                                era: "theme",
                                event_name: ""
                            },
                            map_data: {
                                region: "Overview",
                                lat: 0.0,
                                lng: 0.0
                            }
                        });

                        const liElem = document.createElement('li');
                        liElem.innerHTML = `<a href="#">${name} <span class="label" style="float: right;">queued</span></a>`;
                        listUl.insertBefore(liElem, listUl.firstChild);
                    }
                }
            } catch (e) {
                console.error(`Error scraping ${fileUrl}`, e);
            }
        }

        currFileSpan.textContent = "Posting Bulk Payload...";
        
        try {
            const token = sessionStorage.getItem("auth_token") || "";
            const postRes = await fetch('/api/v1/admin/populate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(bulkPayload)
            });

            if (postRes.ok) {
                currFileSpan.textContent = "Done";
                runBtn.textContent = `Successfully bulk-populated ${bulkPayload.length} Records!`;
            } else {
                currFileSpan.textContent = "Error posting payload";
                runBtn.textContent = "Failed";
            }
        } catch (err) {
            console.error("Error bulk posting records", err);
            currFileSpan.textContent = "Error posting payload";
        }
    });
});
