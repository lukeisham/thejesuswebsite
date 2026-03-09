use super::bible_verse::{BibleBook, BibleVerse, ScriptureError};

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Parses a Bible reference string (e.g. "Mk 4:35", "Isaiah 7:14", "Jn 2")
/// into a validated BibleVerse.
///
/// Handles:
///  - Full and abbreviated book names (Mt, Mk, Lk, Jn, Isa, Ps, etc.)
///  - Numbered books (1 Sam, 2 Kings, 1 Cor, etc.)
///  - Chapter:verse format (Mt 4:35)
///  - Chapter-only format (Jn 2) — defaults verse to 1
///  - Verse ranges (Mk 4:35–41) — takes the start verse only
///  - Parenthetical refs are stripped: "(Mt 1:23)" → "Mt 1:23"
pub async fn parse_bible_ref(s: &str) -> Result<BibleVerse, ScriptureError> {
    let cleaned = s.replace(['(', ')'], "").trim().to_string();
    if cleaned.is_empty() {
        return Err(ScriptureError::ZeroIndexForbidden);
    }

    // Try to parse the reference
    let (book, chapter, verse) = extract_book_chapter_verse(&cleaned)?;
    BibleVerse::new(book, chapter, verse).await
}

/// Synchronous version for contexts where async isn't available.
/// Constructs the BibleVerse directly (skipping async gatekeep).
pub fn parse_bible_ref_sync(s: &str) -> Result<BibleVerse, ScriptureError> {
    let cleaned = s.replace(['(', ')'], "").trim().to_string();
    if cleaned.is_empty() {
        return Err(ScriptureError::ZeroIndexForbidden);
    }

    let (book, chapter, verse) = extract_book_chapter_verse(&cleaned)?;

    if chapter == 0 || verse == 0 {
        return Err(ScriptureError::ZeroIndexForbidden);
    }

    Ok(BibleVerse {
        book,
        chapter,
        verse,
    })
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Extracts book, chapter, and verse from a cleaned reference string.
fn extract_book_chapter_verse(s: &str) -> Result<(BibleBook, u16, u16), ScriptureError> {
    // Regex-free parsing: find where the numeric part starts
    let bytes = s.as_bytes();
    let len = bytes.len();

    // Handle numbered books: skip leading digit + space (e.g. "1 Sam", "2 Kings")
    let mut book_end = 0;
    let mut num_start = 0;

    // If starts with digit followed by space+letter, it's a numbered book prefix
    let has_number_prefix = len > 2
        && bytes[0].is_ascii_digit()
        && (bytes[1] == b' ' || bytes[1] == b'\t');

    if has_number_prefix {
        // Skip past the prefix to find where the book name ends and chapter begins
        // e.g. "1 Samuel 16:13" — we need to find "16:13"
        // Find the LAST transition from letter to space+digit
        let mut i = 2; // skip "1 "
        while i < len && bytes[i].is_ascii_alphabetic() {
            i += 1;
        }
        // Skip whitespace
        while i < len && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        // Now i should point to the chapter number
        if i < len && bytes[i].is_ascii_digit() {
            book_end = i;
            num_start = i;
        }
    }

    if book_end == 0 {
        // Standard book: find where the chapter number starts
        // e.g. "Matthew 14:28" or "Mk 4:35"
        // Walk backwards from end to find the last group of digits
        let mut i = 0;

        // For numbered books like "1 Sam", start after the prefix
        if has_number_prefix {
            i = 2;
        }

        // Find the first digit that follows a space (this is the chapter)
        let mut found_chapter = false;
        while i < len {
            if bytes[i].is_ascii_whitespace() {
                let next = i + 1;
                if next < len && bytes[next].is_ascii_digit() {
                    book_end = i;
                    num_start = next;
                    found_chapter = true;
                    break;
                }
            }
            i += 1;
        }

        if !found_chapter {
            // No chapter found — might be just a book name
            return Err(ScriptureError::ZeroIndexForbidden);
        }
    }

    let book_str = s[..book_end].trim();
    let num_str = s[num_start..].trim();

    // Parse book name
    let book = normalize_book_name(book_str)
        .ok_or(ScriptureError::ZeroIndexForbidden)?;

    // Parse chapter:verse or chapter-only
    let (chapter, verse) = parse_chapter_verse(num_str)?;

    Ok((book, chapter, verse))
}

/// Parses "14:28", "4:35–41", "2", "53" into (chapter, verse).
/// Ranges take the start verse. Chapter-only defaults verse to 1.
fn parse_chapter_verse(s: &str) -> Result<(u16, u16), ScriptureError> {
    // Split on colon or period
    let parts: Vec<&str> = s.splitn(2, |c| c == ':' || c == '.').collect();

    let chapter_str = parts[0].trim();
    let chapter: u16 = chapter_str
        .parse()
        .map_err(|_| ScriptureError::ZeroIndexForbidden)?;

    let verse = if parts.len() > 1 {
        let verse_str = parts[1].trim();
        // Handle ranges: "35–41" or "35-41" — take start verse
        let start = verse_str
            .split(|c| c == '–' || c == '-' || c == '—')
            .next()
            .unwrap_or("1")
            .trim();
        start
            .parse()
            .map_err(|_| ScriptureError::ZeroIndexForbidden)?
    } else {
        1 // Default verse for chapter-only refs
    };

    Ok((chapter, verse))
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security Gatekeeping & Validators)                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Normalises a book abbreviation/name to the BibleBook enum variant.
/// Returns None for unrecognised names.
pub fn normalize_book_name(raw: &str) -> Option<BibleBook> {
    let key = raw.trim().to_lowercase();
    match key.as_str() {
        // OT
        "genesis" | "gen" => Some(BibleBook::Genesis),
        "exodus" | "ex" | "exod" => Some(BibleBook::Exodus),
        "leviticus" | "lev" => Some(BibleBook::Leviticus),
        "numbers" | "num" => Some(BibleBook::Numbers),
        "deuteronomy" | "deut" | "dt" => Some(BibleBook::Deuteronomy),
        "joshua" | "josh" => Some(BibleBook::Joshua),
        "judges" | "judg" => Some(BibleBook::Judges),
        "ruth" => Some(BibleBook::Ruth),
        "1 samuel" | "1 sam" | "1samuel" => Some(BibleBook::FirstSamuel),
        "2 samuel" | "2 sam" | "2samuel" => Some(BibleBook::SecondSamuel),
        "1 kings" | "1 kgs" | "1kings" => Some(BibleBook::FirstKings),
        "2 kings" | "2 kgs" | "2kings" => Some(BibleBook::SecondKings),
        "1 chronicles" | "1 chr" | "1chronicles" => Some(BibleBook::FirstChronicles),
        "2 chronicles" | "2 chr" | "2chronicles" => Some(BibleBook::SecondChronicles),
        "ezra" => Some(BibleBook::Ezra),
        "nehemiah" | "neh" => Some(BibleBook::Nehemiah),
        "esther" | "est" => Some(BibleBook::Esther),
        "job" => Some(BibleBook::Job),
        "psalms" | "psalm" | "ps" | "psa" => Some(BibleBook::Psalms),
        "proverbs" | "prov" => Some(BibleBook::Proverbs),
        "ecclesiastes" | "eccl" => Some(BibleBook::Ecclesiastes),
        "song of solomon" | "song" => Some(BibleBook::SongOfSolomon),
        "isaiah" | "isa" => Some(BibleBook::Isaiah),
        "jeremiah" | "jer" => Some(BibleBook::Jeremiah),
        "lamentations" | "lam" => Some(BibleBook::Lamentations),
        "ezekiel" | "ezek" => Some(BibleBook::Ezekiel),
        "daniel" | "dan" => Some(BibleBook::Daniel),
        "hosea" | "hos" => Some(BibleBook::Hosea),
        "joel" => Some(BibleBook::Joel),
        "amos" => Some(BibleBook::Amos),
        "obadiah" | "obad" => Some(BibleBook::Obadiah),
        "jonah" => Some(BibleBook::Jonah),
        "micah" | "mic" => Some(BibleBook::Micah),
        "nahum" | "nah" => Some(BibleBook::Nahum),
        "habakkuk" | "hab" => Some(BibleBook::Habakkuk),
        "zephaniah" | "zeph" => Some(BibleBook::Zephaniah),
        "haggai" | "hag" => Some(BibleBook::Haggai),
        "zechariah" | "zech" => Some(BibleBook::Zechariah),
        "malachi" | "mal" => Some(BibleBook::Malachi),
        // NT
        "matthew" | "matt" | "mt" => Some(BibleBook::Matthew),
        "mark" | "mk" => Some(BibleBook::Mark),
        "luke" | "lk" => Some(BibleBook::Luke),
        "john" | "jn" => Some(BibleBook::John),
        "acts" => Some(BibleBook::Acts),
        "romans" | "rom" => Some(BibleBook::Romans),
        "1 corinthians" | "1 cor" | "1corinthians" => Some(BibleBook::FirstCorinthians),
        "2 corinthians" | "2 cor" | "2corinthians" => Some(BibleBook::SecondCorinthians),
        "galatians" | "gal" => Some(BibleBook::Galatians),
        "ephesians" | "eph" => Some(BibleBook::Ephesians),
        "philippians" | "phil" => Some(BibleBook::Philippians),
        "colossians" | "col" => Some(BibleBook::Colossians),
        "1 thessalonians" | "1 thess" => Some(BibleBook::FirstThessalonians),
        "2 thessalonians" | "2 thess" => Some(BibleBook::SecondThessalonians),
        "1 timothy" | "1 tim" => Some(BibleBook::FirstTimothy),
        "2 timothy" | "2 tim" => Some(BibleBook::SecondTimothy),
        "titus" => Some(BibleBook::Titus),
        "philemon" | "phlm" => Some(BibleBook::Philemon),
        "hebrews" | "heb" => Some(BibleBook::Hebrews),
        "james" | "jas" => Some(BibleBook::James),
        "1 peter" | "1 pet" => Some(BibleBook::FirstPeter),
        "2 peter" | "2 pet" => Some(BibleBook::SecondPeter),
        "1 john" | "1 jn" => Some(BibleBook::FirstJohn),
        "2 john" | "2 jn" => Some(BibleBook::SecondJohn),
        "3 john" | "3 jn" => Some(BibleBook::ThirdJohn),
        "jude" => Some(BibleBook::Jude),
        "revelation" | "rev" => Some(BibleBook::Revelation),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_parse_standard_ref() {
        let v = parse_bible_ref("Mt 4:35").await.unwrap();
        assert_eq!(v.book, BibleBook::Matthew);
        assert_eq!(v.chapter, 4);
        assert_eq!(v.verse, 35);
    }

    #[tokio::test]
    async fn test_parse_full_name() {
        let v = parse_bible_ref("Matthew 14:28").await.unwrap();
        assert_eq!(v.book, BibleBook::Matthew);
        assert_eq!(v.chapter, 14);
        assert_eq!(v.verse, 28);
    }

    #[tokio::test]
    async fn test_parse_chapter_only() {
        let v = parse_bible_ref("Jn 2").await.unwrap();
        assert_eq!(v.book, BibleBook::John);
        assert_eq!(v.chapter, 2);
        assert_eq!(v.verse, 1); // default
    }

    #[tokio::test]
    async fn test_parse_ot_ref() {
        let v = parse_bible_ref("Isaiah 7:14").await.unwrap();
        assert_eq!(v.book, BibleBook::Isaiah);
        assert_eq!(v.chapter, 7);
        assert_eq!(v.verse, 14);
    }

    #[tokio::test]
    async fn test_parse_range_takes_start() {
        let v = parse_bible_ref("Mk 4:35–41").await.unwrap();
        assert_eq!(v.book, BibleBook::Mark);
        assert_eq!(v.chapter, 4);
        assert_eq!(v.verse, 35);
    }

    #[tokio::test]
    async fn test_parse_parenthetical() {
        let v = parse_bible_ref("(Mt 1:23)").await.unwrap();
        assert_eq!(v.book, BibleBook::Matthew);
        assert_eq!(v.chapter, 1);
        assert_eq!(v.verse, 23);
    }

    #[tokio::test]
    async fn test_parse_numbered_book() {
        let v = parse_bible_ref("1 Sam 16:13").await.unwrap();
        assert_eq!(v.book, BibleBook::FirstSamuel);
        assert_eq!(v.chapter, 16);
        assert_eq!(v.verse, 13);
    }

    #[test]
    fn test_normalize_book_abbreviations() {
        assert_eq!(normalize_book_name("Mt"), Some(BibleBook::Matthew));
        assert_eq!(normalize_book_name("Mk"), Some(BibleBook::Mark));
        assert_eq!(normalize_book_name("Lk"), Some(BibleBook::Luke));
        assert_eq!(normalize_book_name("Jn"), Some(BibleBook::John));
        assert_eq!(normalize_book_name("Isa"), Some(BibleBook::Isaiah));
        assert_eq!(normalize_book_name("Ps"), Some(BibleBook::Psalms));
        assert_eq!(normalize_book_name("Rev"), Some(BibleBook::Revelation));
        assert_eq!(normalize_book_name("unknown"), None);
    }
}
