//! # App Schema
//! The source of truth for all shared types, constants, and the gateway for
//! frontend code generation. It ensures byte-for-byte consistency between
//! the Rust Brain and the TypeScript UI.

// 🦴 Skeleton
pub mod codegen;
pub mod frontend;
pub mod static_data;

// 🧠 Brain
pub use static_data::ContentCategory;
