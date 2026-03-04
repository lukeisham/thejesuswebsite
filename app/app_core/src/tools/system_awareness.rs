use anyhow::{Context, Result};
use std::fs;

/// READ-ONLY: Loads the agent_guide.yml to provide the agent with
/// its current mission, schema version, and directory map.
pub fn read_agent_manifest() -> Result<String> {
    // START read_agent_manifest

    // We check multiple locations because the current working directory
    // depends on whether the code is running via `cargo run` at the workspace root,
    // inside the `app` folder, or in a Docker container.
    let possible_paths = vec![
        "./agent_guide.yml",             // Root workspace execution
        "../agent_guide.yml",            // Executed from within `app`
        "../../agent_guide.yml",         // Executed from within `app_core`
        "./.well-known/agent_guide.yml", // User's original suggested path
        "/app/agent_guide.yml",          // Fallback for Docker container
    ];

    for path in possible_paths {
        if let Ok(content) = fs::read_to_string(path) {
            return Ok(content);
        }
    }

    // If we escape the loop, we failed to find the manifest anywhere.
    Err(anyhow::anyhow!(
        "Could not locate agent_guide.yml in any of the expected directories."
    ))
    .context("Failed reading agent manifest")

    // END read_agent_manifest
}
