use serde::{Deserialize, Serialize};

/// Unified publication states for various domain objects.
/// Defaults to Unpublished to ensure "Secure by Default" behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, Hash)]
pub enum PublicationStatus {
    #[default]
    Unpublished,
    Draft,
    Published,
    Archived,
}
