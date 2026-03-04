
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

/// Memory measured in bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct TotalRam(u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct UsedRam(u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct RemainingRam(u64);

/// The composite state of a server's memory bank.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RamSnapshot {
    pub total: TotalRam,
    pub used: UsedRam,
    pub remaining: RemainingRam,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl RamSnapshot {
    /// Async-ready constructor to sample system memory.
    /// Logic: Remaining = Total - Used.
    pub async fn calculate(total: u64, used: u64) -> Result<Self, RamError> {
        // The Brain delegates to the Gatekeeper for safety
        let total_t = TotalRam::new(total)?;
        let used_t = UsedRam::new(used)?;
        
        // Logical check: You can't use more than you have
        let remaining_val = total.checked_sub(used)
            .ok_or(RamError::MemoryAccountingViolation { total, used })?;

        Ok(Self {
            total: total_t,
            used: used_t,
            remaining: RemainingRam(remaining_val),
        })
    }

    /// Returns usage percentage as a float 0.0 - 100.0
    pub fn usage_percentage(&self) -> f64 {
        (self.used.0 as f64 / self.total.0 as f64) * 100.0
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

impl TotalRam {
    pub fn new(bytes: u64) -> Result<Self, RamError> {
        // Gatekeeper: A server with 0 RAM is logically impossible/invalid here
        if bytes == 0 {
            return Err(RamError::InvalidPhysicalCapacity);
        }
        Ok(Self(bytes))
    }
}

impl UsedRam {
    pub fn new(bytes: u64) -> Result<Self, RamError> {
        // Used RAM can be 0, but we provide a hook for future limits
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
pub enum RamError {
    #[error("Physical capacity cannot be zero")]
    InvalidPhysicalCapacity,

    #[error("Memory Accounting Violation: Used ({used} bytes) exceeds Total ({total} bytes)")]
    MemoryAccountingViolation { total: u64, used: u64 },

    #[error("Hardware Telemetry Timeout: Failed to read /proc/meminfo")]
    ReadFailure,
}

impl fmt::Display for RamSnapshot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let to_gb = |b: u64| b as f64 / 1_073_741_824.0;
        write!(
            f, 
            "RAM: {:.2}GB / {:.2}GB used ({:.2}GB free)", 
            to_gb(self.used.0), 
            to_gb(self.total.0), 
            to_gb(self.remaining.0)
        )
    }
}
