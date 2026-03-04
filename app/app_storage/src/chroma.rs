use app_core::types::blog_and_news::blog::BlogPost;
use app_core::types::essays_and_ranks::essay::Essay;
use app_core::types::essays_and_ranks::response::Response;
use app_core::types::record::record::Record;
use app_core::types::system::{AppError, Picture};
use app_core::types::traits::InferenceEngine;
use chromadb::client::ChromaClient;
use chromadb::collection::{CollectionEntries, QueryOptions};
use std::sync::Arc;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                              1. THE SKELETON                               //
//                          (Config & Collection Names)                        //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Configuration for the ChromaDB vector store connection.
pub struct ChromaConfig {
    pub url: String,
    pub collection_name: String,
    pub database: Option<String>,
}

/// The five ChromaDB collections — one per semantic data type.
/// These store unstructured, text-heavy data that benefits from
/// vector similarity search (embeddings).
pub struct ChromaCollections;

impl ChromaCollections {
    pub const ESSAYS: &'static str = "essays";
    pub const RECORDS: &'static str = "records";
    pub const RESPONSES: &'static str = "responses";
    pub const PICTURES: &'static str = "pictures";
    pub const BLOG_POSTS: &'static str = "blog_posts";
}

/// The ChromaDB storage engine. Holds the client connection and the
/// embedding model used to vectorise text before storage/query.
pub struct ChromaStorage {
    client: ChromaClient,
    engine: Arc<dyn InferenceEngine>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Storage & Search Logic)                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl ChromaStorage {
    /// Creates a new ChromaStorage instance.
    pub async fn new(
        config: Arc<ChromaConfig>,
        engine: Arc<dyn InferenceEngine>,
    ) -> Result<Self, AppError> {
        let client = ChromaClient::new(chromadb::client::ChromaClientOptions {
            url: Some(config.url.clone()),
            database: config.database.as_deref().unwrap_or("default").to_string(),
            auth: chromadb::client::ChromaAuthMethod::None,
        })
        .await
        .map_err(|e| AppError::StorageError(e.to_string()))?;

        Ok(Self { client, engine })
    }

    // ── ESSAYS ───────────────────────────────────────────────────────────

    /// Stores an essay in the "essays" collection.
    /// The essay text is embedded and the metadata id is used as the document key.
    pub async fn store_essay(&self, essay: &Essay) -> Result<(), AppError> {
        let vector = self.engine.embed_text(&essay.text).await?;
        let id_str = essay.metadata.id.to_string();

        let entries = CollectionEntries {
            ids: vec![id_str.as_str()],
            embeddings: Some(vec![vector]),
            metadatas: None,
            documents: Some(vec![&essay.text]),
        };

        let collection = self
            .client
            .get_collection(ChromaCollections::ESSAYS)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        collection
            .upsert(entries, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Semantic search across essays.
    pub async fn query_essays(&self, query_text: &str) -> Result<Vec<String>, AppError> {
        self.query_collection(ChromaCollections::ESSAYS, query_text)
            .await
    }

    // ── RECORDS ──────────────────────────────────────────────────────────

    /// Stores a record in the "records" collection.
    /// Uses the record description (joined) as the searchable text.
    pub async fn store_record(&self, record: &Record) -> Result<(), AppError> {
        let searchable_text = format!("{} {}", record.name, record.description.join(" "));
        let vector = self.engine.embed_text(&searchable_text).await?;
        let id_str = record.id.to_string();

        let entries = CollectionEntries {
            ids: vec![id_str.as_str()],
            embeddings: Some(vec![vector]),
            metadatas: None,
            documents: Some(vec![&searchable_text]),
        };

        let collection = self
            .client
            .get_collection(ChromaCollections::RECORDS)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        collection
            .upsert(entries, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Semantic search across records.
    pub async fn query_records(&self, query_text: &str) -> Result<Vec<String>, AppError> {
        self.query_collection(ChromaCollections::RECORDS, query_text)
            .await
    }

    // ── RESPONSES ────────────────────────────────────────────────────────

    /// Stores a response in the "responses" collection.
    pub async fn store_response(&self, response: &Response) -> Result<(), AppError> {
        let searchable_text = format!("{} {}", response.title, response.text);
        let vector = self.engine.embed_text(&searchable_text).await?;
        let id_str = response.metadata.id.to_string();

        let entries = CollectionEntries {
            ids: vec![id_str.as_str()],
            embeddings: Some(vec![vector]),
            metadatas: None,
            documents: Some(vec![&searchable_text]),
        };

        let collection = self
            .client
            .get_collection(ChromaCollections::RESPONSES)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        collection
            .upsert(entries, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Semantic search across responses.
    pub async fn query_responses(&self, query_text: &str) -> Result<Vec<String>, AppError> {
        self.query_collection(ChromaCollections::RESPONSES, query_text)
            .await
    }

    // ── PICTURES ─────────────────────────────────────────────────────────

    /// Stores a picture in the "pictures" collection.
    /// The label + alt_text form the searchable text; the raw PNG bytes
    /// are NOT embedded — only the descriptive text is vectorised.
    pub async fn store_picture(&self, picture: &Picture) -> Result<(), AppError> {
        let searchable_text = format!("{} {}", picture.label, picture.alt_text);
        let vector = self.engine.embed_text(&searchable_text).await?;

        let filename = if picture.label.ends_with(".png") {
            picture.label.clone()
        } else {
            format!("{}.png", picture.label)
        };
        let relative_path = format!("/assets/images/{}", filename);

        let mut metadata = serde_json::Map::new();
        metadata.insert("file_path".to_string(), serde_json::Value::String(relative_path));

        let entries = CollectionEntries {
            ids: vec![&picture.label],
            embeddings: Some(vec![vector]),
            metadatas: Some(vec![metadata]),
            documents: Some(vec![&searchable_text]),
        };

        let collection = self
            .client
            .get_collection(ChromaCollections::PICTURES)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        collection
            .upsert(entries, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Semantic search for pictures by description or label.
    pub async fn query_pictures(&self, query_text: &str) -> Result<Vec<String>, AppError> {
        self.query_collection(ChromaCollections::PICTURES, query_text)
            .await
    }

    // ── BLOG POSTS ───────────────────────────────────────────────────────

    /// Stores a blog post in the "blog_posts" collection.
    pub async fn store_blog_post(&self, post: &BlogPost) -> Result<(), AppError> {
        let searchable_text = format!("{} {}", post.title, post.content);
        let vector = self.engine.embed_text(&searchable_text).await?;
        let id_str = post.id.0.to_string();

        let entries = CollectionEntries {
            ids: vec![id_str.as_str()],
            embeddings: Some(vec![vector]),
            metadatas: None,
            documents: Some(vec![&searchable_text]),
        };

        let collection = self
            .client
            .get_collection(ChromaCollections::BLOG_POSTS)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        collection
            .upsert(entries, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Semantic search across blog posts.
    pub async fn query_blog_posts(&self, query_text: &str) -> Result<Vec<String>, AppError> {
        self.query_collection(ChromaCollections::BLOG_POSTS, query_text)
            .await
    }

    // ── SHARED QUERY LOGIC ──────────────────────────────────────────────

    /// Generalized semantic search against any collection.
    /// Returns the IDs of the top-10 matching documents.
    async fn query_collection(
        &self,
        collection_name: &str,
        query_text: &str,
    ) -> Result<Vec<String>, AppError> {
        let query_vector = self.engine.embed_text(query_text).await?;

        let options = QueryOptions {
            query_texts: None,
            query_embeddings: Some(vec![query_vector]),
            n_results: Some(10),
            where_metadata: None,
            where_document: None,
            include: None,
        };

        let collection = self
            .client
            .get_collection(collection_name)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        let results = collection
            .query(options, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        if results.ids.is_empty() || results.ids[0].is_empty() {
            return Ok(Vec::new());
        }

        Ok(results.ids[0].clone())
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               3. THE HELPER                                //
//                           (Mock Engine for Testing)                        //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A zero-cost mock embedding engine for unit tests.
/// Returns a fixed-dimension vector of zeros — no network, no model weights.
pub struct MockEngine {
    dimensions: usize,
}

impl MockEngine {
    pub fn new(dimensions: usize) -> Self {
        Self { dimensions }
    }
}

#[async_trait::async_trait]
impl InferenceEngine for MockEngine {
    async fn embed_text(&self, _text: &str) -> Result<Vec<f32>, AppError> {
        Ok(vec![0.0_f32; self.dimensions])
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               5. UNIT TESTS                                //
//          MockInferenceEngine replaces ChromaDB/OpenAI for unit tests       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg(test)]
mod tests {
    use super::*;
    use app_core::types::traits::InferenceEngine;
    use std::sync::Arc;

    // ── ChromaCollections constants ───────────────────────────────────────────

    #[test]
    fn collection_names_are_correct() {
        assert_eq!(ChromaCollections::ESSAYS, "essays");
        assert_eq!(ChromaCollections::RECORDS, "records");
        assert_eq!(ChromaCollections::RESPONSES, "responses");
        assert_eq!(ChromaCollections::PICTURES, "pictures");
        assert_eq!(ChromaCollections::BLOG_POSTS, "blog_posts");
    }

    // ── ChromaConfig construction ─────────────────────────────────────────────

    #[test]
    fn chroma_config_stores_url_and_collection() {
        let config = ChromaConfig {
            url: "http://localhost:8000".to_string(),
            collection_name: "essays".to_string(),
            database: None,
        };
        assert_eq!(config.url, "http://localhost:8000");
        assert_eq!(config.collection_name, "essays");
        assert!(config.database.is_none());
    }

    #[test]
    fn chroma_config_supports_optional_database() {
        let config = ChromaConfig {
            url: "http://chroma:8000".to_string(),
            collection_name: "records".to_string(),
            database: Some("production".to_string()),
        };
        assert_eq!(config.database.unwrap(), "production");
    }

    // ── MockEngine — validates the mock itself ────────────────────────────────

    #[tokio::test]
    async fn mock_engine_returns_correct_dimension() {
        let engine = MockEngine::new(1536);
        let result = engine
            .embed_text("the resurrection of Jesus")
            .await
            .unwrap();
        assert_eq!(result.len(), 1536);
    }

    #[tokio::test]
    async fn mock_engine_returns_zeros() {
        let engine = MockEngine::new(4);
        let result = engine.embed_text("test").await.unwrap();
        assert_eq!(result, vec![0.0, 0.0, 0.0, 0.0]);
    }

    #[tokio::test]
    async fn mock_engine_accepts_empty_text() {
        let engine = MockEngine::new(8);
        let result = engine.embed_text("").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn mock_engine_via_arc_trait_object() {
        // Validates the Arc<dyn InferenceEngine> pattern used by ChromaStorage
        let engine: Arc<dyn InferenceEngine> = Arc::new(MockEngine::new(768));
        let embedding = engine.embed_text("Josephus").await.unwrap();
        assert_eq!(embedding.len(), 768);
    }
}
