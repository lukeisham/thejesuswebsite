
use serde::{Serialize, Deserialize};
use std::fmt;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Disk capacity in bytes. 
/// Using u64 allows us to represent up to 18.4 exabytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct TotalDisk(u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct UsedDisk(u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct RemainingDisk(u64);

/// A point-in-time capture of a specific mount point's storage state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageSnapshot {
    pub mount_path: String,
    pub total: TotalDisk,
    pub used: UsedDisk,
    pub remaining: RemainingDisk,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl StorageSnapshot {
    /// Async-first constructor.
    /// In a real-world vibe, this would call `tokio::fs::read_dir` or 
    /// a wrapped `libc::statvfs` to get live system data.
    pub async fn new(path: &str, total_raw: u64, used_raw: u64) -> Result<Self, StorageError> {
        // Business logic: Ensure the path isn't a ghost
        if path.is_empty() {
            return Err(StorageError::InvalidPath);
        }

        // Delegate validation to the Gatekeeper
        let total = TotalDisk::validate(total_raw)?;
        let used = UsedDisk::validate(used_raw)?;

        // Safety: Prevent underflow if 'used' is reported higher than 'total'
        let remaining_val = total_raw.checked_sub(used_raw)
            .ok_or(StorageError::CapacityExceeded { 
                total: total_raw, 
                used: used_raw 
            })?;

        Ok(Self {
            mount_path: path.to_string(),
            total,
            used,
            remaining: RemainingDisk(remaining_val),
        })
    }

    /// Calculates the "Fill Factor" (0.0 to 1.0)
    pub fn fill_ratio(&self) -> f64 {
        self.used.0 as f64 / self.total.0 as f64
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

impl TotalDisk {
    pub fn validate(bytes: u64) -> Result<Self, StorageError> {
        // Gatekeeper: Reject 0-byte disks (logical impossibility for a server)
        if bytes == 0 {
            return Err(StorageError::ZeroCapacityDisk);
        }
        Ok(Self(bytes))
    }
}

impl UsedDisk {
    pub fn validate(bytes: u64) -> Result<Self, StorageError> {
        // Security Gate: You could implement quotas here
        // e.g., if bytes > MAX_ALLOWED_TENANT_STORAGE { ... }
        Ok(Self(bytes))
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
pub enum StorageError {
    #[error("Invalid storage path provided")]
    InvalidPath,

    #[error("Logical Error: Reported 'Used' ({used} bytes) is greater than 'Total' ({total} bytes)")]
    CapacityExceeded { total: u64, used: u64 },

    #[error("Hardware Reporting Error: Total capacity cannot be zero")]
    ZeroCapacityDisk,

    #[error("IO Timeout: Disk controller failed to respond to statvfs")]
    ControllerTimeout,
}

impl fmt::Display for StorageSnapshot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let to_tb = |b: u64| b as f64 / 1_099_511_627_776.0;
        write!(
            f, 
            "[{}] {:.2}TB / {:.2}TB used", 
            self.mount_path,
            to_tb(self.used.0), 
            to_tb(self.total.0)
        )
    }
}