use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::SqlitePool;
use std::net::IpAddr;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (IP Extraction & Types)                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct ClientIp(pub IpAddr);

#[async_trait]
impl<S> FromRequestParts<S> for ClientIp
where
    S: Send + Sync,
{
    type Rejection = (axum::http::StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // In a real scenario, this would check X-Forwarded-For or similar
        // For local dev/stubs, we fallback to localhost
        let ip = parts
            .uri
            .host()
            .and_then(|h| h.parse().ok())
            .unwrap_or(IpAddr::from([127, 0, 0, 1]));
        Ok(ClientIp(ip))
    }
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Rate Limiting Logic)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct RateLimiter;

impl RateLimiter {
    pub async fn check_rate_limit(
        _pool: &SqlitePool,
        _ip: &IpAddr,
        _action: &str,
        _limit: u32,
        _window_seconds: u32,
    ) -> Result<bool, sqlx::Error> {
        // Mock rate limiter - always allows
        Ok(true)
    }
}
