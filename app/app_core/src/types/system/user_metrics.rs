use serde::{Deserialize, Serialize};

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Metrics related to user behavior and interactions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserMetrics {
    pub session_count: u32,
    pub total_time_spent: u64, // in seconds
    pub engagement_score: f32,
}

impl UserMetrics {
    pub fn new(session_count: u32, total_time_spent: u64, engagement_score: f32) -> Self {
        Self {
            session_count,
            total_time_spent,
            engagement_score,
        }
    }
}
/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security Gatekeeping & Validators)                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE ERRORS                                //
//                         (Error Handling & Edge Cases)                      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/
