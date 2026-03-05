use serde::{Deserialize, Serialize};
use std::fmt;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A validated reference to a specific Bible verse.
/// We use u16 for chapter/verse to stay memory-lean while covering
/// all known historical versification schemas.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BibleVerse {
    pub book: BibleBook,
    pub chapter: u16,
    pub verse: u16,
}

/// The 66 books of the standard Protestant canon (expandable for Deuterocanon).
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BibleBook {
    Genesis,
    Exodus,
    Leviticus,
    Numbers,
    Deuteronomy,
    Joshua,
    Judges,
    Ruth,
    FirstSamuel,
    SecondSamuel,
    FirstKings,
    SecondKings,
    FirstChronicles,
    SecondChronicles,
    Ezra,
    Nehemiah,
    Esther,
    Job,
    Psalms,
    Proverbs,
    Ecclesiastes,
    SongOfSolomon,
    Isaiah,
    Jeremiah,
    Lamentations,
    Ezekiel,
    Daniel,
    Hosea,
    Joel,
    Amos,
    Obadiah,
    Jonah,
    Micah,
    Nahum,
    Habakkuk,
    Zephaniah,
    Haggai,
    Zechariah,
    Malachi,
    Matthew,
    Mark,
    Luke,
    John,
    Acts,
    Romans,
    FirstCorinthians,
    SecondCorinthians,
    Galatians,
    Ephesians,
    Philippians,
    Colossians,
    FirstThessalonians,
    SecondThessalonians,
    FirstTimothy,
    SecondTimothy,
    Titus,
    Philemon,
    Hebrews,
    James,
    FirstPeter,
    SecondPeter,
    FirstJohn,
    SecondJohn,
    ThirdJohn,
    Jude,
    Revelation,
    // Using a Catch-all for non-standard or external fragments
    ExtraCanonical(u16),
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl BibleVerse {
    /// Async-ready constructor for a verse reference.
    /// This allows for future integration with a "Versification Manager"
    /// that might check a DB to see if the verse exists in a specific translation.
    pub async fn new(book: BibleBook, chapter: u16, verse: u16) -> Result<Self, ScriptureError> {
        let instance = Self {
            book,
            chapter,
            verse,
        };

        // Delegate to the Gatekeeper for canonical boundaries
        instance.gatekeep_boundaries()?;

        Ok(instance)
    }

    /// Logic: Returns a sortable integer key (BookID * 1,000,000 + Ch * 1,000 + V).
    pub fn sort_key(&self) -> u32 {
        (self.book_index() as u32 * 1_000_000) + (self.chapter as u32 * 1_000) + self.verse as u32
    }

    fn book_index(&self) -> u16 {
        // Internal mapping for sorting logic (Canonical Order)
        match self.book {
            BibleBook::Genesis => 1,
            BibleBook::Exodus => 2,
            BibleBook::Leviticus => 3,
            BibleBook::Numbers => 4,
            BibleBook::Deuteronomy => 5,
            BibleBook::Joshua => 6,
            BibleBook::Judges => 7,
            BibleBook::Ruth => 8,
            BibleBook::FirstSamuel => 9,
            BibleBook::SecondSamuel => 10,
            BibleBook::FirstKings => 11,
            BibleBook::SecondKings => 12,
            BibleBook::FirstChronicles => 13,
            BibleBook::SecondChronicles => 14,
            BibleBook::Ezra => 15,
            BibleBook::Nehemiah => 16,
            BibleBook::Esther => 17,
            BibleBook::Job => 18,
            BibleBook::Psalms => 19,
            BibleBook::Proverbs => 20,
            BibleBook::Ecclesiastes => 21,
            BibleBook::SongOfSolomon => 22,
            BibleBook::Isaiah => 23,
            BibleBook::Jeremiah => 24,
            BibleBook::Lamentations => 25,
            BibleBook::Ezekiel => 26,
            BibleBook::Daniel => 27,
            BibleBook::Hosea => 28,
            BibleBook::Joel => 29,
            BibleBook::Amos => 30,
            BibleBook::Obadiah => 31,
            BibleBook::Jonah => 32,
            BibleBook::Micah => 33,
            BibleBook::Nahum => 34,
            BibleBook::Habakkuk => 35,
            BibleBook::Zephaniah => 36,
            BibleBook::Haggai => 37,
            BibleBook::Zechariah => 38,
            BibleBook::Malachi => 39,
            BibleBook::Matthew => 40,
            BibleBook::Mark => 41,
            BibleBook::Luke => 42,
            BibleBook::John => 43,
            BibleBook::Acts => 44,
            BibleBook::Romans => 45,
            BibleBook::FirstCorinthians => 46,
            BibleBook::SecondCorinthians => 47,
            BibleBook::Galatians => 48,
            BibleBook::Ephesians => 49,
            BibleBook::Philippians => 50,
            BibleBook::Colossians => 51,
            BibleBook::FirstThessalonians => 52,
            BibleBook::SecondThessalonians => 53,
            BibleBook::FirstTimothy => 54,
            BibleBook::SecondTimothy => 55,
            BibleBook::Titus => 56,
            BibleBook::Philemon => 57,
            BibleBook::Hebrews => 58,
            BibleBook::James => 59,
            BibleBook::FirstPeter => 60,
            BibleBook::SecondPeter => 61,
            BibleBook::FirstJohn => 62,
            BibleBook::SecondJohn => 63,
            BibleBook::ThirdJohn => 64,
            BibleBook::Jude => 65,
            BibleBook::Revelation => 66,
            BibleBook::ExtraCanonical(id) => 1000 + id,
        }
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security Gatekeeping & Validators)                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl BibleVerse {
    /// Security & Integrity Gate:
    /// Prevents the creation of impossible references (e.g., Chapter 0 or Verse 0).
    fn gatekeep_boundaries(&self) -> Result<(), ScriptureError> {
        // 1. Minimum Check: Bible chapters and verses are 1-indexed.
        if self.chapter == 0 || self.verse == 0 {
            return Err(ScriptureError::ZeroIndexForbidden);
        }

        // 2. Maximum Check: Sanity bounds to prevent buffer/UI overflows.
        // Even the longest chapters (Psalm 119) and most chapters (Psalms 150)
        // are well below 1000.
        if self.chapter > 1000 || self.verse > 1000 {
            return Err(ScriptureError::OutofPlausibleRange);
        }

        // 3. Logic Gate: Book-Specific limits.
        let max_chapters = match self.book {
            BibleBook::Genesis => 50,
            BibleBook::Exodus => 40,
            BibleBook::Leviticus => 27,
            BibleBook::Numbers => 36,
            BibleBook::Deuteronomy => 34,
            BibleBook::Joshua => 24,
            BibleBook::Judges => 21,
            BibleBook::Ruth => 4,
            BibleBook::FirstSamuel => 31,
            BibleBook::SecondSamuel => 24,
            BibleBook::FirstKings => 22,
            BibleBook::SecondKings => 25,
            BibleBook::FirstChronicles => 29,
            BibleBook::SecondChronicles => 36,
            BibleBook::Ezra => 10,
            BibleBook::Nehemiah => 13,
            BibleBook::Esther => 10,
            BibleBook::Job => 42,
            BibleBook::Psalms => 150,
            BibleBook::Proverbs => 31,
            BibleBook::Ecclesiastes => 12,
            BibleBook::SongOfSolomon => 8,
            BibleBook::Isaiah => 66,
            BibleBook::Jeremiah => 52,
            BibleBook::Lamentations => 5,
            BibleBook::Ezekiel => 48,
            BibleBook::Daniel => 12,
            BibleBook::Hosea => 14,
            BibleBook::Joel => 3,
            BibleBook::Amos => 9,
            BibleBook::Obadiah => 1,
            BibleBook::Jonah => 4,
            BibleBook::Micah => 7,
            BibleBook::Nahum => 3,
            BibleBook::Habakkuk => 3,
            BibleBook::Zephaniah => 3,
            BibleBook::Haggai => 2,
            BibleBook::Zechariah => 14,
            BibleBook::Malachi => 4,
            BibleBook::Matthew => 28,
            BibleBook::Mark => 16,
            BibleBook::Luke => 24,
            BibleBook::John => 21,
            BibleBook::Acts => 28,
            BibleBook::Romans => 16,
            BibleBook::FirstCorinthians => 16,
            BibleBook::SecondCorinthians => 13,
            BibleBook::Galatians => 6,
            BibleBook::Ephesians => 6,
            BibleBook::Philippians => 4,
            BibleBook::Colossians => 4,
            BibleBook::FirstThessalonians => 5,
            BibleBook::SecondThessalonians => 3,
            BibleBook::FirstTimothy => 6,
            BibleBook::SecondTimothy => 4,
            BibleBook::Titus => 3,
            BibleBook::Philemon => 1,
            BibleBook::Hebrews => 13,
            BibleBook::James => 5,
            BibleBook::FirstPeter => 5,
            BibleBook::SecondPeter => 3,
            BibleBook::FirstJohn => 5,
            BibleBook::SecondJohn => 1,
            BibleBook::ThirdJohn => 1,
            BibleBook::Jude => 1,
            BibleBook::Revelation => 22,
            BibleBook::ExtraCanonical(_) => 1000,
        };

        if self.chapter > max_chapters {
            return Err(ScriptureError::InvalidChapterForBook);
        }

        Ok(())
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE ERRORS                                //
//                         (Error Handling & Edge Cases)                      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Debug, thiserror::Error)]
pub enum ScriptureError {
    #[error("Scripture reference cannot use 0; chapters and verses start at 1")]
    ZeroIndexForbidden,

    #[error("Reference exceeds plausible bounds for known scripture")]
    OutofPlausibleRange,

    #[error("The selected book does not contain that chapter number")]
    InvalidChapterForBook,

    #[error("Versification Mismatch: This verse does not exist in the requested schema")]
    VersificationMismatch,
}

impl fmt::Display for BibleVerse {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?} {}:{}", self.book, self.chapter, self.verse)
    }
}
