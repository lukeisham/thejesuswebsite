use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;
use uuid::Uuid;

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

/// The Seven Maps identified by their specific theological/historical focus.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum MapType {
    Galilee,   // Early Galilean ministry
    Jerusalem, // Passion locations
    Judea,     // Life & ministry
    Levant,    // Wider context
    Rome,      // Wider context
    Overview,  // whole map view
}

/// A specific interactive point on a map.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapPoint {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub latitude: f64,
    pub longitude: f64,
    /// Extensible data for specific "vibe" metadata (e.g., "ScriptureRef": "Mark 1:16")
    pub metadata: HashMap<String, String>,
}

/// The base structure for all interactive maps.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveMap {
    pub map_id: Uuid,
    pub label: MapType,
    pub version: u32,
    pub points: Vec<MapPoint>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl InteractiveMap {
    /// Initialize a new map instance.
    /// Async-first: Prepared for use within a tokio/async runtime.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn new(label: MapType) -> Self {
        Self {
            map_id: Uuid::new_v4(),
            label,
            version: 1,
            points: Vec::new(),
        }
    }

    /// Adds a new point to the map.
    /// Follows No-Panic: Returns a Result instead of crashing on bad data.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn add_point(&mut self, point: MapPoint) -> Result<(), MapError> {
        // Gatekeeper Check
        self.validate_point(&point)?;

        self.points.push(point);
        self.version += 1;
        Ok(())
    }

    /// Retrieves a point by ID without cloning the entire list.
    pub fn get_point(&self, id: Uuid) -> Option<&MapPoint> {
        self.points.iter().find(|p| p.id == id)
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

/// Security trait to ensure all map data is "clean" and safe.
pub trait MapSecurity {
    fn validate_point(&self, point: &MapPoint) -> Result<(), MapError>;
}

impl MapSecurity for InteractiveMap {
    /// Strictly validates coordinates and string content to prevent injection or crashes.
    fn validate_point(&self, point: &MapPoint) -> Result<(), MapError> {
        // Coordinate Boundary Gatekeeping
        if !(-90.0..=90.0).contains(&point.latitude) {
            return Err(MapError::InvalidBounds("Latitude must be -90 to 90".into()));
        }
        if !(-180.0..=180.0).contains(&point.longitude) {
            return Err(MapError::InvalidBounds("Longitude must be -180 to 180".into()));
        }

        // Content Gatekeeping
        if point.title.is_empty() {
            return Err(MapError::SecurityViolation("Title cannot be empty".into()));
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
pub enum MapError {
    InvalidBounds(String),
    SecurityViolation(String),
    PointNotFound(Uuid),
    StorageFailure,
}

impl fmt::Display for MapError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidBounds(msg) => write!(f, "Boundary Error: {}", msg),
            Self::SecurityViolation(msg) => write!(f, "Security Violation: {}", msg),
            Self::PointNotFound(id) => write!(f, "Point {} not found", id),
            Self::StorageFailure => write!(f, "Failed to persist map data"),
        }
    }
}

impl std::error::Error for MapError {}
