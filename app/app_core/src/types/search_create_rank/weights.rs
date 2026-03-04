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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMetadata {
    pub queer_terms: QueerCluster,
    pub jesus_seminar: JesusSeminar,
    pub resource_id: UniqueId,
    pub scripture: BibleReference,
}

/// 1. Queer Cluster: LGBT related words/phrases
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QueerCluster(pub(crate) Vec<String>);

/// 2. Jesus Seminar: Authors and Scholars
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct JesusSeminar(pub(crate) Vec<String>);

/// 3. Unique ID: A secure, validated identifier
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UniqueId(pub(crate) String);

/// 4. Bible Reference: Structured scripture location
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BibleReference {
    pub book: String,
    pub chapter: u32,
    pub verse: Option<u32>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl SearchMetadata {
    /// Delegates construction and validation to `VibeGatekeeper`.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_new(
        queer: Vec<String>,
        seminar: Vec<String>,
        id_raw: String,
        book: String,
        chapter: u32,
        verse: Option<u32>,
    ) -> Result<Self, VibeError> {
        Ok(VibeGatekeeper::new(queer, seminar, id_raw, book, chapter, verse)?.into_inner())
    }
}

impl QueerCluster {
    pub fn try_new(terms: Vec<String>) -> Result<Self, VibeError> {
        if terms.is_empty() {
            return Err(VibeError::EmptyCollection("Queer Cluster".to_string()));
        }
        for item in &terms {
            if item.contains(['<', '>', '$']) {
                return Err(VibeError::SecurityThreat("Queer Cluster".to_string()));
            }
        }
        Ok(Self(terms))
    }
}

impl JesusSeminar {
    pub fn try_new(authors: Vec<String>) -> Result<Self, VibeError> {
        if authors.is_empty() {
            return Err(VibeError::EmptyCollection("Jesus Seminar".to_string()));
        }
        for author in &authors {
            if author.contains(['<', '>', '$']) {
                return Err(VibeError::SecurityThreat("Jesus Seminar".to_string()));
            }
        }
        Ok(Self(authors))
    }
}

impl UniqueId {
    pub fn try_new(id: String) -> Result<Self, VibeError> {
        if id.len() < 8 {
            return Err(VibeError::InvalidFormat("ID too short".to_string()));
        }
        if !id.chars().all(|c| c.is_alphanumeric() || c == '-') {
            return Err(VibeError::SecurityThreat("UniqueId contains illegal chars".to_string()));
        }
        Ok(Self(id))
    }
}

impl BibleReference {
    pub fn try_new(book: String, chapter: u32, verse: Option<u32>) -> Result<Self, VibeError> {
        if book.is_empty() || chapter == 0 {
            return Err(VibeError::InvalidFormat("Bible ref missing book or chapter".to_string()));
        }
        Ok(Self {
            book,
            chapter,
            verse,
        })
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

/// A validated `SearchMetadata`. Possession of this type guarantees all four
/// constituent fields (queer cluster, seminar, unique ID, bible ref) are valid.
pub struct VibeGatekeeper(SearchMetadata);

impl VibeGatekeeper {
    pub fn new(
        items: Vec<String>,
        authors: Vec<String>,
        id: String,
        book: String,
        chapter: u32,
        verse: Option<u32>,
    ) -> Result<Self, VibeError> {
        // Validate queer cluster
        if items.is_empty() {
            return Err(VibeError::EmptyCollection("Queer Cluster".to_string()));
        }
        for item in &items {
            if item.contains(['<', '>', '$']) {
                return Err(VibeError::SecurityThreat("Queer Cluster".to_string()));
            }
        }

        // Validate jesus seminar
        if authors.is_empty() {
            return Err(VibeError::EmptyCollection("Jesus Seminar".to_string()));
        }
        for author in &authors {
            if author.contains(['<', '>', '$']) {
                return Err(VibeError::SecurityThreat("Jesus Seminar".to_string()));
            }
        }

        // Validate unique ID
        if id.len() < 8 {
            return Err(VibeError::InvalidFormat("ID too short".to_string()));
        }
        if !id.chars().all(|c| c.is_alphanumeric() || c == '-') {
            return Err(VibeError::SecurityThreat("UniqueId contains illegal chars".to_string()));
        }

        // Validate bible reference
        if book.is_empty() || chapter == 0 {
            return Err(VibeError::InvalidFormat("Bible ref missing book or chapter".to_string()));
        }

        Ok(Self(SearchMetadata {
            queer_terms: QueerCluster(items),
            jesus_seminar: JesusSeminar(authors),
            resource_id: UniqueId(id),
            scripture: BibleReference {
                book,
                chapter,
                verse,
            },
        }))
    }

    /// Provides read-only access to the validated metadata.
    pub fn value(&self) -> &SearchMetadata {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated metadata.
    pub fn into_inner(self) -> SearchMetadata {
        self.0
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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VibeError {
    EmptyCollection(String),
    InvalidFormat(String),
    SecurityThreat(String),
}

impl std::error::Error for VibeError {}

impl fmt::Display for VibeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCollection(c) => write!(f, "Error: {} cannot be empty", c),
            Self::InvalidFormat(m) => write!(f, "Format Error: {}", m),
            Self::SecurityThreat(c) => write!(f, "Security Alert: Blocked input in {}", c),
        }
    }
}
