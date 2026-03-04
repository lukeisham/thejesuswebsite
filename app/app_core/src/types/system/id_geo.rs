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

/// A 64-bit identifier representing a specific S2 Cell on the Earth.
/// S2 cells are hierarchical: a Level 30 cell is approx 1cm squared.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct S2CellId(u64);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl S2CellId {
    /// Async-ready constructor from raw u64.
    /// In a production vibe, this might involve converting Lat/Lng to S2
    /// via a specialized library.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn from_raw(id: u64) -> Result<S2CellId, GeoError> {
        let instance = Self(id);

        // Delegate to the Gatekeeper for structural validity
        instance.gatekeep_validity()?;

        Ok(instance)
    }

    /// Returns the "Level" of the cell (0 to 30).
    /// The level is determined by the position of the lowest set bit.
    pub fn level(&self) -> u8 {
        let mut l = 30;
        let mut mask = 1u64;
        while l > 0 && (self.0 & mask) == 0 {
            mask <<= 2;
            l -= 1;
        }
        l
    }

    /// Logic: Check if this cell is a child of another cell.
    pub fn is_within(&self, parent: &S2CellId) -> bool {
        // S2 IDs are designed so that children fall within a
        // specific bit-range of the parent.
        self.0 >= parent.0 && self.0 <= parent.0 + self.max_offset(parent.level())
    }

    fn max_offset(&self, level: u8) -> u64 {
        // Bitwise logic for S2 hierarchy ranges
        1u64 << (2 * (30 - level as u64))
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

impl S2CellId {
    /// Security & Integrity Gate:
    /// Validates that the ID is a mathematically valid S2 Cell.
    /// A valid S2 ID always has a '1' bit in one of its 61 lowest positions.
    fn gatekeep_validity(&self) -> Result<(), GeoError> {
        // 1. Structural Check: The face (top 3 bits) must be 0-5.
        let face = self.0 >> 61;
        if face > 5 {
            return Err(GeoError::InvalidFace(face as u8));
        }

        // 2. Sentinel Check: ID cannot be 0.
        if self.0 == 0 {
            return Err(GeoError::ZeroId);
        }

        // 3. Level Check: Must have a trailing '1' bit at an even position.
        if self.0 & 1 == 0 && (self.0.trailing_zeros() % 2 != 0) {
            return Err(GeoError::MalformedBitmask);
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
pub enum GeoError {
    #[error("Invalid S2 Face: {0} (must be 0-5)")]
    InvalidFace(u8),

    #[error("S2 Cell ID cannot be zero")]
    ZeroId,

    #[error("Malformed S2 Bitmask: no sentinel bit found")]
    MalformedBitmask,

    #[error("Out of Bounds: Coordinate is outside the supported planetary projection")]
    PlanetaryBoundsExceeded,
}

impl fmt::Display for S2CellId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "s2:{:016x}", self.0)
    }
}
