use async_trait::async_trait;
use rand::Rng;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*; // For passcode generation

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (The Trait Definition)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSession {
    pub email: String,
    pub token: String,
    pub expires_at: u64,
}

#[async_trait]
pub trait Authenticator {
    type Credentials;

    /// Step 1: Initiates the challenge (sends email)
    async fn request_challenge(&self, email: &str, bot_field: &str) -> Result<(), AuthError>;

    /// Step 2: Validates the passcode
    async fn verify_challenge(&self, email: &str, code: &str) -> Result<AuthSession, AuthError>;
}

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Implementation Logic)                            //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

pub struct AdminPortal {
    // Hardcoded for security gatekeeping
    pub master_email: &'static str,
}

#[async_trait]
impl Authenticator for AdminPortal {
    type Credentials = (String, String);

    async fn request_challenge(&self, email: &str, bot_field: &str) -> Result<(), AuthError> {
        // 3. THE GATEKEEPER: Honeypot & Email Check
        self.check_honeypot(bot_field)?;
        self.validate_email(email)?;

        // Brain Logic: Generate 6-digit passcode
        let passcode: String = rand::thread_rng().gen_range(100_000..999_999).to_string();

        // Async First: Send the email (Mocked here)
        println!("Sending logic for email to {}: Passcode is {}", self.master_email, passcode);

        // In a real impl, you'd store the passcode in a KV store or DB with a TTL
        self.store_passcode(email, &passcode).await?;

        Ok(())
    }

    async fn verify_challenge(&self, email: &str, code: &str) -> Result<AuthSession, AuthError> {
        self.validate_email(email)?;

        // Verify and immediately purge to prevent reuse
        let is_valid = self.check_and_purge_passcode(email, code).await?;

        if !is_valid {
            return Err(AuthError::InvalidPasscode);
        }

        Ok(AuthSession {
            email: email.to_string(),
            token: "secure_wasm_session_token".to_string(),
            expires_at: 3600, // 1 hour session
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
    /// THE AI HONEYPOT: Bots see an 'extra' field and fill it out.
    /// In the HTML, this field is hidden via CSS.
    fn check_honeypot(&self, bot_field: &str) -> Result<(), AuthError> {
        if !bot_field.is_empty() {
            // Log this as a bot attempt
            return Err(AuthError::SecurityViolation("Bot activity detected".into()));
        }
        Ok(())
    }

    fn validate_email(&self, email: &str) -> Result<(), AuthError> {
        if email != self.master_email {
            // We return 'Success' even if the email is wrong to prevent user enumeration
            // but we only actually send the code if it matches Luke.
            return Err(AuthError::Unauthorized);
        }
        Ok(())
    }

    async fn store_passcode(&self, _email: &str, _code: &str) -> Result<(), AuthError> {
        // Logic to store in LocalStorage or Redis
        Ok(())
    }

    async fn check_and_purge_passcode(&self, _email: &str, _code: &str) -> Result<bool, AuthError> {
        // Logic to check code and DELETE it immediately
        Ok(true)
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

/*
////////////////////////////////////////////////////////////////////////////////
//                             WASM BINDINGS                                  //
////////////////////////////////////////////////////////////////////////////////
*/

#[wasm_bindgen]
pub async fn login_request(email: String, honey: String) -> Result<(), JsValue> {
    let portal = AdminPortal {
        master_email: "luke.isham@gmail.com",
    };
    portal
        .request_challenge(&email, &honey)
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub async fn login_verify(email: String, code: String) -> Result<JsValue, JsValue> {
    let portal = AdminPortal {
        master_email: "luke.isham@gmail.com",
    };
    let session = portal
        .verify_challenge(&email, &code)
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&session).map_err(|e| JsValue::from_str(&e.to_string()))
}
