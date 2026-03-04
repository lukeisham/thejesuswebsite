use super::super::{
    BigIdea, Budget, Challenge, ChallengeList, Classification, Contact, Donor, Essay,
    InteractiveMap, RawChallenge, Record, Response, SearchDomain, SearchMetadata, SearchWord,
    TimelineEntry, Wikipedia, WikipediaArticlesRanked, WikipediaArticlesUnRanked,
};
use super::{
    AcademicArticleId, AgentReferral, AiToken, BibleVerse, ContextWindow, GregoryAlandId,
    HumanRequest, IaaSiteId, Isbn, LgpnId, Metadata, NamedUrl, OrcidId, PageId, PageView, Picture,
    PleiadesId, RamSnapshot, S2CellId, SequenceId, Source, StorageSnapshot, TraceReasoning,
    UlidNumber, UserMetrics, WorkItem, WorkspaceContext,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// The Comprehensive Wire Protocol.
/// This enum maps EVERY type-safe structure we've defined to a
/// JSON-serializable format for the JS bridge.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum JsonExchange {
    // --- System & Resource Metrics ---
    RamState(RamSnapshot),
    StorageState(StorageSnapshot),
    ContextState(ContextWindow),

    // --- AI & Agent Flow ---
    UserRequest(HumanRequest),
    AgentReferral(AgentReferral),
    Trace(TraceReasoning),
    Token(AiToken),
    WorkParked(WorkItem),

    // --- Identity & User Data ---
    UserMetrics(UserMetrics),
    PageView(PageView),
    PageUpload(PageId), // We usually just send the ID back to JS

    // --- Academic & Historical Identifiers ---
    Pleiades(PleiadesId),
    Orcid(OrcidId),
    Isbn(Isbn),
    Manuscript(GregoryAlandId),
    Lgpn(LgpnId),
    IaaSite(IaaSiteId),
    AcademicArticle(AcademicArticleId),

    // --- Geospatial & Scripture ---
    Geo(S2CellId),
    Scripture(BibleVerse),

    // --- Domain: Jesus & History ---
    JesusRecord(Record),
    Timeline(TimelineEntry),
    Map(InteractiveMap),
    Category(Classification),

    // --- Domain: Wikipedia & Research ---
    Wikipedia(Wikipedia),
    WikipediaUnranked(WikipediaArticlesUnRanked),
    WikipediaRanked(WikipediaArticlesRanked),

    // --- Domain: Challenges & Responses ---
    Challenge(Challenge),
    ChallengeList(ChallengeList),
    ChallengeRaw(RawChallenge),
    ChallengeResponse(Response),

    // --- Domain: Content & Essays ---
    Essay(Essay),

    // --- Domain: Search & Rank ---
    SearchVibe(SearchMetadata),
    SearchWord(SearchWord),
    SearchScope(SearchDomain),
    BigIdea(BigIdea),

    // --- Domain: Operations & Budget ---
    Contact(Contact),
    Budget(Budget),
    Donor(Donor),

    // --- Infrastructure & Metadata ---
    Metadata(Metadata),
    Picture(Picture),
    Sequence(SequenceId),
    Source(Source),
    NamedUrl(NamedUrl),
    WorkspaceStatus(WorkspaceContext),
    Ulid(UlidNumber),
    Error(ExchangeError),
}

/// A wrapper for the raw JSON string being received from JS.
pub struct RawIncomingJson(pub String);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl JsonExchange {
    /// Async-ready serializer.
    /// Turns our internal RUST vibe into a JS-friendly string.
    pub async fn to_js(&self) -> Result<String, ExchangeError> {
        serde_json::to_string(self).map_err(|_| ExchangeError::SerializationFailed)
    }

    /// The Brain: Decides how to route incoming data based on the 'type' tag.
    pub async fn from_js(raw: RawIncomingJson) -> Result<Self, ExchangeError> {
        // Delegate to the Gatekeeper for structural validation
        let validated: JsonExchange = serde_json::from_str(&raw.0)
            .map_err(|e| ExchangeError::MalformedJson(e.to_string()))?;

        Ok(validated)
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

impl JsonExchange {
    /// Security Gate: Ensures that incoming JSON isn't a "JSON Bomb"
    /// designed to exhaust CPU/RAM during parsing.
    pub fn gatekeep_payload_size(raw: &str) -> Result<(), ExchangeError> {
        const MAX_JSON_SIZE: usize = 1_048_576; // 1MB Safety Ceiling

        if raw.len() > MAX_JSON_SIZE {
            return Err(ExchangeError::PayloadTooLarge);
        }
        Ok(())
    }

    /// Integrity Gate: Checks if the required 'type' and 'payload' keys exist
    /// before we attempt full deserialization into RUST types.
    pub fn verify_schema(raw: &Value) -> Result<(), ExchangeError> {
        if !raw.is_object() || !raw.get("type").is_some() || !raw.get("payload").is_some() {
            return Err(ExchangeError::IncompleteSchema);
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

#[derive(Debug, Serialize, Deserialize, thiserror::Error)]
pub enum ExchangeError {
    #[error("JSON Serialization Failed: Type-safe conversion interrupted")]
    SerializationFailed,

    #[error("Malformed JSON: {0}")]
    MalformedJson(String),

    #[error("Payload exceeds 1MB safety limit")]
    PayloadTooLarge,

    #[error("Incomplete Schema: Missing 'type' or 'payload' tags")]
    IncompleteSchema,

    #[error("Type Mismatch: JS sent a payload that does not match the 'type' tag")]
    TypeMismatch,
}

impl std::fmt::Display for JsonExchange {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Exchange::{}",
            serde_json::to_string(self).unwrap_or_default()
        )
    }
}
