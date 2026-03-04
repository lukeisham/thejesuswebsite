# The Jesus Website

A historical evidence platform for the life of Jesus. Records (the core data element) can be explored via interactive maps, timelines, and arbor diagrams. The site also features contextual essays, challenge–response pages, curated resources, and a Wikipedia article ranking.

An admin dashboard provides AI-powered tools for collating challenges and Wikipedia articles.

## Contents

- [Coding process](#coding-process)
- [AI Coding Standards](#ai-coding-standards)
- [App Logic](#app-logic)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Commands](#development-commands)
- [CI Pipeline](#ci-pipeline)
- [Building for Production](#building-for-production)
- [Deploying to VPS](#deploying-to-vps)
- [Environment Variables](#environment-variables)

---

## AI Coding Standards

To ensure architectural clarity and ease of maintenance by multiple AI agents (Gemini, Claude, Grok), this project follows a strict **Block Heading** structure. Every core logic file is divided into the following functional sections:

### 📐 Standard Block Template
```rust
/*
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                             [NUMBER]. [TITLE]                              //
//                         ([Short Description])                       //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
*/
```

### 🏷️ Section Definitions

| Title | Purpose | Typical Contents |
|---|---|---|
| **THE SKELETON** | Foundation & Data | Structs, Enums, Type aliases, Schema definitions |
| **THE BRAIN** | Logic & Processing | Core business logic, Algorithms, Request handlers |
| **THE GATEKEEPER** | Security & Validation | Middleware, Auth checks, Input sanitization |
| **THE ORCHESTRATOR** | Startup & Lifecycle | `main()` function, Server init, Dependency injection |

### Vibe coding rules for RUST files

No-Panic, Async First, Type Safety, Security Gatekeeping, WASM compatibility / Don't drop code during rewrites

### Vibe coding rules for JS files

Strict Interface, Error Translation, Lean Passthrough / Don't drop code during rewrites

### Vibe coding rules for HTML files

Atomic Design, Global consistency (style.css), Grids everywhere / Don't drop code during rewrites

---

## App Logic & System Architecture

This project is built as an **AI-friendly knowledge graph**. The core architecture separates public-facing data discovery from secure administrative management.

### 1. Core Data Entity: The Record
The central unit of the application is the **Record** (referred to internally as "Evidence").
* **Primary View:** The homepage provides discovery, searching, and viewing of `Record` entities.
* **State Management:** Only users with `Admin` or `Contributor` roles can modify a `Record`.
* **Data Visualization:** `Record` data is the source of truth for the **Map**, **Timeline**, and the **Ardor Tree-style layout**.

### 2. Supporting Content Modules
* **Contextual Layers:** `Records` are supported by `Essay` and `Response` entities (which address specific `Challenges`).
* **Resources:** `ResourceLists` provide curated external references linked to specific records.
* **Wikipedia:** A ranking module that processes and displays Wikipedia-based data.
* **Support Pages:** Support features including `About`, `Donate`, and `Contact`.

### 3. Technical Implementation
AI agents should follow these structural patterns when contributing to the codebase:

* **Logic Layer (Rust):** * Data structures are defined as strict Rust types.
    * **AI Actions:** Automation and API interactions (e.g., list processing) are implemented as **Traits**.
* **Persistence Layer (Hybrid Database):**
    * **ChromaDB:** Stores vector embeddings for semantic search and AI-driven retrieval.
    * **SQLite:** Stores all structured relational data, hierarchies, and user metadata.
* **Frontend Layer:** * Built with HTML/CSS and vanilla JS.
    * **AI-Friendliness:** The DOM structure is optimized for scraping and LLM readability.
* **Security Model:** * **Public Layer:** Open-access data schema intended for AI transparency.
    * **Admin Layer:** Secure middleware gates all mutation logic and sensitive configurations.

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

## Getting Started

### 1. Clone and configure

```bash
git clone https://github.com/lukeisham/thejesuswebsite.git
cd thejesuswebsite
cp .env.example .env
# Edit .env with your real keys
```

### 2. Start infrastructure

```bash
make docker-up          # Starts ChromaDB on localhost:8000
```

### 3. Run the app locally

```bash
make dev                # Runs app_ui on localhost:8080
```

### 4. Open in browser

```
http://localhost:8080
```

---

## Development Commands

All commands are defined in the `makefile`. Run `make help` for the full list.

| Command | What it does |
|---|---|
| `make dev` | Run `app_ui` in debug mode |
| `make check` | Fast workspace-wide type check |
| `make fmt` | Format all code (uses `rustfmt.toml`) |
| `make lint` | Run Clippy with `-D warnings` |
| `make test` | Run all workspace tests |
| `make test-unit` | Run only unit tests — no external services needed |
| `make test-integration` | Run integration tests — requires `make docker-up` first |
| `make build` | Build the release binary |
| `make ready` | **Pre-push gate**: fmt → lint → test |
| `make docker-up` | Start ChromaDB and services |
| `make docker-down` | Stop all services |
| `make clean` | Remove `target/` and logs |

---

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs automatically on:
- **Push** to `main` or `develop`
- **Pull requests** targeting `main`

### Jobs

1. **Rustfmt** — rejects unformatted code
2. **Clippy** — rejects any warnings (cached with `Swatinem/rust-cache`)
3. **Test Suite** — runs `cargo test --workspace`

---

## Building for Production

### Docker (recommended)

```bash
# Build the image
docker build -t thejesuswebsite .

# Run standalone
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=sk-... \
  -e CHROMA_URL=http://chroma:8000 \
  thejesuswebsite

# Or use Compose (app + ChromaDB together)
docker compose -f docker.yml up -d
```

The Dockerfile uses a 4-stage build with `cargo-chef` for dependency caching:
1. **Planner** — generates a dependency recipe
2. **Cacher** — pre-builds dependencies (cached across builds)
3. **Builder** — compiles `app_ui` in release mode
4. **Runtime** — minimal Debian Slim image with the binary + frontend assets

### Native binary

```bash
make build              # outputs to target/release/app_ui
./target/release/app_ui
```

---

## Deploying to VPS

### First-time setup

```bash
# On your VPS
sudo apt update && sudo apt install docker.io docker-compose -y
sudo systemctl enable docker

# Clone the repo
git clone https://github.com/YOUR_USERNAME/thejesuswebsite.git
cd thejesuswebsite

# Configure environment
cp .env.example .env
nano .env               # Set production values:
                        #   APP_ENV=production
                        #   BASE_URL=https://yourdomain.com
                        #   OPENAI_API_KEY=sk-...
                        #   SESSION_SECRET=$(openssl rand -base64 32)
```

### Deploy / update

```bash
# On your local machine
make ready              # Ensure code passes fmt + lint + test
git add -A && git commit -m "release: description"
git push origin main

# On your VPS
cd thejesuswebsite
git pull origin main
docker compose -f docker.yml up -d --build
```

### Verify

```bash
# Check containers are running
docker ps

# Check logs
docker logs app_brain_ui --tail 50

# Health check
curl http://localhost:8080
```

---

## Environment Variables

See `.env.example` for all available variables. Critical ones:

| Variable | Required | Description |
|---|---|---|
| `APP_PORT` | Yes | Port the server binds to (default: `8080`) |
| `APP_ENV` | Yes | `development` or `production` |
| `BASE_URL` | Yes | Public URL of the app |
| `OPENAI_API_KEY` | Yes | OpenAI API key for `app_brain` |
| `CHROMA_URL` | Yes | ChromaDB endpoint |
| `SESSION_SECRET` | Yes | Random string for cookie signing |
| `GITHUB_TOKEN` | No | For private crate access |
| `GITHUB_CLIENT_ID` | No | For GitHub OAuth login |
| `GITHUB_CLIENT_SECRET` | No | For GitHub OAuth login |
| `OPENAI_ORG_ID` | No | OpenAI organization ID |

