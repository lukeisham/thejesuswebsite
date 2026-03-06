use crate::{auth, server::AppState};
use axum::{
    extract::{ConnectInfo, Json, State},
    http::{header, header::HeaderValue, HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Deserialize)]
pub struct LoginReq {
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub error: Option<String>,
}

pub async fn handle_login(
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginReq>,
) -> impl IntoResponse {
    let ip = addr.ip();

    // Rate limiting check (Flood Control)
    {
        let mut attempts = state.login_attempts.write().await;
        let now = Instant::now();
        let (count, last_attempt) = attempts.get(&ip).cloned().unwrap_or((0, now));

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

        attempts.insert(ip, (count + 1, now));
    }

    // Single-Factor Password Check
    if payload.password != state.sfa_pass {
        return (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                error: Some("Wrong password".to_string()),
            }),
        )
            .into_response();
    }

    // Success - All users are Admin
    let admin_email = state.admin_email.clone();
    let cookie_val = auth::create_session_cookie(&admin_email, &state.session_secret);

    let mut headers = HeaderMap::new();
    let cookie_str = format!("admin_session={}; Path=/; HttpOnly; SameSite=Lax", cookie_val);
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
