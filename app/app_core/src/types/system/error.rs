use serde::{Deserialize, Serialize};
use thiserror::Error;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE ERRORS                                //
//                         (Error Handling & Edge Cases)                      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Error, Serialize, Deserialize)]
pub enum AppError {
    #[error("Storage Error: {0}")]
    StorageError(String),

    #[error("Inference Error: {0}")]
    InferenceError(String),

    #[error("Validation Error: {0}")]
    ValidationError(String),

    #[error("Security Violation: {0}")]
    SecurityViolation(String),

    #[error("System Collision: {0}")]
    SystemCollision(String),

    #[error("Wrong password")]
    WrongPassword,

    #[error("Too many attempts. Please try again later.")]
    FloodControl,

    #[error("Unable to open dashboard.html")]
    DashboardAccessError,

    #[error("No response from the app")]
    AppNoResponse,
}
