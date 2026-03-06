use axum::{
    body::Body,
    extract::Request,
    http::{header::COOKIE, Response, StatusCode},
    middleware::Next,
    response::{IntoResponse, Redirect},
};
use hex;
use hmac::{Hmac, Mac};
use reqwest;
use serde_json::json;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

const SESSION_COOKIE_NAME: &str = "admin_session";
const SESSION_TTL_SECONDS: u64 = 4 * 60 * 60; // 4 hours

/// Creates a signed session cookie value: `email|expiry_ts|hmac_hex`
pub fn create_session_cookie(email: &str, secret: &str) -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let expiry = now + SESSION_TTL_SECONDS;

    let payload = format!("{}|{}", email, expiry);

    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(payload.as_bytes());
    let signature = mac.finalize().into_bytes();
    let signature_hex = hex::encode(signature);

    let result = format!("{}|{}", payload, signature_hex);
    result
}

/// Validates a session cookie value. Returns Ok(email) if valid and not expired.
pub fn validate_session(cookie_val: &str, secret: &str) -> Result<String, &'static str> {
    let parts: Vec<&str> = cookie_val.split('|').collect();
    if parts.len() != 3 {
        return Err("Invalid cookie format");
    }

    let email = parts[0];
    let expiry_str = parts[1];
    let signature_hex = parts[2];

    // Check expiry
    let expiry: u64 = expiry_str.parse().map_err(|_| "Invalid expiry format")?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    if now > expiry {
        return Err("Session expired");
    }

    // Reconstruct payload and verify signature
    let payload = format!("{}|{}", email, expiry_str);
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(payload.as_bytes());

    let expected_sig = mac.finalize().into_bytes();
    let expected_sig_hex = hex::encode(expected_sig);

    if signature_hex != expected_sig_hex {
        return Err("Invalid signature");
    }

    Ok(email.to_string())
}

/// Axum Middleware to protect `/private/*` routes.
/// Note: Needs to have access to AppState's session_secret.
pub async fn auth_middleware(
    axum::extract::State(state): axum::extract::State<std::sync::Arc<crate::server::AppState>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response<Body>, StatusCode> {
    let path = req.uri().path();

    // Exemptions (handle both absolute and relative paths for nesting)
    if path == "/private/login.html"
        || path == "/login.html"
        || path.starts_with("/private/js/")
        || path.starts_with("/js/")
    {
        return Ok(next.run(req).await);
    }

    // Check cookie
    let mut is_authenticated = false;

    if let Some(cookie_header) = req.headers().get(COOKIE) {
        if let Ok(cookie_str) = cookie_header.to_str() {
            // Very basic cookie parsing since we know what we are looking for
            // e.g. "admin_session=DATA; other=DATA"
            for cookie_part in cookie_str.split(';') {
                let cookie_part = cookie_part.trim();
                if let Some(stripped) =
                    cookie_part.strip_prefix(&format!("{}=", SESSION_COOKIE_NAME))
                {
                    if validate_session(stripped, &state.session_secret).is_ok() {
                        is_authenticated = true;
                    }
                    break;
                }
            }
        }
    }

    if is_authenticated {
        Ok(next.run(req).await)
    } else {
        // Redirect to login
        Ok(Redirect::temporary("/login.html").into_response())
    }
}

/// Posts a 6-digit passcode to a Slack webhook.
pub async fn send_passcode_to_slack(
    code: &str,
    webhook_url: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let msg = json!({
        "text": format!("🚨 *Admin Login Request*\nYour authentication passcode is: `{}`\n_(Valid for 5 minutes)_", code)
    });

    let response = client.post(webhook_url).json(&msg).send().await?;

    if !response.status().is_success() {
        let status = response.status();
        let err_body = response.text().await.unwrap_or_default();
        tracing::error!("Failed to send Slack webhook: {} - {}", status, err_body);
        return Err(format!("Slack API error: {}", status).into());
    } else {
        tracing::info!("Passcode successfully sent to Slack.");
    }

    Ok(())
}
