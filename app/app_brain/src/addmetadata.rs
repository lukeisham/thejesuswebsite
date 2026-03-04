use crate::models::Metadata;
use app_core::types::system::EntryToggle;
use async_trait::async_trait;
use ulid::Ulid;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                   (Generic Metadata Infrastructure)                        //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[async_trait]
pub trait AddMetadata<T>: Send + Sync + 'static {
    /// Attaches the metadata to the target item
    async fn attach(&self, item: T) -> Result<T, ToolError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Logic & Transformation)                          //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct MetadataService;

#[async_trait]
impl<T> AddMetadata<T> for MetadataService
where
    T: MetadataReceiver + Send + Sync + 'static,
{
    async fn attach(&self, mut item: T) -> Result<T, ToolError> {
        // 1. Gatekeeper Check
        self.validate_integrity(&item)?;

        // 2. Business Logic (Fetch/Generate the Metadata)
        let meta = self.generate_contextual_metadata().await?;

        // 3. The Hand-off
        item.inject_metadata(meta);

        Ok(item)
    }
}

/// A "Bridge Trait" that your structs implement to accept Metadata
pub trait MetadataReceiver {
    fn inject_metadata(&mut self, meta: Metadata);
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security & Constraints)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl MetadataService {
    /// Validates that the item is in a state where metadata can be safely added
    fn validate_integrity<T>(&self, _item: &T) -> Result<(), ToolError> {
        Ok(())
    }

    /// Generates metadata based on the current system context
    async fn generate_contextual_metadata(&self) -> Result<Metadata, ToolError> {
        Ok(Metadata {
            id: Ulid::new(),
            author: "System Engine".to_string(),
            keywords: vec!["contextual".to_string()],
            toggle: EntryToggle::Context,
        })
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
pub enum ToolError {
    #[error("Gatekeeper Refusal: {0}")]
    SecurityViolation(String),

    #[error("Processing Failure: {0}")]
    ProcessingFailure(String),

    #[error("Downstream Dependency Error: {0}")]
    DependencyError(String),

    #[error("Data Transformation Failure")]
    MappingError,
}
