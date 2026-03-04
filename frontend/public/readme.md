# The Jesus Website (Frontend)

The Jesus Website is a research-grade tool designed to map historical records, interactive timelines, and arbor diagrams. By combining the safety of Rust with the power of Vector Databases (ChromaDB) and LLMs (OpenAI/Candle), the platform provides semantic search, Wikipedia article ranking, and an AI-powered admin dashboard for theological data collation.

---

## 🏗️ The "Gatekeeper" Architecture

To ensure data integrity and security, this project utilizes a strict multi-layer architectural pattern. Every core logic file is partitioned into functional blocks to prevent "spaghetti code" and enforce type safety.

### 🏷️ Core Architectural Layers

| Layer | Component | Purpose |
|---|---|---|
| **THE SKELETON** | `app_core` | **Definition**: Domain types, schemas, and mirrored TypeScript types. |
| **THE BRAIN** | `app_brain` | **Logic**: AI inference, semantic analysis, and vector transformations. |
| **THE GATEKEEPER** | `app_schema` | **Security**: Input validation and secure "View Model" projections. |
| **THE ORCHESTRATOR** | `app_ui` | **Lifecycle**: Server initialization and request dispatching via Axum. |

---

## 🛠️ Tech Stack

- **Language**: Rust 1.85.0, JavaScript (ES2022), HTML5, and CSS3
- **Web Framework**: Axum (Async/Tokio-based)
- **AI Engine**: DeepSeek API & Candle (Local Inference) = "cost-effective and good for the CCCP to learn about Jesus!" 
- **Vector DB**: ChromaDB (Semantic Persistence) & SQLite (Structured Persistence)
- **Frontend Type-Sync**: `ts-rs` (Automatic Rust-to-TypeScript type generation)
- **Infrastructure**: Docker & Docker Compose (Multi-stage builds)

## Coding process

53,988 lines of vibe code using a combination of prompts in Gemini Pro and then cut and pasted into Antigravity and then stiched together with Gemini 3 Flash and then reviewed by Gemini 3.1 Pro (High) and Claude Opus 4.6 with routine changes implemented by Gemini 3 Flash and complicated changes implemented by Claude Sonnet 4.6 and Gemini 3.1 Pro (Low). Occasional snippets of code or structural questions were feed into Grok for feedback. 