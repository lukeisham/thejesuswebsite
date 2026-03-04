use app_core::types::system::user::UserRole;
use app_storage::SqliteStorage;
use async_trait::async_trait;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::Row;
// No longer needed here as wasm_bindgen is only used in cfg_attr now
// use wasm_bindgen::prelude::*;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (The Trait Definition)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter_with_clone))]
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSession {
    pub email: String,
    pub role: UserRole,
    pub token: String,
    pub expires_at: u64,
}

#[async_trait]
pub trait Authenticator {
    /// Step 1: Initiates the challenge (sends email)
    async fn request_challenge(
        &self,
        email: &str,
        bot_field: &str,
        ip: Option<&std::net::IpAddr>,
    ) -> Result<(), AuthError>;

    /// Step 2: Validates the passcode
    async fn verify_challenge(
        &self,
        email: &str,
        code: &str,
        ip: Option<&std::net::IpAddr>,
    ) -> Result<AuthSession, AuthError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Implementation Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Clone)]
pub struct AdminPortal {
    pub storage: SqliteStorage,
}

#[async_trait]
impl Authenticator for AdminPortal {
    async fn request_challenge(
        &self,
        email: &str,
        bot_field: &str,
        ip: Option<&std::net::IpAddr>,
    ) -> Result<(), AuthError> {
        // 3. THE GATEKEEPER: Honeypot & Email Check
        if let Err(e) = self.check_honeypot(bot_field) {
            let _ = crate::api_security::SecurityLogger::log(
                &self.storage.pool,
                "Honeypot",
                ip,
                Some(&format!("Triggered by email attempt: {}", email)),
            )
            .await;
            return Err(e);
        }

        // We check if the user exists in DB
        let user_exists = sqlx::query("SELECT 1 FROM users WHERE email = ?")
            .bind(email)
            .fetch_optional(&self.storage.pool)
            .await
            .map_err(|_| AuthError::InternalError)?
            .is_some();

        if !user_exists {
            // Shadow success to prevent enumeration
            return Ok(());
        }

        // Brain Logic: Generate 6-digit passcode
        let passcode: String = rand::thread_rng().gen_range(100_000..999_999).to_string();

        // Async First: Send the email using Lettre
        let email_body =
            format!("Your login passcode is: {}\nThis passcode expires in 5 minutes.", passcode);
        let email_msg = Message::builder()
            .from("noreply@thejesuswebsite.org".parse().unwrap())
            .to(email.parse().unwrap())
            .subject("Admin Login Passcode")
            .body(email_body)
            .map_err(|_| AuthError::InternalError)?;

        // Try to read SMTP credentials from Env, otherwise fallback to standard
        let smtp_server = std::env::var("SMTP_SERVER").unwrap_or_else(|_| "localhost".to_string());
        let smtp_user = std::env::var("SMTP_USER").unwrap_or_default();
        let smtp_pass = std::env::var("SMTP_PASS").unwrap_or_default();

        let mut mailer_builder = AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_server)
            .map_err(|_| AuthError::InternalError)?;

        if !smtp_user.is_empty() && !smtp_pass.is_empty() {
            let creds = Credentials::new(smtp_user, smtp_pass);
            mailer_builder = mailer_builder.credentials(creds);
        }

        let mailer = mailer_builder.build();

        // Fire and forget (in a real scenario we might await or log success)
        let async_email = email.to_string();
        tokio::spawn(async move {
            match mailer.send(email_msg).await {
                Ok(_) => println!("Passcode sent securely via SMTP to {}", async_email),
                Err(e) => eprintln!("Failed to send SMTP email to {}: {:?}", async_email, e),
            }
        });

        // Store with 5-minute TTL
        self.store_passcode(email, &passcode).await?;

        let _ = crate::api_security::SecurityLogger::log(
            &self.storage.pool,
            "LoginRequest",
            ip,
            Some(&format!("Passcode sent to {}", email)),
        )
        .await;

        Ok(())
    }

    async fn verify_challenge(
        &self,
        email: &str,
        code: &str,
        ip: Option<&std::net::IpAddr>,
    ) -> Result<AuthSession, AuthError> {
        // 1. Get User Role
        let row = sqlx::query("SELECT role FROM users WHERE email = ?")
            .bind(email)
            .fetch_one(&self.storage.pool)
            .await
            .map_err(|_| AuthError::Unauthorized)?;

        let role_str: String = row.get(0);
        let role = match role_str.as_str() {
            "Admin" => UserRole::Admin,
            "Contributor" => UserRole::Contributor,
            _ => return Err(AuthError::InternalError),
        };

        // 2. Verify and immediately purge to prevent reuse
        let is_valid = self.check_and_purge_passcode(email, code).await?;

        if !is_valid {
            let _ = crate::api_security::SecurityLogger::log(
                &self.storage.pool,
                "LoginFail",
                ip,
                Some(&format!("Failed authentication attempt for {}", email)),
            )
            .await;
            return Err(AuthError::InvalidPasscode);
        }

        let expires_at = chrono::Utc::now().timestamp() + 3600; // 1 hour session
        let token = uuid::Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO sessions (token, email, role, expires_at) VALUES (?, ?, ?, ?)")
            .bind(&token)
            .bind(email)
            .bind(role_str.as_str())
            .bind(expires_at)
            .execute(&self.storage.pool)
            .await
            .map_err(|_| AuthError::InternalError)?;

        let _ = crate::api_security::SecurityLogger::log(
            &self.storage.pool,
            "LoginSuccess",
            ip,
            Some(&format!("Successful login for {}", email)),
        )
        .await;

        Ok(AuthSession {
            email: email.to_string(),
            role,
            token,
            expires_at: expires_at as u64,
        })
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             3. THE GATEKEEPER                              //
//                        (Security & Constraints)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl AdminPortal {
    fn check_honeypot(&self, bot_field: &str) -> Result<(), AuthError> {
        if !bot_field.is_empty() {
            return Err(AuthError::SecurityViolation("Bot activity detected".into()));
        }
        Ok(())
    }

    async fn store_passcode(&self, email: &str, code: &str) -> Result<(), AuthError> {
        let expires_at = chrono::Utc::now().timestamp() + 300; // 5 mins
        sqlx::query(
            "INSERT OR REPLACE INTO pending_auths (email, passcode, expires_at) VALUES (?, ?, ?)",
        )
        .bind(email)
        .bind(code)
        .bind(expires_at)
        .execute(&self.storage.pool)
        .await
        .map_err(|_| AuthError::InternalError)?;
        Ok(())
    }

    async fn check_and_purge_passcode(&self, email: &str, code: &str) -> Result<bool, AuthError> {
        let now = chrono::Utc::now().timestamp();
        let row =
            sqlx::query("SELECT passcode FROM pending_auths WHERE email = ? AND expires_at > ?")
                .bind(email)
                .bind(now)
                .fetch_optional(&self.storage.pool)
                .await
                .map_err(|_| AuthError::InternalError)?;

        if let Some(row) = row {
            let db_code: String = row.get(0);
            if db_code == code {
                // Purge
                sqlx::query("DELETE FROM pending_auths WHERE email = ?")
                    .bind(email)
                    .execute(&self.storage.pool)
                    .await
                    .map_err(|_| AuthError::InternalError)?;
                return Ok(true);
            }
        }
        Ok(false)
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               4. THE ERRORS                                //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Security Breach: {0}")]
    SecurityViolation(String),

    #[error("Invalid Passcode")]
    InvalidPasscode,

    #[error("Access Denied")]
    Unauthorized,

    #[error("System Error")]
    InternalError,
}
