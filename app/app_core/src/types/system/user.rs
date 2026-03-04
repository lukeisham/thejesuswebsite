use serde::{Deserialize, Serialize};

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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserRole {
    Admin,
    Contributor,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub role: UserRole,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl User {
    pub fn new(id: String, email: String, role: UserRole) -> Self {
        Self { id, email, role }
    }
}
