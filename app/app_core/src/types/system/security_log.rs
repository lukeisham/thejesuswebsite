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
pub enum SecurityEventType {
    Honeypot,
    RateLimit,
    LoginRequest,
    LoginSuccess,
    LoginFail,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityLog {
    pub id: String,
    pub event_type: SecurityEventType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    pub created_at: String,
}

impl SecurityLog {
    pub fn new(
        id: String,
        event_type: SecurityEventType,
        ip_address: Option<String>,
        details: Option<String>,
        created_at: String,
    ) -> Self {
        Self {
            id,
            event_type,
            ip_address,
            details,
            created_at,
        }
    }
}
