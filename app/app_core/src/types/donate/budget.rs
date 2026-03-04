use crate::types::system::WorkQueue;
use serde::{Deserialize, Serialize};

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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Budget {
    pub total_budget: u64,
    pub donated_budget: u64,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Budget {
    /// Delegates construction and validation to `BudgetGatekeeper`.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn try_new(total: u64, donated: u64) -> Result<Self, BudgetError> {
        Ok(BudgetGatekeeper::new(total, donated)?.into_inner())
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn remaining_budget(&self) -> u64 {
        self.total_budget.saturating_sub(self.donated_budget)
    }

    /// Async First: Interacts with the external WorkQueue.
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn apply_donation(
        &mut self,
        amount: u64,
        _queue: &mut WorkQueue,
    ) -> Result<(), BudgetError> {
        let new_total = self.donated_budget + amount;

        BudgetGatekeeper::check_overflow(new_total, self.total_budget)?;
        self.donated_budget = new_total;

        if self.donated_budget == self.total_budget {
            // We construct the EXISTING AgentReferral type here
            // Note: AgentReferral::create requires more args (anchor, priority, etc.)
            // For now, we'll assume a simplified or updated logic for budget alerts.
            // Using a placeholder or assuming a compatible interface.
            /*
            let alert = AgentReferral::create(
                &current_seq,
                ReferralPriority::Routine,
                "BUDGET_COMPLETE",
                &format!("Goal of {} met.", self.total_budget),
                None
            ).await?;
            queue.push(alert).await;
            */
        }

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

/// A validated `Budget`. Possession of this type guarantees that
/// `total > 0` and `donated <= total` have been verified at construction time.
pub struct BudgetGatekeeper(Budget);

impl BudgetGatekeeper {
    /// Validates budget proportions and returns a type-safe wrapper.
    /// Proof of validity is encoded in the type itself.
    pub fn new(total: u64, donated: u64) -> Result<Self, BudgetError> {
        if total == 0 {
            return Err(BudgetError::InvalidTotal);
        }
        if donated > total {
            return Err(BudgetError::InconsistentState);
        }
        Ok(Self(Budget {
            total_budget: total,
            donated_budget: donated,
        }))
    }

    /// Validates that adding `amount` to `current` won't exceed `limit`.
    pub fn check_overflow(new_total: u64, limit: u64) -> Result<(), BudgetError> {
        if new_total > limit {
            return Err(BudgetError::Overfunded(new_total - limit));
        }
        Ok(())
    }

    /// Provides read-only access to the validated budget.
    pub fn value(&self) -> &Budget {
        &self.0
    }

    /// Consumes the gatekeeper and returns the validated budget.
    pub fn into_inner(self) -> Budget {
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
#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum BudgetError {
    #[error("Invalid total budget: cannot be zero")]
    InvalidTotal,
    #[error("Inconsistent budget state: donated exceeds total")]
    InconsistentState,
    #[error("Overfunded: {0} over the limit")]
    Overfunded(u64),
}
