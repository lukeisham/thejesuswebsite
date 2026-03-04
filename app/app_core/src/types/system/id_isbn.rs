
use serde::{Serialize, Deserialize};
use std::fmt;

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             1. THE SKELETON                                //
//                          (Data Types & Schema)                             //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

/// A validated ISBN identifier.
/// Internally stored as a 13-digit string (normalized) to ensure 
/// compatibility with modern systems, while supporting ISBN-10 inputs.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Isbn(String);

/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                               2. THE BRAIN                                 //
//                          (Business Logic & Handlers)                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/

impl Isbn {
    /// Async-ready parser for ISBN strings.
    /// Handles both ISBN-10 and ISBN-13, normalizing to ISBN-13.
    pub async fn parse(raw: &str) -> Result<Self, IsbnError> {
        let cleaned = Self::clean_input(raw);
        
        // The Brain decides which Gatekeeper to call based on length
        let normalized = match cleaned.len() {
            10 => Self::gatekeep_isbn10(&cleaned)?,
            13 => Self::gatekeep_isbn13(&cleaned)?,
            _ => return Err(IsbnError::InvalidLength(cleaned.len())),
        };

        Ok(Self(normalized))
    }

    /// Internal helper to strip hyphens and whitespace.
    fn clean_input(raw: &str) -> String {
        raw.chars()
            .filter(|c| c.is_ascii_digit() || *c == 'X' || *c == 'x')
            .collect::<String>()
            .to_uppercase()
    }

    /// Returns a hyphenated version for human readability (EAN format).
    pub fn display_formatted(&self) -> String {
        format!(
            "{}-{}-{}-{}-{}",
            &self.0[0..3], &self.0[3..4], &self.0[4..7], &self.0[7..12], &self.0[12..13]
        )
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

impl Isbn {
    /// Security Gate: Validates ISBN-13 using MOD 10 checksum.
    fn gatekeep_isbn13(s: &str) -> Result<String, IsbnError> {
        let mut sum = 0;
        for (i, c) in s.chars().enumerate() {
            let digit = c.to_digit(10).ok_or(IsbnError::InvalidCharacter)?;
            if i % 2 == 0 {
                sum += digit;
            } else {
                sum += digit * 3;
            }
        }

        if sum % 10 == 0 {
            Ok(s.to_string())
        } else {
            Err(IsbnError::ChecksumMismatch)
        }
    }

    /// Security Gate: Validates ISBN-10 (MOD 11) and upgrades to ISBN-13.
    fn gatekeep_isbn10(s: &str) -> Result<String, IsbnError> {
        let mut sum = 0;
        for (i, c) in s.chars().take(9).enumerate() {
            let digit = c.to_digit(10).ok_or(IsbnError::InvalidCharacter)?;
            sum += (10 - i as u32) * digit;
        }

        let check_char = s.chars().nth(9).unwrap();
        let check_val = if check_char == 'X' {
            10
        } else {
            check_char.to_digit(10).ok_or(IsbnError::InvalidCharacter)?
        };

        if (sum + check_val) % 11 != 0 {
            return Err(IsbnError::ChecksumMismatch);
        }

        // Upgrade: Prepend 978 and recalculate checksum for the Brain
        let upgraded = format!("978{}", &s[..9]);
        Self::gatekeep_isbn13(&format!("{}{}", upgraded, Self::calc_isbn13_check(&upgraded)))
    }

    fn calc_isbn13_check(s: &str) -> u32 {
        let mut sum = 0;
        for (i, c) in s.chars().enumerate() {
            let digit = c.to_digit(10).unwrap();
            sum += if i % 2 == 0 { digit } else { digit * 3 };
        }
        (10 - (sum % 10)) % 10
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

#[derive(Debug, thiserror::Error)]
pub enum IsbnError {
    #[error("Invalid ISBN length: expected 10 or 13, found {0}")]
    InvalidLength(usize),

    #[error("ISBN contains invalid characters")]
    InvalidCharacter,

    #[error("ISBN Checksum failed mathematical validation")]
    ChecksumMismatch,

    #[error("Registry Error: This ISBN has not been issued to a publisher")]
    UnregisteredPublisher,
}

impl fmt::Display for Isbn {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "ISBN-13: {}", self.0)
    }
}