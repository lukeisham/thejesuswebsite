use crate::types::system::AppError;
use async_trait::async_trait;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                           (Trait Declarations)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A universal contract for generating semantic embeddings.
/// This allows `app_storage` to request vectors without knowing about BERT or Candle.
#[async_trait]
pub trait InferenceEngine: Send + Sync {
    /// Generate a vector embedding for the provided text.
    async fn embed_text(&self, text: &str) -> Result<Vec<f32>, AppError>;
}
