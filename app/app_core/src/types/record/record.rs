use crate::types::jesus::{Classification, ContentEntry, InteractiveMap, TimelineEntry};
use crate::types::system::{BibleVerse, Metadata, Source};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
pub struct Record {
    pub id: Ulid,
    pub metadata: Metadata, // Must also derive Serialize/Deserialize
    pub name: String,
    pub picture_bytes: Vec<u8>, // Standard JSON will make this a [u8] array
    pub description: Vec<String>,
    pub bibliography: Vec<Source>, // Must also derive Serialize/Deserialize
    pub timeline: TimelineEntry,
    pub map_data: InteractiveMap,
    pub category: Classification,
    pub content: ContentEntry,
    pub primary_verse: BibleVerse,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary_verse: Option<BibleVerse>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Record {
    /// **CRITICAL: SCHEMA VERSIONING**
    /// The `Record` struct is the absolute source of truth for the entire application.
    /// Any change to this struct mandates a version bump to this `SCHEMA_VERSION` constant,
    /// a corresponding SQL/ChromaDB migration script, and an update to `agent_guide.yml`.
    /// NEVER change the struct fields without explicitly updating this version.
    pub const SCHEMA_VERSION: &'static str = "1.1.0";

    /// Retrieves the current schema version of the Record struct.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn schema_version() -> String {
        Self::SCHEMA_VERSION.to_string()
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_new(
        metadata: Metadata,
        name: String,
        picture_bytes: Vec<u8>,
        description: Vec<String>,
        bibliography: Vec<Source>,
        timeline: TimelineEntry,
        map_data: InteractiveMap,
        category: Classification,
        content: ContentEntry,
        primary_verse: BibleVerse,
        secondary_verse: Option<BibleVerse>,
    ) -> Result<Self, RecordError> {
        RecordGatekeeper::validate_name(&name)?;
        RecordGatekeeper::validate_image_format(&picture_bytes)?;
        RecordGatekeeper::validate_description(&description)?;

        Ok(Self {
            id: Ulid::new(),
            metadata,
            name: name.trim().to_string(),
            picture_bytes,
            description,
            bibliography,
            timeline,
            map_data,
            category,
            content,
            primary_verse,
            secondary_verse,
            created_at: Utc::now(),
            updated_at: None,
        })
    }

    /// Converts the record to a JSON string. No-Panic: returns Result.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn to_json(&self) -> Result<String, RecordError> {
        serde_json::to_string(self)
            .map_err(|e| RecordError::SystemError(format!("JSON Serialization failed: {}", e)))
    }

    /// Creates a record from a JSON string.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn from_json(json: &str) -> Result<Self, RecordError> {
        serde_json::from_str(json)
            .map_err(|e| RecordError::SystemError(format!("JSON Deserialization failed: {}", e)))
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

pub struct RecordGatekeeper;

impl RecordGatekeeper {
    /// Validates the name is not empty and respects the "short string" vibe (max 80 chars).
    pub fn validate_name(name: &str) -> Result<(), RecordError> {
        let len = name.trim().len();
        if len == 0 {
            return Err(RecordError::InvalidName("Name cannot be empty.".into()));
        }
        if len > 80 {
            return Err(RecordError::InvalidName("Name exceeds the 80 character limit.".into()));
        }
        Ok(())
    }

    /// Security: Verifies the "Magic Bytes" (89 50 4E 47 0D 0A 1A 0A) of a PNG file.
    /// This prevents non-image data from masquerading as a picture in our JSON.
    pub fn validate_image_format(bytes: &[u8]) -> Result<(), RecordError> {
        const PNG_HEADER: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

        if bytes.len() < 8 {
            return Err(RecordError::InvalidImage("File too small to be a PNG.".into()));
        }

        if bytes[0..8] != PNG_HEADER {
            return Err(RecordError::InvalidImage("File header mismatch: Not a valid PNG.".into()));
        }
        Ok(())
    }

    /// Ensures the description isn't empty and that no single line is an oversized buffer.
    pub fn validate_description(lines: &[String]) -> Result<(), RecordError> {
        if lines.is_empty() {
            return Err(RecordError::InvalidDescription(
                "Description must contain at least one line.".into(),
            ));
        }

        if lines.iter().any(|line| line.trim().len() > 1000) {
            return Err(RecordError::InvalidDescription(
                "Description line exceeds 1000 character safety limit.".into(),
            ));
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
#[derive(Debug, Serialize, Deserialize)] // Added Deserialize for full JSON-friendliness
pub enum RecordError {
    InvalidName(String),
    InvalidImage(String),
    InvalidDescription(String),
    SystemError(String),
}

impl std::fmt::Display for RecordError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidName(m) => write!(f, "Record Name Error: {}", m),
            Self::InvalidImage(m) => write!(f, "Record Media Error: {}", m),
            Self::InvalidDescription(m) => write!(f, "Record Content Error: {}", m),
            Self::SystemError(m) => write!(f, "Record Critical Error: {}", m),
        }
    }
}

impl std::error::Error for RecordError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_version_is_documented() {
        // This test acts as a tripwire. If you modify the Record struct fields,
        // you MUST update the SCHEMA_VERSION, the SQL database schema, and the agent_guide.yml!
        assert_eq!(Record::SCHEMA_VERSION, "1.1.0");
        assert_eq!(Record::schema_version(), "1.1.0");
    }
}
