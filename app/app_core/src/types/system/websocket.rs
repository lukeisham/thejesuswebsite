use crate::types::system::SequenceId;
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

/// The type of message carried over the WebSocket wire.
/// Kept `Copy`-able so it can be passed cheaply through async tasks.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WsMessageKind {
    /// A UTF-8 text payload (e.g., JSON commands).
    Text,
    /// Raw binary payload (e.g., protobuf or CBOR).
    Binary,
    /// A keep-alive ping from either side.
    Ping,
    /// A keep-alive pong from either side.
    Pong,
    /// Graceful close signal.
    Close,
}

/// A single message travelling over a WebSocket connection.
/// This is the canonical in-memory representation — WASM-safe and serialisable
/// so the frontend can inspect it without any server-side coupling.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketMessage {
    /// Monotonic position of this message in the session timeline.
    pub anchor: SequenceId,
    /// What flavour the payload is.
    pub kind: WsMessageKind,
    /// The raw payload. Empty for Ping / Pong / Close frames.
    pub payload: Vec<u8>,
}

/// A lightweight token representing a pending WebSocket upgrade request.
/// Carries only the metadata needed to decide whether to accept the handshake;
/// the actual socket handle lives server-side and is never passed to WASM.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketUpgradeRequest {
    /// Unique ID for correlating the upgrade with a session.
    pub session_id: String,
    /// Client-supplied sub-protocol names (e.g., `["jesus-v1"]`).
    pub requested_protocols: Vec<String>,
    /// Whether the client supplied a valid `Origin` header.
    pub origin_verified: bool,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl WebSocketMessage {
    /// Construct a new text-flavoured message at the next sequence position.
    pub async fn new_text(prev: &SequenceId, text: &str) -> Result<Self, WebSocketError> {
        Self::gatekeep_payload_size(text.as_bytes())?;

        let anchor = prev
            .next()
            .await
            .map_err(|_| WebSocketError::TimelineDisruption)?;

        Ok(Self {
            anchor,
            kind: WsMessageKind::Text,
            payload: text.as_bytes().to_vec(),
        })
    }

    /// Construct a new binary-flavoured message at the next sequence position.
    pub async fn new_binary(prev: &SequenceId, data: Vec<u8>) -> Result<Self, WebSocketError> {
        Self::gatekeep_payload_size(&data)?;

        let anchor = prev
            .next()
            .await
            .map_err(|_| WebSocketError::TimelineDisruption)?;

        Ok(Self {
            anchor,
            kind: WsMessageKind::Binary,
            payload: data,
        })
    }

    /// Convenience: attempt to read the payload as UTF-8 text.
    pub fn as_text(&self) -> Result<&str, WebSocketError> {
        std::str::from_utf8(&self.payload).map_err(|_| WebSocketError::NonUtf8Payload)
    }

    /// Returns `true` if this message is a control frame (Ping/Pong/Close).
    pub fn is_control(&self) -> bool {
        matches!(self.kind, WsMessageKind::Ping | WsMessageKind::Pong | WsMessageKind::Close)
    }
}

impl WebSocketUpgradeRequest {
    /// Build an upgrade request from raw header data.
    pub fn new(
        session_id: &str,
        requested_protocols: Vec<String>,
        origin_verified: bool,
    ) -> Result<Self, WebSocketError> {
        Self::gatekeep_session_id(session_id)?;

        Ok(Self {
            session_id: session_id.to_string(),
            requested_protocols,
            origin_verified,
        })
    }

    /// Returns the first mutually agreed sub-protocol, if any.
    pub fn negotiate_protocol<'a>(&'a self, supported: &'a [&str]) -> Option<&'a str> {
        self.requested_protocols
            .iter()
            .find(|p| supported.contains(&p.as_str()))
            .map(|p| p.as_str())
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

impl WebSocketMessage {
    /// Security Gate: Enforces a hard cap on payload size (1 MiB).
    /// Prevents memory exhaustion if an adversarial client sends huge frames.
    fn gatekeep_payload_size(data: &[u8]) -> Result<(), WebSocketError> {
        const MAX_BYTES: usize = 1_048_576; // 1 MiB
        if data.len() > MAX_BYTES {
            return Err(WebSocketError::PayloadTooLarge {
                actual: data.len(),
                limit: MAX_BYTES,
            });
        }
        Ok(())
    }
}

impl WebSocketUpgradeRequest {
    /// Security Gate: Validates the session ID format.
    /// Rejects empty strings or IDs that are suspiciously long (possible injection).
    fn gatekeep_session_id(id: &str) -> Result<(), WebSocketError> {
        if id.trim().is_empty() {
            return Err(WebSocketError::MissingSessionId);
        }
        if id.len() > 256 {
            return Err(WebSocketError::SessionIdTooLong(id.len()));
        }
        // Restrict to URL-safe characters to prevent header injection.
        if !id
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
        {
            return Err(WebSocketError::InvalidSessionIdFormat);
        }
        Ok(())
    }

    /// Security Gate: Rejects the handshake if the `Origin` was not verified.
    /// Call this before allowing the upgrade to proceed.
    pub fn assert_origin_verified(&self) -> Result<(), WebSocketError> {
        if !self.origin_verified {
            return Err(WebSocketError::UnverifiedOrigin);
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
pub enum WebSocketError {
    #[error("Payload too large: {actual} bytes exceeds the {limit}-byte safety limit")]
    PayloadTooLarge { actual: usize, limit: usize },

    #[error("Payload is not valid UTF-8")]
    NonUtf8Payload,

    #[error("Timeline disruption: could not establish a valid SequenceId anchor")]
    TimelineDisruption,

    #[error("Security Violation: WebSocket upgrade rejected — Origin header not verified")]
    UnverifiedOrigin,

    #[error("Session ID is missing or blank")]
    MissingSessionId,

    #[error("Session ID is too long: {0} chars (max 256)")]
    SessionIdTooLong(usize),

    #[error("Session ID contains invalid characters (alphanumeric, '-', '_' only)")]
    InvalidSessionIdFormat,

    #[error("Handshake Error: No mutually supported sub-protocol found")]
    NoMatchingProtocol,
}

impl fmt::Display for WebSocketMessage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "WsMsg[{}] {:?} ({} bytes)", self.anchor, self.kind, self.payload.len())
    }
}

impl fmt::Display for WebSocketUpgradeRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "WsUpgrade[{}] protocols={:?} origin_ok={}",
            self.session_id, self.requested_protocols, self.origin_verified
        )
    }
}
