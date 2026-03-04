/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               1. THE SKELETON                               //
//                           (System Global Enums)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// Unified publication states for various domain objects.
/// Defaults to Unpublished to ensure "Secure by Default" behavior.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, Hash)]
pub enum PublicationStatus {
    #[default]
    Unpublished,
    Draft,
    Published,
    Archived,
}
