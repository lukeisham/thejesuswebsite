/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE SKELETON                               //
//                             (Core Data Types)                              //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// A wrapper around search terms to ensure they are cleaned and validated.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchWords(pub(crate) String);

impl SearchWords {
    pub fn is_empty(&self) -> bool {
        self.0.trim().is_empty()
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }
}

/// The specific domain or category to restrict a search to.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SearchDomain {
    Essays,
    Wikipedia,
    Records,
    Challenges,
}

/// A draft version of an essay used during the creative process.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone)]
pub struct DraftEssay {
    pub title: String,
    pub content: String,
}

impl DraftEssay {
    pub fn is_authorized_for(&self, _domain: &SearchDomain) -> bool {
        // Security logic here: for now, all drafts are authorized.
        true
    }
}
