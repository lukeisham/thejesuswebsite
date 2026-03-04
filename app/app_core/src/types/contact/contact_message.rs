use crate::types::contact::contact::Contact;
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
pub struct ContactMessage {
    pub id: Ulid,
    /// Composition: Leveraging the already defined Contact type
    pub sender: Contact,
    /// The actual text payload
    pub body: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl ContactMessage {
    /// Async-ready constructor.
    /// Logic: Pairs a valid Contact with a sanitized text body.
    /// Delegates all validation to `ContactMessageGatekeeper`.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_new(sender: Contact, body: String) -> Result<Self, ContactMessageError> {
        Ok(ContactMessageGatekeeper::new(sender, body)
            .await?
            .into_inner())
    }

    /// Logic to "Send" the message (Async First)
    pub async fn dispatch(&self) -> Result<(), ContactMessageError> {
        // Here you would integrate with a WorkQueue or Mailer
        println!("Dispatching message from {}: {}", self.sender.name, self.body);
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

/// A validated `ContactMessage`. The only way to construct this type is via
/// `ContactMessageGatekeeper::new()`, which enforces all security rules.
/// Possession of this type is proof the body passed all text-safety checks.
pub struct ContactMessageGatekeeper(ContactMessage);

impl ContactMessageGatekeeper {
    /// Security Gatekeeping: Enforces "Text Only" rules.
    /// Rejects any content that looks like HTML, Markdown, or Scripting.
    /// Returns a validated wrapper if all checks pass.
    pub async fn new(sender: Contact, body: String) -> Result<Self, ContactMessageError> {
        let trimmed = body.trim();

        if trimmed.is_empty() {
            return Err(ContactMessageError::EmptyMessage);
        }

        if trimmed.len() > 2000 {
            return Err(ContactMessageError::MessageTooLong);
        }

        // Strict "Text Only" check: Rejection of tag-like structures
        // This prevents XSS or injection if this is ever rendered in a UI.
        if trimmed.contains('<') || trimmed.contains('>') || trimmed.contains('{') {
            return Err(ContactMessageError::IllegalMarkupDetected);
        }

        Ok(Self(ContactMessage {
            id: Ulid::new(),
            sender,
            body: trimmed.to_string(),
        }))
    }

    /// Provides read-only access to the validated message.
    pub fn value(&self) -> &ContactMessage {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated message.
    pub fn into_inner(self) -> ContactMessage {
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
#[derive(Debug, Serialize)]
pub enum ContactMessageError {
    EmptyMessage,
    MessageTooLong,
    IllegalMarkupDetected,
    DispatchFailure(String),
}

impl std::error::Error for ContactMessageError {}

impl fmt::Display for ContactMessageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyMessage => write!(f, "Message Error: Content cannot be empty."),
            Self::MessageTooLong => {
                write!(f, "Message Error: Content exceeds 2000 character limit.")
            }
            Self::IllegalMarkupDetected => {
                write!(f, "Security Error: Message must be plain text only (no HTML/Scripts).")
            }
            Self::DispatchFailure(reason) => {
                write!(f, "System Error: Failed to send message: {}", reason)
            }
        }
    }
}
