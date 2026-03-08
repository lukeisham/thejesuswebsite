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
    // 🛡️ Gatekeeper
    println!("Generating TypeScript bindings...");

    // In a full implementation, this would use `wasm-pack build`
    // and potentially `ts-rs` to export models to frontend/js/pkg/
    let target_path = std::path::Path::new("frontend/js/pkg");
    if !target_path.exists() {
        std::fs::create_dir_all(target_path)?;
    }

    println!("TypeScript bindings (stubs) initialized in {:?}", target_path);
    Ok(())
}

fn generate_openapi_spec() -> Result<(), std::io::Error> {
    // 🛡️ Gatekeeper

    // Logic for utoipa or similar crates to create the JSON/YAML
    // that describes your app_brain/api.rs endpoints.
    println!("Generating OpenAPI specification...");

    Ok(())
}
