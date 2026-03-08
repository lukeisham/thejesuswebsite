use crate::types::blog_and_news::blog::DraftBlogPost;
use crate::types::jesus::{
    Classification, ContentEntry, InteractiveMap, MapPoint, MapType, TimelineEntry, TimelineEra,
};
use crate::types::record::record::Record;
use crate::types::system::{BibleVerse, EntryToggle, Metadata};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::convert::TryFrom;
use ulid::Ulid;
use uuid::Uuid;

/// Request DTO for the public contact form.
/// Matches the shape sent by store_contact.js.
#[derive(Debug, Serialize, Deserialize)]
pub struct ContactRequest {
    pub name: String,
    pub email: String,
    pub message: String,
}

/// Generic success/failure API response.
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T = serde_json::Value> {
    pub status: String, // "success" | "error"
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(message: impl Into<String>, data: Option<T>) -> Self {
        Self {
            status: "success".into(),
            message: message.into(),
            data,
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            status: "error".into(),
            message: message.into(),
            data: None,
        }
    }
}

/// Request DTO for public donations.
/// Matches the shape sent by store_donor.js.
#[derive(Debug, Serialize, Deserialize)]
pub struct DonorRequest {
    pub donor_name: String,
    pub amount: f64,
}

/// Request DTO for creating or updating a blog post.
/// Bridges the JS "body" -> "content" and "published" -> "is_published" discrepancy.
#[derive(Debug, Serialize, Deserialize)]
pub struct BlogCreateRequest {
    pub title: String,
    pub body: String,
    pub published: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture_url: Option<String>,
    pub labels: Vec<String>,
}

/// Request DTO for saving a record draft from edit_records.js.
#[derive(Debug, Serialize, Deserialize)]
pub struct DraftRecordRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub name: String,
    pub r#type: String, // Maps to Classification
    pub region: String, // Maps to MapType
}

/// Request DTO for publishing a full record from widget_record_generator.js.
#[derive(Debug, Serialize, Deserialize)]
pub struct PublishRecordRequest {
    pub name: String,
    pub description: Vec<String>,
    pub timeline: PublishTimelineRequest,
    pub map_data: PublishMapRequest,
    pub primary_verse: String,
    pub category: String, // Maps to Classification
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishTimelineRequest {
    pub year: i32,
    pub event_name: String,
    pub era: String, // Maps to TimelineEra
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishMapRequest {
    pub region: String, // Maps to MapType
    pub latitude: f64,
    pub longitude: f64,
    pub title: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               CONVERSIONS                                  //
//                          (Bride -> Skeleton)                               //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl From<BlogCreateRequest> for DraftBlogPost {
    fn from(req: BlogCreateRequest) -> Self {
        Self {
            title: req.title,
            content: req.body, // Bridge: body -> content
            picture_url: req.picture_url,
            labels: req.labels,
        }
    }
}

impl TryFrom<PublishRecordRequest> for Record {
    type Error = String;

    fn try_from(req: PublishRecordRequest) -> Result<Self, Self::Error> {
        let category = match req.category.to_lowercase().as_str() {
            "event" => Classification::Event,
            "location" => Classification::Location,
            "person" => Classification::Person,
            "theme" => Classification::Theme,
            _ => return Err(format!("Invalid classification: {}", req.category)),
        };

        let era = match req.timeline.era.to_lowercase().as_str() {
            "pre-incarnation" | "preincarnation" => TimelineEra::PreIncarnation,
            "birth" => TimelineEra::Birth,
            "life" => TimelineEra::Life,
            "ministry" => TimelineEra::Ministry,
            "passion" => TimelineEra::Passion,
            "response" => TimelineEra::Response,
            "return" => TimelineEra::Return,
            "theme" => TimelineEra::Theme,
            _ => return Err(format!("Invalid era: {}", req.timeline.era)),
        };

        let map_type = match req.map_data.region.to_lowercase().as_str() {
            "galilee" => MapType::Galilee,
            "jerusalem" => MapType::Jerusalem,
            "judea" => MapType::Judea,
            "levant" => MapType::Levant,
            "rome" => MapType::Rome,
            "overview" => MapType::Overview,
            _ => return Err(format!("Invalid region: {}", req.map_data.region)),
        };

        Ok(Record {
            id: Ulid::new(),
            metadata: Metadata {
                id: Ulid::new(),
                keywords: Vec::new(),
                toggle: EntryToggle::Record,
            },
            name: req.name,
            picture_bytes: Vec::new(), // Standard rule: picture handled separately
            description: req.description,
            bibliography: Vec::new(),
            timeline: TimelineEntry {
                id: Uuid::new_v4(),
                event_name: req.timeline.event_name,
                era: Some(era),
                description: String::new(),
            },
            map_data: InteractiveMap {
                map_id: Uuid::new_v4(),
                label: map_type,
                version: 1,
                points: vec![MapPoint {
                    id: Uuid::new_v4(),
                    title: req.map_data.title,
                    description: String::new(),
                    latitude: req.map_data.latitude,
                    longitude: req.map_data.longitude,
                    metadata: std::collections::HashMap::new(),
                }],
            },
            category,
            content: ContentEntry {
                id: Uuid::new_v4(),
                title: String::new(),
                body: String::new(),
                category: None,
            },
            primary_verse: BibleVerse {
                book: crate::types::system::bible_verse::BibleBook::Matthew,
                chapter: 1,
                verse: 1,
            }, // Mocked: parsing logic would be here
            secondary_verse: None,
            created_at: Utc::now(),
            updated_at: None,
        })
    }
}

/// Request DTO for creating a new user from widget_user_manager.js.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub role: String, // Maps to UserRole
}

/// Request DTO for creating a new source from widget_sources.js.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSourceRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_orcid: Option<String>,
    pub title_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub publication_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub publication_link: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doi_link: Option<String>,
    pub source_type_str: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<i32>,
}

