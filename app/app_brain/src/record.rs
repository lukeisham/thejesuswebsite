/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE SKELETON                               //
//                             (Record Context)                               //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// A placeholder for record-related domain logic.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct Record;

impl Record {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self
    }
}
