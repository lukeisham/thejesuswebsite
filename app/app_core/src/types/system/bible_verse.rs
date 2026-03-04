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
    Exodus, // ...
    John,
    Romans,
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
        // Internal mapping for sorting logic
        match self.book {
            BibleBook::Genesis => 1,
            BibleBook::John => 43,
            BibleBook::Revelation => 66,
            _ => 999,
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
        // This is where we'd check if 'John' actually has a chapter 22 (it doesn't).
        if matches!(self.book, BibleBook::John) && self.chapter > 21 {
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
