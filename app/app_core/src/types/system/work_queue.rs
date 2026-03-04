use crate::types::system::*;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// An atomic unit of work in the system.
/// Wraps both directions of communication into a single unified type.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorkItem {
    User(HumanRequest),
    Agent(AgentReferral),
}

/// A prioritized, capacity-limited queue for parked tasks.
/// Uses VecDeque for efficient front-of-queue "actioning".
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkQueue {
    items: VecDeque<WorkItem>,
    max_capacity: usize,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl WorkQueue {
    /// Initialize a new queue with a specific safety ceiling.
    pub fn new(max_capacity: usize) -> Self {
        Self {
            items: VecDeque::with_capacity(max_capacity),
            max_capacity,
        }
    }

    /// Async-ready entry point to park a new item.
    pub async fn park(&mut self, item: WorkItem) -> Result<(), QueueError> {
        // Delegate to the Gatekeeper before modifying state
        self.gatekeep_capacity()?;
        self.gatekeep_redundancy(&item)?;

        self.items.push_back(item);
        Ok(())
    }

    /// Async-ready entry point to "action" (consume) the next item.
    /// Follows FIFO (First-In, First-Out) logic.
    pub async fn action_next(&mut self) -> Result<WorkItem, QueueError> {
        self.items.pop_front().ok_or(QueueError::EmptyQueue)
    }

    /// Returns the SequenceId of the item currently at the front of the queue.
    pub fn peek_anchor(&self) -> Option<SequenceId> {
        self.items.front().map(|item| match item {
            WorkItem::User(req) => req.anchor,
            WorkItem::Agent(ref_msg) => ref_msg.anchor,
        })
    }

    pub fn len(&self) -> usize {
        self.items.len()
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

impl WorkQueue {
    /// Security Gate: Prevents the queue from growing infinitely and
    /// consuming all available Server RAM.
    fn gatekeep_capacity(&self) -> Result<(), QueueError> {
        if self.items.len() >= self.max_capacity {
            return Err(QueueError::QueueFull {
                limit: self.max_capacity,
            });
        }
        Ok(())
    }

    /// Integrity Gate: Ensures we don't park the exact same SequenceId twice.
    fn gatekeep_redundancy(&self, new_item: &WorkItem) -> Result<(), QueueError> {
        let new_id = match new_item {
            WorkItem::User(r) => r.anchor,
            WorkItem::Agent(a) => a.anchor,
        };

        if self.items.iter().any(|item| {
            let existing_id = match item {
                WorkItem::User(r) => r.anchor,
                WorkItem::Agent(a) => a.anchor,
            };
            existing_id == new_id
        }) {
            return Err(QueueError::DuplicateSequence(new_id));
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
pub enum QueueError {
    #[error("Queue capacity reached: limit of {limit} items")]
    QueueFull { limit: usize },

    #[error("No work items available to action")]
    EmptyQueue,

    #[error("Integrity Violation: Item with SequenceId {0} is already parked")]
    DuplicateSequence(SequenceId),

    #[error("Processing Failure: Work item was corrupted during parking")]
    ItemCorruption,
}

impl std::fmt::Display for WorkQueue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "WorkQueue: {}/{} items parked",
            self.items.len(),
            self.max_capacity
        )
    }
}
