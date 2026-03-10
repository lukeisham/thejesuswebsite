use app_core::types::dtos::{
    AgentTraceStep, DeadlinkIssue, DraftRecordRequest, MentionItem, PageMetric, ReflectionResponse,
    ServerMetricsResponse, SpellingIssue, TokenMetricsResponse, WorkQueueItem,
};
use app_core::types::essays_and_ranks::challenge::{
    Academic, AcademicChallenge, Popular, PopularChallenge,
};
use app_core::types::record::record::Record;
use app_core::types::system::Metadata;
use app_core::types::{
    Author, Contact, ContactMessage, NewsItem, NewsItemId, RawNewsItem, SecurityEventType,
    SecurityLog, Source, SourceIdentity, SourceTitle, User, UserRole, WikiWeight,
};
use sqlx::{Row, SqlitePool};
use ulid::Ulid;
use url::Url;

/// A helper trait to handle both String and Option<String> consistently.
trait ToStr {
    fn to_str(self) -> String;
}
impl ToStr for String {
    fn to_str(self) -> String {
        self
    }
}
impl ToStr for Option<String> {
    fn to_str(self) -> String {
        self.unwrap_or_default()
    }
}

/// A persistent storage engine powered by SQLite.
/// Handles structured data like users, contacts, and logs.
#[derive(Clone)]
pub struct SqliteStorage {
    pub pool: SqlitePool,
}

impl SqliteStorage {
    /// Creates a new SqliteStorage instance from an existing pool.
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Connects to a SQLite database file and returns a new storage instance.
    pub async fn connect(url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(url).await?;
        Ok(Self::new(pool))
    }

    // --- CONTACTS ---

