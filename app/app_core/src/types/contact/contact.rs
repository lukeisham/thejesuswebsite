use serde::{Deserialize, Serialize};
use std::fmt;
use ulid::Ulid;

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
pub struct Contact {
    pub id: Ulid,
    pub name: String,
    pub email: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Contact {
    /// Async constructor for a new Contact.
    /// Logic: Mandatory validation of both fields before instantiation.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn try_new(name: String, email: String) -> Result<Contact, ContactError> {
        // The Brain delegates to the Gatekeeper for security checks
        ContactGatekeeper::validate_name(&name)?;
        ContactGatekeeper::validate_email(&email)?;

        Ok(Self {
            id: Ulid::new(),
            name: name.trim().to_string(),
            email: email.trim().to_lowercase(),
        })
    }

    /// Async handler to update email with re-validation
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn update_email(&mut self, new_email: String) -> Result<(), ContactError> {
        ContactGatekeeper::validate_email(&new_email)?;
        self.email = new_email.trim().to_lowercase();
        Ok(())
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

pub struct ContactGatekeeper;

impl ContactGatekeeper {
    /// Security Gatekeeping: Ensures names are reasonable and safe.
    pub fn validate_name(name: &str) -> Result<(), ContactError> {
        let trimmed = name.trim();

        if trimmed.is_empty() {
            return Err(ContactError::EmptyField("Name".into()));
        }

        if trimmed.len() > 100 {
            return Err(ContactError::FieldTooLong("Name".into()));
        }

        // Basic script injection prevention
        if trimmed.contains('<') || trimmed.contains('>') {
            return Err(ContactError::InvalidFormat("Name contains illegal characters".into()));
        }

        Ok(())
    }

    /// Security Gatekeeping: Basic email structure validation.
    /// No-Panic: We check for the '@' and a '.' without crashing.
    pub fn validate_email(email: &str) -> Result<(), ContactError> {
        let trimmed = email.trim();

        if !trimmed.contains('@') || !trimmed.contains('.') {
            return Err(ContactError::InvalidFormat("Email must be a valid address".into()));
        }

        if trimmed.len() > 255 {
            return Err(ContactError::FieldTooLong("Email".into()));
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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Serialize, Deserialize)]
pub enum ContactError {
    EmptyField(String),
    FieldTooLong(String),
    InvalidFormat(String),
}

impl std::error::Error for ContactError {}

impl fmt::Display for ContactError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyField(fld) => write!(f, "Contact Error: {} cannot be empty.", fld),
            Self::FieldTooLong(fld) => {
                write!(f, "Contact Error: {} exceeds maximum allowed length.", fld)
            }
            Self::InvalidFormat(msg) => write!(f, "Contact Validation Error: {}", msg),
        }
    }
}
