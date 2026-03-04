use std::process::Command;
use std::time::SystemTime;

fn main() {
    // 1. Rerun triggers — rebuild if these change
    println!("cargo:rerun-if-changed=frontend/static");
    println!("cargo:rerun-if-changed=frontend/public");
    println!("cargo:rerun-if-changed=frontend/assets");
    println!("cargo:rerun-if-changed=app/app_schema/src");
    println!("cargo:rerun-if-changed=openai.yml");

    // 2. Inject Build Metadata as compile-time environment variables
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", now);

    // 3. Git hash for versioning (fails gracefully if not in a git repo)
    let git_hash = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=GIT_HASH={}", git_hash.trim());
}
