use serde::{Deserialize, Serialize};

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Represents a validated PNG image asset.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Picture {
    pub label: String,
    pub blob: PngData, // Enforced Type Safety
    pub dimensions: (u32, u32),
    pub alt_text: String,
}

/// A wrapper type to ensure we only ever hold valid PNG bytes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PngData(pub Vec<u8>);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Picture {
    /// Async-first: Simulates loading an image from a path or buffer.
    pub async fn from_raw(
        label: String,
        raw_bytes: Vec<u8>,
        alt_text: String,
    ) -> Result<Self, PictureError> {
        // Gatekeeper check before construction
        let validated_png = Self::guard_png_integrity(raw_bytes)?;

        // In a real app, you'd use a crate like `image` to extract dims here
        let dimensions = (1024, 1024);

        Ok(Self {
            label,
            blob: validated_png,
            dimensions,
            alt_text,
        })
    }

    pub fn get_bytes(&self) -> &[u8] {
        &self.blob.0
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

impl Picture {
    /// Security Gatekeeping: Validates the PNG Magic Number/Signature.
    /// Standard PNGs must start with: [137, 80, 78, 71, 13, 10, 26, 10]
    fn guard_png_integrity(bytes: Vec<u8>) -> Result<PngData, PictureError> {
        if bytes.len() < 8 {
            return Err(PictureError::InvalidFormat("File too small to be a PNG."));
        }

        let png_signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if &bytes[0..8] != png_signature {
            return Err(PictureError::MimeTypeMismatch(
                "Header mismatch: Not a valid PNG file.",
            ));
        }

        // Additional security: check for huge files to prevent Memory Bombing
        if bytes.len() > 10 * 1024 * 1024 {
            // 10MB limit
            return Err(PictureError::SecurityRisk(
                "Image file size exceeds safety limits.",
            ));
        }

        Ok(PngData(bytes))
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

#[derive(Debug, Clone)]
pub enum PictureError {
    InvalidFormat(&'static str),
    MimeTypeMismatch(&'static str),
    SecurityRisk(&'static str),
    ProcessingFailure,
}

impl std::fmt::Display for PictureError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidFormat(m) => write!(f, "Format Error: {}", m),
            Self::MimeTypeMismatch(m) => write!(f, "Type Mismatch: {}", m),
            Self::SecurityRisk(m) => write!(f, "SECURITY ALERT: {}", m),
            Self::ProcessingFailure => write!(f, "Failed to process image bytes."),
        }
    }
}

impl std::error::Error for PictureError {}
