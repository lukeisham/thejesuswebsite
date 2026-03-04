// 🦴 Skeleton

/// Its job is to weave your Rust types into other languages
/// (like TypeScript for your frontend or OpenAPI specs for app_ui).
/// This is the ultimate Security Gatekeeping move: it ensures that your
/// Frontend cannot even try to send a request that your Backend doesn't recognize.

// 🧠 Brain

/// Entry point for generating all external schemas.
/// Called by a build script or a specific CLI command.
pub fn generate_all() -> Result<(), std::io::Error> {
    generate_typescript_bindings()?;
    generate_openapi_spec()?;
    Ok(())
}

fn generate_typescript_bindings() -> Result<(), std::io::Error> {
    // We use a "No-Panic" approach by handling IO errors properly.
    // This uses the `ts-rs` crate to export our #[derive(TS)] models.
    println!("Generating TypeScript bindings...");

    // Logic to walk through your Types and export them to
    // ./frontend/src/types/generated.ts
    // In a real project, this often triggers specifically defined
    // export functions or runs the ts-rs export command.

    Ok(())
}

fn generate_openapi_spec() -> Result<(), std::io::Error> {
    // 🛡️ Gatekeeper

    // Logic for utoipa or similar crates to create the JSON/YAML
    // that describes your app_brain/api.rs endpoints.
    println!("Generating OpenAPI specification...");

    Ok(())
}
