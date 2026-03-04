use serde::{Deserialize, Serialize};

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BigIdea {
    pub title: String,
    pub description: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl BigIdea {
    /// Async-ready constructor for a new Big Idea entry.
    pub async fn new(title: String, description: String) -> Self {
        Self {
            title: title.trim().to_string(),
            description: description.trim().to_string(),
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

impl BigIdea {
    pub fn validate(&self) -> Result<(), BigIdeaError> {
        if self.title.is_empty() {
            return Err(BigIdeaError::EmptyTitle);
        }
        if self.description.is_empty() {
            return Err(BigIdeaError::EmptyDescription);
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

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum BigIdeaError {
    #[error("Big Idea title cannot be empty")]
    EmptyTitle,

    #[error("Big Idea description cannot be empty")]
    EmptyDescription,
}