    pub async fn get_unread_contacts(&self) -> Result<Vec<ContactMessage>, sqlx::Error> {
        let rows = sqlx::query!(
            "SELECT 
                c.id as contact_id, c.name, c.email,
                m.id as message_id, m.subject, m.body, m.sent_at, m.read_at
             FROM contacts c 
             JOIN contact_messages m ON c.id = m.contact_id 
             WHERE m.read_at IS NULL"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                let contact = Contact {
                    id: Ulid::from_string(&r.contact_id.to_str()).unwrap_or_else(|_| Ulid::new()),
                    name: r.name.to_str(),
                    email: r.email.to_str(),
                };
                ContactMessage {
                    id: Ulid::from_string(&r.message_id.to_str()).unwrap_or_else(|_| Ulid::new()),
                    sender: contact,
                    subject: r.subject.to_str(),
                    body: r.body.to_str(),
                    sent_at: r.sent_at.to_str(),
                    read_at: r.read_at,
                }
            })
            .collect())
    }

    pub async fn mark_contact_read(&self, id: &str) -> Result<(), sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query!("UPDATE contact_messages SET read_at = ? WHERE contact_id = ?", now, id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Stores a new contact and an initial message.
    pub async fn store_contact(
        &self,
        name: &str,
        email: &str,
        subject: &str,
        body: &str,
    ) -> Result<(), sqlx::Error> {
        let contact_id = Ulid::new().to_string();
        let message_id = Ulid::new().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        // 1. Ensure contact exists
        let existing = sqlx::query!("SELECT id FROM contacts WHERE email = ?", email)
            .fetch_optional(&self.pool)
            .await?;

        let cid = if let Some(row) = existing {
            row.id.to_str()
        } else {
            sqlx::query!(
                "INSERT INTO contacts (id, name, email) VALUES (?, ?, ?)",
                contact_id,
                name,
                email
            )
            .execute(&self.pool)
            .await?;
            contact_id
        };

        // 2. Add message
        sqlx::query!(
            "INSERT INTO contact_messages (id, contact_id, subject, body, sent_at) VALUES (?, ?, ?, ?, ?)",
            message_id,
            cid,
            subject,
            body,
            now
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Stores a donor record.
    pub async fn store_donor(
        &self,
        name: &str,
        amount_cents: i64,
        privacy: &str,
    ) -> Result<(), sqlx::Error> {
        let id = Ulid::new().to_string();
        sqlx::query(
            "INSERT INTO donors (id, display_name, privacy, total_contributed_cents) VALUES (?, ?, ?, ?)",
        )
        .bind(id)
        .bind(name)
        .bind(privacy)
        .bind(amount_cents)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // --- SECURITY LOGS ---

    pub async fn log_security_event(
        &self,
        event_type: SecurityEventType,
        ip_address: Option<String>,
        details: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let event_str = match event_type {
            SecurityEventType::Honeypot => "Honeypot",
            SecurityEventType::RateLimit => "RateLimit",
            SecurityEventType::LoginRequest => "LoginRequest",
            SecurityEventType::LoginSuccess => "LoginSuccess",
            SecurityEventType::LoginFail => "LoginFail",
        };
        let id = Ulid::new().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO security_logs (id, event_type, ip_address, details, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(event_str)
        .bind(ip_address)
        .bind(details)
        .bind(now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_security_logs(&self) -> Result<Vec<SecurityLog>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, event_type, ip_address, details, created_at FROM security_logs ORDER BY created_at DESC LIMIT 50")
            .fetch_all(&self.pool)
            .await?;

        let mut logs = Vec::new();
        for r in rows {
            let event_type = match r.get::<String, _>("event_type").as_str() {
                "Honeypot" => SecurityEventType::Honeypot,
                "RateLimit" => SecurityEventType::RateLimit,
                "LoginRequest" => SecurityEventType::LoginRequest,
                "LoginSuccess" => SecurityEventType::LoginSuccess,
                "LoginFail" => SecurityEventType::LoginFail,
                _ => SecurityEventType::LoginFail,
            };

            logs.push(SecurityLog {
                id: r.get("id"),
                event_type,
                ip_address: r.get("ip_address"),
                details: r.get("details"),
                created_at: r.get("created_at"),
            });
        }
        Ok(logs)
    }

    // --- USERS ---

    pub async fn get_users(&self) -> Result<Vec<User>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, email, role FROM users")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| User {
                id: r.get("id"),
                email: r.get("email"),
                role: UserRole::Admin, // Only admin role exists for now
            })
            .collect())
    }

    pub async fn create_user(&self, user: &User) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO users (id, email, role) VALUES (?, ?, ?)")
            .bind(&user.id)
            .bind(&user.email)
            .bind("Admin")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_user(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- WIKIPEDIA WEIGHTS ---

    pub async fn get_wiki_weights(&self) -> Result<Vec<WikiWeight>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, name, match_target, match_value, weight_score FROM wikipedia_weights",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| WikiWeight {
                id: r.get("id"),
                name: r.get("name"),
                match_target: r.get("match_target"),
                match_value: r.get("match_value"),
                weight_score: r.get::<i64, _>("weight_score") as i32,
            })
            .collect())
    }

    pub async fn create_wiki_weight(&self, weight: &WikiWeight) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO wikipedia_weights (id, name, match_target, match_value, weight_score) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&weight.id)
        .bind(&weight.name)
        .bind(&weight.match_target)
        .bind(&weight.match_value)
        .bind(weight.weight_score)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_wiki_weight(&self, weight: &WikiWeight) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE wikipedia_weights SET name = ?, match_target = ?, match_value = ?, weight_score = ? WHERE id = ?",
        )
        .bind(&weight.name)
        .bind(&weight.match_target)
        .bind(&weight.match_value)
        .bind(weight.weight_score)
        .bind(&weight.id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete_wiki_weight(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM wikipedia_weights WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- SOURCES ---

    pub async fn get_sources(&self) -> Result<Vec<Source>, sqlx::Error> {
        let rows =
            sqlx::query("SELECT id, author_type, author_val, title_text, identity FROM sources")
                .fetch_all(&self.pool)
                .await?;

        let mut sources = Vec::new();
        for r in rows {
            let author_type: String = r.get("author_type");
            let author_val: String = r.get("author_val");
            let author = match author_type.as_str() {
                "Name" => Author::Name(author_val),
                "Orcid" => Author::Orcid(author_val),
                _ => Author::Name(author_val),
            };

            let identity: Option<SourceIdentity> = r
                .get::<Option<String>, _>("identity")
                .and_then(|s| serde_json::from_str(&s).ok());

            sources.push(Source {
                id: Some(r.get("id")),
                author,
                title: SourceTitle {
                    text: r.get("title_text"),
                    identity,
                },
            });
        }
        Ok(sources)
    }

    pub async fn create_source(&self, source: &Source) -> Result<i64, sqlx::Error> {
        let (author_type, author_val) = match &source.author {
            Author::Name(n) => ("Name", n.clone()),
            Author::Orcid(id) => ("Orcid", id.clone()),
        };

        let identity_json = source
            .title
            .identity
            .as_ref()
            .and_then(|i| serde_json::to_string(i).ok());

        let result = sqlx::query(
            "INSERT INTO sources (author_type, author_val, title_text, identity) VALUES (?, ?, ?, ?)",
        )
        .bind(author_type)
        .bind(author_val)
        .bind(&source.title.text)
        .bind(identity_json)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn delete_source(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM sources WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- CHALLENGES ---

    pub async fn get_popular_challenges(&self) -> Result<Vec<PopularChallenge>, sqlx::Error> {
        let rows = sqlx::query("SELECT url, name, metadata, ranking FROM challenges_popular")
            .fetch_all(&self.pool)
            .await?;

        let mut challenges = Vec::new();
        for r in rows {
            let metadata_str: String = r.get("metadata");
            let metadata: Metadata = match serde_json::from_str(&metadata_str) {
                Ok(m) => m,
                Err(_) => continue,
            };
            challenges.push(PopularChallenge {
                url: Url::parse(&r.get::<String, _>("url"))
                    .unwrap_or_else(|_| Url::parse("https://error.com").unwrap()),
                name: r.get("name"),
                metadata,
                ranking: Popular::validate(r.get::<i64, _>("ranking") as u8)
                    .unwrap_or(Popular::validate(1).unwrap()),
            });
        }
        Ok(challenges)
    }

    pub async fn get_academic_challenges(&self) -> Result<Vec<AcademicChallenge>, sqlx::Error> {
        let rows = sqlx::query("SELECT url, name, metadata, ranking FROM challenges_academic")
            .fetch_all(&self.pool)
            .await?;

        let mut challenges = Vec::new();
        for r in rows {
            let metadata_str: String = r.get("metadata");
            let metadata: Metadata = match serde_json::from_str(&metadata_str) {
                Ok(m) => m,
                Err(_) => continue,
            };
            challenges.push(AcademicChallenge {
                url: Url::parse(&r.get::<String, _>("url"))
                    .unwrap_or_else(|_| Url::parse("https://error.com").unwrap()),
                name: r.get("name"),
                metadata,
                ranking: Academic::validate(r.get::<i64, _>("ranking") as u8)
                    .unwrap_or(Academic::validate(1).unwrap()),
            });
        }
        Ok(challenges)
    }

    // --- WORK QUEUE ---

    pub async fn get_work_queue(&self) -> Result<Vec<WorkQueueItem>, sqlx::Error> {
        let rows = sqlx::query("SELECT payload, status FROM work_queue WHERE status != 'Done'")
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for r in rows {
            // This is a simplified mapping for the WorkQueueItem DTO
            // In a real scenario, payload would be parsed to find the task name
            items.push(WorkQueueItem {
                task: "Queued Task".to_string(),
                status: r.get::<String, _>("status").to_lowercase(),
                description: Some(r.get("payload")),
            });
        }
        Ok(items)
    }

    // --- RECORDS & DRAFTS ---

    /// Deletes a single record by ULID string.
    pub async fn delete_record(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM records WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    /// Deletes all records from the records table.
    /// Used by the DB Populator widget for idempotent wipe-before-populate.
    pub async fn wipe_records(&self) -> Result<usize, sqlx::Error> {
        let result = sqlx::query("DELETE FROM records")
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() as usize)
    }

    pub async fn store_record(&self, record: &Record) -> Result<(), sqlx::Error> {
        // --- Flat scalar fields ---
        let id = record.id.to_string();
        let name = &record.name;
        // category: PascalCase via serde (e.g. "Event", "Location", "Person", "Theme")
        let category = serde_json::to_string(&record.category)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string();
        // era: flat column stores the kebab-case string from TimelineEntry.era
        let era = record
            .timeline
            .era
            .as_ref()
            .map(|e| {
                serde_json::to_string(e)
                    .unwrap_or_default()
                    .trim_matches('"')
                    .to_string()
            })
            .unwrap_or_else(|| "theme".to_string());
        // map_label: PascalCase via serde (e.g. "Overview", "Galilee")
        let map_label = serde_json::to_string(&record.map_data.label)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string();
        // lat/lon: first point on map if present
        let latitude: Option<f64> = record.map_data.points.first().map(|p| p.latitude);
        let longitude: Option<f64> = record.map_data.points.first().map(|p| p.longitude);
        // verses: serialised as compact JSON strings (e.g. {"book":"John","chapter":3,"verse":16})
        let primary_verse = serde_json::to_string(&record.primary_verse).unwrap_or_default();
        let secondary_verse = record
            .secondary_verse
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_default());
        // passion fields come from timeline era + description (not separately tracked in Record yet)
        let passion_day: Option<i64> = None;
        let passion_hour: Option<i64> = None;
        // description: JSON array of strings
        let description = serde_json::to_string(&record.description).unwrap_or_default();
        // picture_bytes: raw BLOB
        let picture_bytes = &record.picture_bytes;

        // --- JSON blob fields ---
        let bibliography = serde_json::to_string(&record.bibliography).unwrap_or_default();
        let metadata_json = serde_json::to_string(&record.metadata).unwrap_or_default();
        let content_json = serde_json::to_string(&record.content).unwrap_or_default();
        let map_json = serde_json::to_string(&record.map_data).unwrap_or_default();
        let timeline_json = serde_json::to_string(&record.timeline).unwrap_or_default();

        // --- Timestamps ---
        let created_at = record.created_at.to_rfc3339();
        let updated_at = record.updated_at.map(|t| t.to_rfc3339());

        sqlx::query(
            "INSERT OR REPLACE INTO records (
                id, name, category, era, map_label,
                latitude, longitude,
                primary_verse, secondary_verse,
                passion_day, passion_hour,
                description, picture_bytes,
                bibliography, metadata_json, content_json, map_json, timeline_json,
                created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?
            )",
        )
        .bind(&id)
        .bind(name)
        .bind(&category)
        .bind(&era)
        .bind(&map_label)
        .bind(latitude)
        .bind(longitude)
        .bind(&primary_verse)
        .bind(secondary_verse.as_deref())
        .bind(passion_day)
        .bind(passion_hour)
        .bind(&description)
        .bind(picture_bytes.as_slice())
        .bind(&bibliography)
        .bind(&metadata_json)
        .bind(&content_json)
        .bind(&map_json)
        .bind(&timeline_json)
        .bind(&created_at)
        .bind(updated_at.as_deref())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_records(&self) -> Result<Vec<Record>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, name, category, era, map_label,
                    latitude, longitude,
                    primary_verse, secondary_verse,
                    passion_day, passion_hour,
                    description, picture_bytes,
                    bibliography, metadata_json, content_json, map_json, timeline_json,
                    created_at, updated_at
             FROM records ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .filter_map(|r| {
                // Prefer fully-hydrated JSON blobs where available; fall back gracefully.
                let metadata_json: String = r.get("metadata_json");
                let content_json: String = r.get("content_json");
                let map_json: String = r.get("map_json");
                let timeline_json: String = r.get("timeline_json");
                let bibliography_json: String = r.get("bibliography");
                let description_json: String = r.get("description");

                let metadata = serde_json::from_str(&metadata_json).ok()?;
                let content = serde_json::from_str(&content_json).ok()?;
                let map_data = serde_json::from_str(&map_json).ok()?;
                let timeline = serde_json::from_str(&timeline_json).ok()?;
                let bibliography = serde_json::from_str(&bibliography_json).unwrap_or_default();
                let description: Vec<String> =
                    serde_json::from_str(&description_json).unwrap_or_default();

                let primary_verse_json: String = r.get("primary_verse");
                let primary_verse = serde_json::from_str(&primary_verse_json).ok()?;
                let secondary_verse: Option<_> = r
                    .try_get::<String, _>("secondary_verse")
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok());

                let id_str: String = r.get("id");
                let id = id_str.parse::<ulid::Ulid>().ok()?;

                let created_at_str: String = r.get("created_at");
                let created_at = created_at_str
                    .parse::<chrono::DateTime<chrono::Utc>>()
                    .ok()?;
                let updated_at: Option<chrono::DateTime<chrono::Utc>> = r
                    .try_get::<String, _>("updated_at")
                    .ok()
                    .and_then(|s| s.parse().ok());

                let picture_bytes: Vec<u8> =
                    r.try_get::<Vec<u8>, _>("picture_bytes").unwrap_or_default();

                Some(Record {
                    id,
                    metadata,
                    name: r.get("name"),
                    picture_bytes,
                    description,
                    bibliography,
                    timeline,
                    map_data,
                    category: serde_json::from_str(&format!(
                        "\"{}\"",
                        r.get::<String, _>("category")
                    ))
                    .unwrap_or(app_core::types::jesus::Classification::Theme),
                    content,
                    primary_verse,
                    secondary_verse,
                    created_at,
                    updated_at,
                })
            })
            .collect())
    }

    pub async fn save_record_draft(&self, draft: &DraftRecordRequest) -> Result<(), sqlx::Error> {
        let id = draft.id.clone().unwrap_or_else(|| Ulid::new().to_string());
        let payload = serde_json::to_string(draft).unwrap_or_default();
        let now = chrono::Utc::now().to_rfc3339();

        // Normalise type/region to Title-case to satisfy CHECK constraints
        let title_case = |s: &str| -> String {
            let mut c = s.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        };
        let draft_type = title_case(&draft.r#type);
        let draft_region = title_case(&draft.region);

        sqlx::query(
            "INSERT OR REPLACE INTO record_drafts (id, name, type, region, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&draft.name)
        .bind(&draft_type)
        .bind(&draft_region)
        .bind(&payload)
        .bind(&now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_draft_records(&self) -> Result<Vec<DraftRecordRequest>, sqlx::Error> {
        let rows = sqlx::query("SELECT payload FROM record_drafts ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|r| {
                let json: String = r.get("payload");
                serde_json::from_str::<DraftRecordRequest>(&json).ok()
            })
            .collect())
    }

    pub async fn delete_record_draft(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM record_drafts WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_draft_counts(&self) -> Result<app_core::types::DraftCounts, sqlx::Error> {
        let records = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM record_drafts")
            .fetch_one(&self.pool)
            .await?;
        let essays = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM essay_drafts")
            .fetch_one(&self.pool)
            .await?;
        Ok(app_core::types::DraftCounts::new(records as u32, essays as u32, 0))
    }

    // --- MENTIONS ---

    pub async fn get_mentions(&self) -> Result<Vec<MentionItem>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT source_type, created_at, url, snippet FROM mentions ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| MentionItem {
                source_type: r.get("source_type"),
                created_at: r.get("created_at"),
                url: r.get("url"),
                snippet: r.get("snippet"),
            })
            .collect())
    }

    pub async fn store_mention(&self, item: &MentionItem) -> Result<(), sqlx::Error> {
        let id = Ulid::new().to_string();
        sqlx::query(
            "INSERT INTO mentions (id, source_type, created_at, url, snippet) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(&item.source_type)
        .bind(&item.created_at)
        .bind(&item.url)
        .bind(&item.snippet)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // --- METRICS & TRACES ---

    pub async fn get_trace_reasoning(&self) -> Result<Vec<AgentTraceStep>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT step, reasoning FROM trace_reasoning ORDER BY created_at DESC LIMIT 50",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| AgentTraceStep {
                action: Some(r.get("step")),
                reasoning: Some(r.get("reasoning")),
            })
            .collect())
    }

    pub async fn get_server_metrics(&self) -> Result<ServerMetricsResponse, sqlx::Error> {
        let row = sqlx::query("SELECT ram_used_mb, ram_total_mb, disk_used_mb, disk_total_mb FROM server_metrics WHERE id = 1")
            .fetch_one(&self.pool)
            .await?;

        Ok(ServerMetricsResponse {
            ram_usage: format!(
                "{} / {} MB",
                row.get::<i64, _>("ram_used_mb"),
                row.get::<i64, _>("ram_total_mb")
            ),
            disk_usage: format!(
                "{} / {} GB",
                row.get::<i64, _>("disk_used_mb") / 1024,
                row.get::<i64, _>("disk_total_mb") / 1024
            ),
            llm_api: "Claude 3.5 Sonnet".to_string(),
            tokens_today: "4,250".to_string(), // Injected for demo or from tokens table
            tokens_week: "12,400".to_string(),
            tokens_month: "45,000".to_string(),
        })
    }

    pub async fn get_token_metrics(&self) -> Result<TokenMetricsResponse, sqlx::Error> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM tokens")
            .fetch_one(&self.pool)
            .await?;

        Ok(TokenMetricsResponse {
            used: row.get::<i64, _>("count") as u64,
            limit: 1000000,
        })
    }

    pub async fn get_all_page_metrics(&self) -> Result<Vec<PageMetric>, sqlx::Error> {
        let rows =
            sqlx::query("SELECT page_id, views, avg_time_on_page, bounce_rate FROM page_metrics")
                .fetch_all(&self.pool)
                .await?;

        Ok(rows
            .into_iter()
            .map(|r| PageMetric {
                page_id: r.get("page_id"),
                views: r.get("views"),
                avg_time_on_page: r.get("avg_time_on_page"),
                bounce_rate: r.get("bounce_rate"),
            })
            .collect())
    }

    pub async fn get_recent_spelling_errors(&self) -> Result<Vec<SpellingIssue>, sqlx::Error> {
        let rows = sqlx::query("SELECT word, location, suggested_correction, severity FROM spelling_errors ORDER BY created_at DESC LIMIT 50")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| SpellingIssue {
                bad_word: r.get("word"),
                suggestion: r.get("suggested_correction"),
                text: format!("Found in {}", r.get::<String, _>("location")),
                context: r.get("location"),
                severity: r.get("severity"),
            })
            .collect())
    }

    pub async fn get_failed_deadlinks(&self) -> Result<Vec<DeadlinkIssue>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT link_id, url, source_page, http_status, last_checked FROM deadlinks",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| DeadlinkIssue {
                id: r.get("link_id"),
                url: r.get("url"),
                status: r
                    .get::<Option<i64>, _>("http_status")
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| "Unknown".into()),
                context: r.get("source_page"),
                last_checked: r.get("last_checked"),
            })
            .collect())
    }

    pub async fn get_recent_reflections(&self) -> Result<Vec<ReflectionResponse>, sqlx::Error> {
        let rows =
            sqlx::query("SELECT summary FROM self_reflection ORDER BY timestamp DESC LIMIT 5")
                .fetch_all(&self.pool)
                .await?;

        Ok(rows
            .into_iter()
            .map(|r| ReflectionResponse {
                reflection: r.get("summary"),
            })
            .collect())
    }

    // --- NEWS ---

    pub async fn get_news_feed(&self) -> Result<Vec<NewsItem>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, title, source_url, snippet, contents, picture_url, harvested_at FROM news_items ORDER BY harvested_at DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for r in rows {
            let id_str: String = r.get("id");
            let id = uuid::Uuid::parse_str(&id_str).unwrap_or_else(|_| uuid::Uuid::nil());

            items.push(NewsItem {
                id: NewsItemId(id),
                title: r.get("title"),
                source_url: Url::parse(&r.get::<String, _>("source_url"))
                    .unwrap_or_else(|_| Url::parse("https://error.com").unwrap()),
                snippet: r.get("snippet"),
                contents: r.get("contents"),
                picture_url: r
                    .get::<Option<String>, _>("picture_url")
                    .and_then(|u| Url::parse(&u).ok()),
                harvested_at: chrono::DateTime::parse_from_rfc3339(
                    &r.get::<String, _>("harvested_at"),
                )
                .unwrap_or_default()
                .with_timezone(&chrono::Utc),
            });
        }
        Ok(items)
    }

    pub async fn store_news_item(&self, item: &NewsItem) -> Result<(), sqlx::Error> {
        let id = item.id.0.to_string();
        let harvested_at = item.harvested_at.to_rfc3339();
        let source_url = item.source_url.to_string();
        let picture_url = item.picture_url.as_ref().map(|u| u.to_string());

        sqlx::query(
            "INSERT INTO news_items (id, title, source_url, snippet, contents, picture_url, harvested_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(&item.title)
        .bind(source_url)
        .bind(&item.snippet)
        .bind(&item.contents)
        .bind(picture_url)
        .bind(harvested_at)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_harvested_news(&self) -> Result<Vec<RawNewsItem>, sqlx::Error> {
        let rows =
            sqlx::query("SELECT title, url, raw_content, raw_image_url FROM news_holding_area")
                .fetch_all(&self.pool)
                .await?;

        Ok(rows
            .into_iter()
            .map(|r| RawNewsItem {
                title: r.get("title"),
                url: r.get("url"),
                raw_content: r.get("raw_content"),
                raw_image_url: r.get("raw_image_url"),
            })
            .collect())
    }

    pub async fn store_harvested_news(&self, raw: &RawNewsItem) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO news_holding_area (title, url, raw_content, raw_image_url) VALUES (?, ?, ?, ?)",
        )
        .bind(&raw.title)
        .bind(&raw.url)
        .bind(&raw.raw_content)
        .bind(&raw.raw_image_url)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete_harvested_news_by_url(&self, url: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM news_holding_area WHERE url = ?")
            .bind(url)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- PAGE VIEWS ---

    pub async fn record_page_view(&self, slug: &str) -> Result<(), sqlx::Error> {
        // 1. Ensure page_id exists
        let page_id: String = match sqlx::query_scalar("SELECT id FROM page_ids WHERE slug = ?")
            .bind(slug)
            .fetch_optional(&self.pool)
            .await?
        {
            Some(id) => id,
            None => {
                let id = Ulid::new().to_string();
                sqlx::query("INSERT INTO page_ids (id, slug) VALUES (?, ?)")
                    .bind(&id)
                    .bind(slug)
                    .execute(&self.pool)
                    .await?;
                id
            }
        };

        // 2. Increment view count
        let res = sqlx::query(
            "UPDATE page_views SET view_count = view_count + 1, last_viewed = ? WHERE page_id = ?",
        )
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(&page_id)
        .execute(&self.pool)
        .await?;

        if res.rows_affected() == 0 {
            sqlx::query(
                "INSERT INTO page_views (page_id, view_count, last_viewed) VALUES (?, 1, ?)",
            )
            .bind(&page_id)
            .bind(chrono::Utc::now().to_rfc3339())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn get_page_view_count(&self, slug: &str) -> Result<u64, sqlx::Error> {
        let count: Option<i64> = sqlx::query_scalar(
            "SELECT v.view_count FROM page_views v JOIN page_ids p ON v.page_id = p.id WHERE p.slug = ?"
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;

        Ok(count.unwrap_or(0) as u64)
    }
}