/// A single mention found by the web crawler.
#[derive(Debug, Serialize, Deserialize)]
pub struct MentionItem {
    pub source_type: String, // "Human" or "Agent"
    pub created_at: String,
    pub url: String,
    pub snippet: String,
}

/// Response returned by the crawler run.
#[derive(Debug, Serialize, Deserialize)]
pub struct MentionsResponse {
    pub summary: String,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               CONVERSIONS (Batch 3)                        //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl TryFrom<CreateUserRequest> for crate::types::system::user::User {
    type Error = String;

    fn try_from(req: CreateUserRequest) -> Result<Self, Self::Error> {
        use crate::types::system::user::UserRole;

        let role = match req.role.as_str() {
            "Admin" => UserRole::Admin,
            _ => return Err(format!("Invalid role: {}", req.role)),
        };

        Ok(Self {
            id: Uuid::new_v4().to_string(),
            email: req.email,
            role,
        })
    }
}

impl TryFrom<CreateSourceRequest> for crate::types::system::source::Source {
    type Error = String;

    fn try_from(req: CreateSourceRequest) -> Result<Self, Self::Error> {
        use crate::types::system::source::{Author, SourceIdentity, SourceTitle};

        let author = if let Some(orcid) = req.author_orcid {
            Author::Orcid(orcid)
        } else if let Some(name) = req.author_name {
            Author::Name(name)
        } else {
            return Err("Author Name or ORCID is required".into());
        };

        let identity = if let Some(doi) = req.doi_link {
            Some(SourceIdentity::AcademicArticleId(doi))
        } else if let Some(link) = req.publication_link {
            Some(SourceIdentity::NamedUrl(link))
        } else {
            None
        };

        Ok(Self {
            author,
            title: SourceTitle {
                text: req.title_text,
                identity,
            },
        })
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               BATCH 4 DTOs                                 //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A spelling issue found by the AI scan.
#[derive(Debug, Serialize, Deserialize)]
pub struct SpellingIssue {
    pub bad_word: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
    pub text: String,
    pub context: String,
}

/// Request to add a word to the spellcheck dictionary.
#[derive(Debug, Serialize, Deserialize)]
pub struct DictionaryAddRequest {
    pub word: String,
}

/// A broken link issue found by the systemic scan.
#[derive(Debug, Serialize, Deserialize)]
pub struct DeadlinkIssue {
    pub id: String,
    pub url: String,
    pub status: String,
    pub context: String,
}

/// Request to replace a deadlink URL.
#[derive(Debug, Serialize, Deserialize)]
pub struct DeadlinkReplacement {
    pub id: String,
    pub old_url: String,
    pub new_url: String,
}
/// Request DTO for marking a contact as read.
#[derive(Debug, Serialize, Deserialize)]
pub struct MarkReadRequest {
    /// The unique ULID of the contact to mark as read.
    pub id: String,
}

/// Response DTO for a list of records.
#[derive(Debug, Serialize, Deserialize)]
pub struct RecordListResponse {
    pub records: Vec<Record>,
    pub count: usize,
}

/// Response from the ESV Bible API.
#[derive(Debug, Serialize, Deserialize)]
pub struct EsvPassageResponse {
    pub canonical: String,
    pub passages: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub query: Option<String>,
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               BATCH 5 DTOs                                 //
//                               (Response Types)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// Response DTO for unread contacts, matching dashboard expectations.
#[derive(Debug, Serialize, Deserialize)]
pub struct ContactResponse {
    /// Unique identifier for the message.
    pub msg_id: String,
    /// Name of the sender.
    pub name: String,
    /// Email of the sender.
    pub email: String,
    /// Subject line of the message.
    pub subject: String,
    /// Content of the message.
    pub body: String,
    /// Type of source: "Human" or "Agent".
    pub source_type: String,
    /// RFC3339 formatted timestamp of when the message was sent.
    pub sent_at: String,
}

/// Response DTO for security logs.
#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityLogResponse {
    /// The type of security event (e.g., "LoginFail", "RateLimit").
    pub event_type: String,
    /// RFC3339 formatted timestamp.
    pub created_at: String,
    /// The IP address associated with the event, if available.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,
    /// Additional context or data about the event.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

/// A single item in the agent's work queue.
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkQueueItem {
    /// The name/title of the task.
    pub task: String,
    /// Current status: "pending", "running", "completed", "failed".
    pub status: String,
    /// Optional detailed description of the task's progress.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// A single step in an agent's reasoning trace.
#[derive(Debug, Serialize, Deserialize)]
pub struct AgentTraceStep {
    /// The specific action taken by the agent (e.g., "Search", "Call Tool").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action: Option<String>,
    /// The internal logical reasoning for the action.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<String>,
}

/// Response containing the full agent trace.
#[derive(Debug, Serialize, Deserialize)]
pub struct AgentTraceResponse {
    /// Sequential list of reasoning steps.
    pub steps: Vec<AgentTraceStep>,
}

/// Response for live server metrics.
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerMetricsResponse {
    /// Current RAM usage string (e.g., "256 / 512 MB").
    pub ram_usage: String,
    /// Current Disk usage string.
    pub disk_usage: String,
    /// The name of the active LLM API model.
    pub llm_api: String,
    /// Tokens consumed today.
    pub tokens_today: String,
    /// Tokens consumed this week.
    pub tokens_week: String,
    /// Tokens consumed this month.
    pub tokens_month: String,
}

/// Response for token usage metrics.
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenMetricsResponse {
    /// Number of tokens used in the current period.
    pub used: u64,
    /// The maximum token limit.
    pub limit: u64,
}

/// Response for Wikipedia engine status.
#[derive(Debug, Serialize, Deserialize)]
pub struct WikiStatusResponse {
    /// Whether the wiki engine is currently running a task.
    pub running: bool,
    /// RFC3339 timestamp of the last successful run.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_run: Option<String>,
}

/// Response for page performance metrics.
#[derive(Debug, Serialize, Deserialize)]
pub struct PageMetricsResponse {
    /// Total time for the page to load.
    pub load_time: String,
    /// Time to first byte.
    pub ttfb: String,
    /// Time until the DOM is fully interactive.
    pub dom_ready: String,
}

/// A single challenge record in the dashboard list.
#[derive(Debug, Serialize, Deserialize)]
pub struct ChallengeResponseItem {
    /// Unique internal ID for the challenge.
    pub id: String,
    /// Title of the challenge.
    pub title: String,
    /// Number of responses/attempts recorded.
    pub response_count: usize,
}

/// A single item in the Wikipedia rankings list.
#[derive(Debug, Serialize, Deserialize)]
pub struct RankingItem {
    /// Rank position.
    pub rank: usize,
    /// Title of the ranked article or topic.
    pub title: String,
    /// Calculated score using weighted metrics.
    pub score: f64,
}

/// Response for agent self-reflection.
#[derive(Debug, Serialize, Deserialize)]
pub struct ReflectionResponse {
    /// The AI's self-assessment of its recent performance or state.
    pub reflection: String,
}

/// A research suggestion generated by the AI based on current context.
#[derive(Debug, Serialize, Deserialize)]
pub struct ResearchSuggestion {
    /// Unique ID for the suggestion.
    pub id: String,
    /// The title or topic of the suggestion.
    pub title: String,
    /// The category classifications (e.g., "Archeology", "Textual Criticism").
    pub category: String,
}

/// Summary counts for contact triage dashboard.
#[derive(Debug, Serialize, Deserialize)]
pub struct ContactTriageResponse {
    /// Count of brand new unread messages.
    pub new: usize,
    /// Count of messages flagged as critical by AI triage.
    pub critical: usize,
    /// Narrative summary text for the widget.
    pub summary: String,
}

/// Generic summary response for asynchronous triggers and simple status checks.
#[derive(Debug, Serialize, Deserialize)]
pub struct SummaryResponse {
    /// Concise summary of the operation result.
    pub summary: String,
}
