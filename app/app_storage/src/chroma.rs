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
    client: Option<ChromaClient>,
    engine: Arc<dyn InferenceEngine>,
}

impl ChromaStorage {
    /// Connects to a ChromaDB instance and returns a new storage instance.
    pub async fn connect(config: &ChromaConfig, engine: Arc<dyn InferenceEngine>) -> Self {
        use chromadb::client::ChromaClientOptions;
        let client_res = ChromaClient::new(ChromaClientOptions {
            url: Some(config.url.clone()),
            database: config.database.clone().unwrap_or_default(),
            auth: Default::default(),
        })
        .await;

        let client = match client_res {
            Ok(c) => Some(c),
            Err(e) => {
                eprintln!(
                    "⚠️ WARNING: Failed to connect to ChromaDB at {}: {}. Vector search features will be disabled.",
                    config.url, e
                );
                None
            }
        };

        Self { client, engine }
    }
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

        let client = self.client.as_ref().ok_or_else(|| {
            AppError::StorageError("ChromaDB is not connected. This feature is disabled.".into())
        })?;

        let collection = client
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
    /// Stores the full JSON of the record as the document content.
    pub async fn store_record(&self, record: &Record) -> Result<(), AppError> {
        let searchable_text = record
            .to_json()
            .map_err(|e| AppError::StorageError(e.to_string()))?;
        let vector = self.engine.embed_text(&searchable_text).await?;
        let id_str = record.id.to_string();

        let entries = CollectionEntries {
            ids: vec![id_str.as_str()],
            embeddings: Some(vec![vector]),
            metadatas: None,
            documents: Some(vec![&searchable_text]),
        };

        let client = self.client.as_ref().ok_or_else(|| {
            AppError::StorageError("ChromaDB is not connected. This feature is disabled.".into())
        })?;

        let collection = client
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

        let client = self.client.as_ref().ok_or_else(|| {
            AppError::StorageError("ChromaDB is not connected. This feature is disabled.".into())
        })?;

        let collection = client
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

        let entries = CollectionEntries {
            ids: vec![&picture.label],
            embeddings: Some(vec![vector]),
            metadatas: None,
            documents: Some(vec![&searchable_text]),
        };

        let client = self.client.as_ref().ok_or_else(|| {
            AppError::StorageError("ChromaDB is not connected. This feature is disabled.".into())
        })?;

        let collection = client
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

        let client = self.client.as_ref().ok_or_else(|| {
            AppError::StorageError("ChromaDB is not connected. This feature is disabled.".into())
        })?;

        let collection = client
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
    /// Returns the matched document strings.
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
            include: Some(vec!["documents".into()]),
        };

        let client = self.client.as_ref().ok_or_else(|| {
            AppError::StorageError("ChromaDB is not connected. This feature is disabled.".into())
        })?;

        let collection = client
            .get_collection(collection_name)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        let results = collection
            .query(options, None)
            .await
            .map_err(|e| AppError::StorageError(e.to_string()))?;

        if results.documents.is_none() {
            return Ok(Vec::new());
        }

        // We take the first result set (for the first query embedding we sent)
        let docs = results.documents.unwrap();
        if docs.is_empty() {
            return Ok(Vec::new());
        }

        Ok(docs[0].clone())
    }
}
