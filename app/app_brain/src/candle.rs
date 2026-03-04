use anyhow::{Error, Result};
use candle_core::{DType, Device, Tensor};
use candle_transformers::models::bert::{BertModel, Config};
use tokenizers::Tokenizer;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                           (Data Types & Schema)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The primary AI engine for generating text embeddings.
/// Uses the BERT architecture via the Candle ML framework.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct CandleEngine {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Inference & Logic)                               //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl CandleEngine {
    /// Initialize a new BERT engine with provided weights and config.
    /// Performs device auto-detection (Metal -> CPU).
    pub fn try_new(
        config_bytes: &[u8],
        tokenizer_bytes: &[u8],
        weights_bytes: &[u8],
    ) -> Result<Self> {
        // Step 1 — Gatekeeper: Auto-detect the best available hardware.
        #[cfg(not(target_arch = "wasm32"))]
        let device = match Device::new_metal(0) {
            Ok(d) => d,
            _ => Device::Cpu,
        };

        #[cfg(target_arch = "wasm32")]
        let device = Device::Cpu;

        // Step 2 — Configuration: Parse BERT config and tokenizer.
        let config: Config = serde_json::from_slice(config_bytes)?;
        let tokenizer = Tokenizer::from_bytes(tokenizer_bytes).map_err(Error::msg)?;

        // Step 3 — Weights: Buffering model into memory.
        // We use the bytes slice directly to avoid redundant clones.
        let vb =
            VarBuilder::from_buffered_safetensors(weights_bytes.to_vec(), DType::F32, &device)?;
        let model = BertModel::load(vb, &config)?;

        Ok(Self {
            model,
            tokenizer,
            device,
        })
    }

    /// Generate a mean-pooled embedding for a piece of text.
    /// This embedding is suitable for vector search and semantic similarity.
    pub fn embed(&self, text: &str) -> Result<Vec<f32>> {
        // Step 1: Tokenisation
        let tokens = self.tokenizer.encode(text, true).map_err(Error::msg)?;
        let token_ids = tokens.get_ids();
        let token_type_ids = tokens.get_type_ids();
        let mask = tokens.get_attention_mask();

        // Step 2: Tensor Preparation
        let input_ids = Tensor::new(token_ids, &self.device)?.unsqueeze(0)?;
        let token_type_ids = Tensor::new(token_type_ids, &self.device)?.unsqueeze(0)?;
        let attention_mask = Tensor::new(mask, &self.device)?.unsqueeze(0)?;

        // Step 3: Forward Pass (BERT Inference)
        // Passing the attention mask is critical for accurate pooling of variable-length input.
        let ys = self
            .model
            .forward(&input_ids, &token_type_ids, Some(&attention_mask))?;

        // Step 4: Mean Pooling
        // Reduce the sequence dimension (dim 1) to derive a single fixed-length vector.
        let (_n_batch, n_seq, _n_emb) = ys.dims3()?;
        let embeddings = (ys.sum(1)? / (n_seq as f64))?;
        let result = embeddings.flatten_all()?.to_vec1::<f32>()?;

        Ok(result)
    }
}

use app_core::types::system::AppError;
use app_core::types::traits::InferenceEngine;
use async_trait::async_trait;

#[async_trait]
impl InferenceEngine for CandleEngine {
    async fn embed_text(&self, text: &str) -> Result<Vec<f32>, AppError> {
        self.embed(text)
            .map_err(|e| AppError::InferenceError(e.to_string()))
    }
}

use candle_nn::VarBuilder;
