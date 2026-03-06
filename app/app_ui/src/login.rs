use crate::{auth, server::AppState};
use async_trait::async_trait;
use axum::{
    extract::{ConnectInfo, Json, State},
    http::{header, header::HeaderValue, HeaderMap, StatusCode},
    response::IntoResponse,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSession {
    pub email: String,
    pub token: String,
    pub expires_at: u64,
}

#[async_trait]
pub trait Authenticator {
    type Credentials;

    async fn request_challenge(&self, state: &Arc<AppState>, email: &str) -> Result<(), AuthError>;
    async fn verify_challenge(
        &self,
        state: &Arc<AppState>,
        email: &str,
        code: &str,
    ) -> Result<AuthSession, AuthError>;
}

pub struct AdminPortal {
    pub master_email: String,
}

#[async_trait]
impl Authenticator for AdminPortal {
    type Credentials = (String, String);

    async fn request_challenge(&self, state: &Arc<AppState>, email: &str) -> Result<(), AuthError> {
        self.validate_email(email)?;

        let passcode: String = rand::thread_rng().gen_range(100_000..999_999).to_string();

        let expiry = Instant::now() + Duration::from_secs(5 * 60);

        {
            let mut pending = state.pending_passcodes.write().await;
            pending.insert(email.to_string(), (passcode.clone(), expiry));
        }

        // Send logic using Slack
        match auth::send_passcode_to_slack(&passcode, &state.slack_webhook_url).await {
            Ok(_) => Ok(()),
            Err(e) => {
                tracing::error!("Failed to send to slack: {}", e);
                Err(AuthError::InternalError)
            }
        }
    }

    async fn verify_challenge(
        &self,
        state: &Arc<AppState>,
        email: &str,
        code: &str,
    ) -> Result<AuthSession, AuthError> {
        self.validate_email(email)?;

        let is_valid = self.check_and_purge_passcode(state, email, code).await?;

        if !is_valid {
            return Err(AuthError::InvalidPasscode);
        }

        Ok(AuthSession {
            email: email.to_string(),
            token: "secure_server_session_token".to_string(),
            expires_at: 3600, // Deprecated, unused in cookie auth
        })
    }
}

impl AdminPortal {
    fn validate_email(&self, email: &str) -> Result<(), AuthError> {
        let email_lower = email.to_lowercase();
        if email_lower != self.master_email.to_lowercase() {
            return Err(AuthError::Unauthorized);
        }
        Ok(())
    }

    async fn check_and_purge_passcode(
        &self,
        state: &Arc<AppState>,
        email: &str,
        code: &str,
    ) -> Result<bool, AuthError> {
        let mut pending = state.pending_passcodes.write().await;

        if let Some((stored_code, expiry)) = pending.get(email) {
            if Instant::now() > *expiry {
                pending.remove(email);
                return Ok(false);
            }
            if stored_code == code {
                pending.remove(email);
                return Ok(true);
            }
        }
        Ok(false)
    }
}

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

// --- Axum API Handlers ---

#[derive(Deserialize)]
pub struct SendPasscodeReq {
    pub email: String,
}

#[derive(Deserialize)]
pub struct VerifyPasscodeReq {
    pub email: String,
    pub passcode: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub error: Option<String>,
}

pub async fn handle_send_passcode(
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SendPasscodeReq>,
) -> impl IntoResponse {
    let ip = addr.ip();

    // Rate limiting check
    {
        let mut attempts = state.login_attempts.write().await;
        // Explicitly type hints to help rust-analyzer
        let attempts_map: &mut std::collections::HashMap<std::net::IpAddr, (u32, Instant)> =
            &mut *attempts;
        let now = Instant::now();
        let (count, last_attempt) = attempts_map.get(&ip).cloned().unwrap_or((0, now));

        // Reset if window (15 mins) passed
        let count = if now.duration_since(last_attempt) > Duration::from_secs(15 * 60) {
            0
        } else {
            count
        };

        if count >= 5 {
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(AuthResponse {
                    success: false,
                    error: Some("Too many attempts. Please try again later.".to_string()),
                }),
            )
                .into_response();
        }

        attempts_map.insert(ip, (count + 1, now));
    }

    let portal = AdminPortal {
        master_email: state.admin_email.clone(),
    };

    match portal.request_challenge(&state, &payload.email).await {
        Ok(_) => Json(AuthResponse {
            success: true,
            error: None,
        })
        .into_response(),
        Err(e) => {
            // We still return 200 Success even if unauthorized to prevent email enumeration
            let success = !matches!(e, AuthError::InternalError | AuthError::SecurityViolation(_));
            let error = if !success { Some(e.to_string()) } else { None };
            Json(AuthResponse { success, error }).into_response()
        }
    }
}

pub async fn handle_verify_passcode(
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<VerifyPasscodeReq>,
) -> impl IntoResponse {
    let _ip = addr.ip(); // Could also rate limit verification if needed

    let portal = AdminPortal {
        master_email: state.admin_email.clone(),
    };

    match portal
        .verify_challenge(&state, &payload.email, &payload.passcode)
        .await
    {
        Ok(_) => {
            // Set Cookie!
            let cookie_val = auth::create_session_cookie(&payload.email, &state.session_secret);

            let mut headers = HeaderMap::new();
            let cookie_str =
                format!("admin_session={}; Path=/; HttpOnly; SameSite=Lax", cookie_val);
            if let Ok(hv) = HeaderValue::from_str(&cookie_str) {
                headers.insert(header::SET_COOKIE, hv);
            }

            (
                StatusCode::OK,
                headers,
                Json(AuthResponse {
                    success: true,
                    error: None,
                }),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                error: Some(e.to_string()),
            }),
        )
            .into_response(),
    }
}

pub async fn handle_logout() -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    // Clear cookie by setting expiry in the past
    let cookie_str = "admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    if let Ok(hv) = HeaderValue::from_str(cookie_str) {
        headers.insert(header::SET_COOKIE, hv);
    }

    (
        StatusCode::OK,
        headers,
        Json(AuthResponse {
            success: true,
            error: None,
        }),
    )
        .into_response()
}
