use crate::types::system::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The stateful environment where an agent operates.
#[derive(Debug)]
pub struct Workspace {
    pub id: UlidNumber,
    pub queue: Arc<RwLock<WorkQueue>>,
    pub usage: WorkspaceUsage,
    pub thinking: ThinkingProcess, // Derived from thinking.rs logic
    pub memory: SearchMemory,      // Derived from search_memory.rs logic
}

/// An immutable, point-in-time snapshot of the Workspace.
/// This is what is passed to the AI to prevent state mutation during "thinking".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceContext {
    pub workspace_id: UlidNumber,
    pub pending_work_count: usize,
    pub current_usage: WorkspaceUsage,
    pub active_thoughts: Vec<TraceReasoning>,
    pub memory_snippets: Vec<String>,
}

// Mock structures for the requested external logic hooks
#[derive(Debug, Clone, Default)]
pub struct ThinkingProcess {
    pub steps: Vec<TraceReasoning>,
}
#[derive(Debug, Clone, Default)]
pub struct SearchMemory {
    pub results: Vec<String>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Workspace {
    /// Async-ready constructor for a fresh workspace.
    pub async fn new(id: UlidNumber, queue_capacity: usize) -> Self {
        let mut memory = SearchMemory::default();
        // Automatically inject global resources on new chat/workspace initialization
        memory.inject_global_resources();

        Self {
            id,
            queue: Arc::new(RwLock::new(WorkQueue::new(queue_capacity))),
            usage: WorkspaceUsage::from(0), // Start with zero tokens
            thinking: ThinkingProcess::default(),
            memory,
        }
    }

    /// The Brain: Distills the current state into a Context snapshot.
    /// This follows the "Async First" rule to allow for locking the queue.
    pub async fn provide_context(&self) -> Result<WorkspaceContext, WorkspaceError> {
        let q = self.queue.read().await;

        let active_thoughts = self.thinking.steps.clone();

        // Proactively generate a suggestion based on memory gaps and push to thoughts
        if let Some(_suggestion) = self.memory.suggest_next_action() {
            // In a real system you might want to create a formal SequenceId for this trace
            // For now, we simulate the proactive check in the context derivation
        }

        Ok(WorkspaceContext {
            workspace_id: self.id,
            pending_work_count: q.len(),
            current_usage: self.usage,
            active_thoughts,
            memory_snippets: self.memory.results.clone(),
        })
    }
}

impl SearchMemory {
    /// Injects required global resource lists so the agent has immediate context
    /// of what essays, records, or responses it can interact with.
    pub fn inject_global_resources(&mut self) {
        let resource_index = "SYSTEM: Uploaded Master Resource Index. Available schemas: [Essays, Records, Challenges, Responses]. Please assess data gaps before proceeding.";
        self.results.push(resource_index.to_string());
    }

    /// Proactively reviews its own data and suggests where gaps exist or what record to update next.
    pub fn suggest_next_action(&self) -> Option<String> {
        if self.results.len() < 3 {
            Some("PROACTIVE SUGGESTION: Context is currently sparse. I recommend querying more related records or researching the topic to fill knowledge gaps before drafting a final response.".to_string())
        } else {
            Some("PROACTIVE SUGGESTION: Sufficient context gathered. We are in a good position to update a record or finalize the essay/response.".to_string())
        }
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

impl Workspace {
    /// Security Gate: Ensures the workspace doesn't exceed its "Token Budget".
    pub fn gatekeep_budget(
        &self,
        limit: ModelLimit,
        daily_limit: u32,
    ) -> Result<(), WorkspaceError> {
        // Logic: Cross-reference current usage with the model's hard limit
        let current = self.usage.value() as u32;
        if current > limit.value() {
            return Err(WorkspaceError::BudgetExhausted {
                limit: limit.value(),
                actual: current,
            });
        }

        // Gatekeep the strictly managed daily token amount set in YAML
        if current > daily_limit {
            return Err(WorkspaceError::DailyBudgetExhausted {
                limit: daily_limit,
                actual: current,
            });
        }
        Ok(())
    }

    /// Integrity Gate: Verifies that the memory state hasn't been corrupted.
    pub fn verify_integrity(&self) -> Result<(), WorkspaceError> {
        if self.thinking.steps.is_empty() && self.usage.value() > 0 {
            // How can we have usage without thoughts?
            return Err(WorkspaceError::InconsistentState);
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
pub enum WorkspaceError {
    #[error("Context Budget Exhausted: limit {limit} tokens, current {actual}")]
    BudgetExhausted { limit: u32, actual: u32 },

    #[error("Daily Token Budget Exhausted (YAML Defined): limit {limit} tokens, current {actual}. Self-regulating usage to prevent overruns.")]
    DailyBudgetExhausted { limit: u32, actual: u32 },

    #[error("Internal Integrity Violation: Workspace state is inconsistent")]
    InconsistentState,

    #[error("Lock Contention: Could not access the WorkQueue in a timely manner")]
    LockFailure,

    #[error("Memory Leak: SearchMemory size exceeds safety threshold")]
    MemoryOverflow,
}

// Support for WorkspaceUsage conversion
impl From<u64> for WorkspaceUsage {
    fn from(v: u64) -> Self {
        // Safety: We assume u64 usage is valid, but logic could be added here
        unsafe { std::mem::transmute(v as u32) } // Simplified for the vibe
    }
}
