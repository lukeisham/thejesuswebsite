# The Jesus Website

A historical evidence platform for the life of Jesus. Records (the core data element) can be explored via interactive maps, timelines, and arbor diagrams. The site also features contextual essays, challenge–response pages, curated resources, and a Wikipedia article ranking.

An admin dashboard provides AI-powered tools for collating challenges and Wikipedia articles.

---

## Architecture

```
thejesuswebsite/
├── app/                      # Rust workspace crates
│   ├── app_core/             # Domain types, models, validation
│   ├── app_brain/            # AI integration (OpenAI, Candle)
│   ├── app_storage/          # Persistence layer (ChromaDB)
│   ├── app_schema/           # Schema codegen and definitions
│   └── app_ui/               # Axum web server (entry point binary)
├── frontend/
│   ├── public/               # JS served to all visitors
│   ├── private/              # JS for authenticated admin pages
│   └── static/               # CSS, images, fonts
├── .github/workflows/ci.yml  # GitHub Actions CI pipeline
├── cargo.toml                # Workspace manifest
├── dockerfile                # Multi-stage production build
├── docker.yml                # Compose: app + ChromaDB
├── makefile                  # Developer shortcuts
├── openai.yml                # AI model profiles and limits
├── build.rs                  # Injects BUILD_TIMESTAMP and GIT_HASH
├── rust_toolchain.toml       # Pins Rust to 1.85.0
├── rustfmt.toml              # Code formatting rules
├── clippy.toml               # Linting thresholds (MSRV 1.85.0)
└── sitemap.md                # Full project structure reference
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML/CSS/JS (served by Axum) |
| Backend | Rust 1.85.0, Axum |
| AI | OpenAI API, Candle (local inference) |
| Database | ChromaDB (vector store) |
| CI/CD | GitHub Actions |
| Deployment | Docker → VPS |

### Key Config Files

| File | Purpose |
|---|---|
| `openai.yml` | Model profiles (`reasoning`, `structured_data`, `utility`), embedding config, budget limits |
| `.env` / `.env.example` | Runtime secrets — **never commit `.env`** |
| `build.rs` | Embeds `BUILD_TIMESTAMP` and `GIT_HASH` at compile time |

---

## Prerequisites

- **Rust 1.85.0** — installed automatically via `rust_toolchain.toml`
- **Docker & Docker Compose** — for ChromaDB and production builds
- **An OpenAI API key** — for AI features

---

## Pushing to Github and related BASH

# 1. Add all changed files to the 'staging area'
git add .

# 2. Create a snapshot of these changes with a message
git commit -m "Update openai.yml for DeepSeek and cleanup"

# 3. Send the changes to GitHub
git push origin main

git add .
git commit -m "Update openai.yml for DeepSeek and cleanup"
git push origin main