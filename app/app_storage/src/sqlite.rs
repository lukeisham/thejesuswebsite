use app_core::types::contact::contact::Contact;
use app_core::types::system::{SecurityEventType, SecurityLog, User, UserRole};
use sqlx::SqlitePool;
use ulid::Ulid;

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

    // --- USERS ---

    pub async fn get_users(&self) -> Result<Vec<User>, sqlx::Error> {
        let rows = sqlx::query!("SELECT id, email, role FROM users")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| User {
                id: r.id.to_str(),
                email: r.email.to_str(),
                role: match r.role.to_str().as_str() {
                    "Admin" => UserRole::Admin,
                    _ => UserRole::Admin,
                },
            })
            .collect())
    }

    pub async fn create_user(&self, user: &User) -> Result<(), sqlx::Error> {
        let role_str = match user.role {
            UserRole::Admin => "Admin",
        };
        sqlx::query!(
            "INSERT INTO users (id, email, role) VALUES (?, ?, ?)",
            user.id,
            user.email,
            role_str
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete_user(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query!("DELETE FROM users WHERE id = ?", id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- CONTACTS ---

    pub async fn get_unread_contacts(&self) -> Result<Vec<Contact>, sqlx::Error> {
        let rows = sqlx::query!(
            "SELECT DISTINCT c.id, c.name, c.email FROM contacts c 
             JOIN contact_messages m ON c.id = m.contact_id 
             WHERE m.status = 'Unread'"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Contact {
                id: Ulid::from_string(&r.id.to_str()).unwrap_or_else(|_| Ulid::new()),
                name: r.name.to_str(),
                email: r.email.to_str(),
            })
            .collect())
    }

    pub async fn mark_contact_read(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query!("UPDATE contact_messages SET status = 'Read' WHERE contact_id = ?", id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Stores a new contact and an initial message.
    pub async fn store_contact(&self, name: &str, email: &str) -> Result<(), sqlx::Error> {
        let contact_id = Ulid::new().to_string();
        let message_id = Ulid::new().to_string();

        // 1. Ensure contact exists (Safe two-step approach instead of faulty ON CONFLICT)
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

        // 2. Add message (Status only, as created_at/content might be missing from schema)
        sqlx::query!(
            "INSERT INTO contact_messages (id, contact_id, status) VALUES (?, ?, 'Unread')",
            message_id,
            cid
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Stores a donor record (Mock/Placeholder for now).
    pub async fn store_donor(&self, _name: &str, _amount: f64) -> Result<(), sqlx::Error> {
        // Placeholder for donor table implementation
        Ok(())
    }

    // --- SECURITY LOGS ---

    pub async fn get_security_logs(&self) -> Result<Vec<SecurityLog>, sqlx::Error> {
        let rows = sqlx::query!("SELECT id, event_type, ip_address, details, created_at FROM security_logs ORDER BY created_at DESC LIMIT 100")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| SecurityLog {
                id: r.id.to_str(),
                event_type: match r.event_type.to_str().as_str() {
                    "Honeypot" => SecurityEventType::Honeypot,
                    "RateLimit" => SecurityEventType::RateLimit,
                    "LoginRequest" => SecurityEventType::LoginRequest,
                    "LoginSuccess" => SecurityEventType::LoginSuccess,
                    "LoginFail" => SecurityEventType::LoginFail,
                    _ => SecurityEventType::RateLimit,
                },
                ip_address: r.ip_address,
                details: r.details,
                created_at: r.created_at.to_str(),
            })
            .collect())
    }

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

        sqlx::query!(
            "INSERT INTO security_logs (id, event_type, ip_address, details, created_at) VALUES (?, ?, ?, ?, ?)",
            id,
            event_str,
            ip_address,
            details,
            now
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
