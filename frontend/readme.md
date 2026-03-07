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
├── frontend/                 # Root HTML views
│   ├── js/                   # Centralized JS logic
│   │   └── widgets/          # Traffic-light widget modules (wgt_*.js)
│   ├── maps/                 # Static map resources
│   └── private/              # Authenticated admin pages
│       └── js/               # Authenticated detail scripts (widget_*.js)
├── .github/workflows/ci.yml  # GitHub Actions CI pipeline
├── cargo.toml                # Workspace manifest
├── dockerfile                # Multi-stage production build
├── docker.yml                # Compose: app + ChromaDB
├── makefile                  # Developer shortcuts
├── openai.yml                # AI model profiles and limits
├── build.rs                  # Injects BUILD_TIMESTAMP and GIT_HASH
├── rust_toolchain.toml       # Pins Rust to 1.85.0
├── rustfmt.toml              # Code formatting rules
└── sitemap.md                # Full project structure reference
```
--

### Vibe Coding Rules

Coding checklist
- Is the new content indexed in agent_guide.yml?
- Did I break the Record.rs type safety?
- Are the new Rust functions exposed as Tools?
- Did I update the OpenAPI schema?

HTML/CSS = Atomic Design, Global consistency, Responsive Flow / CSS Grid for Layout, Flexbox for Components. / does the page still function? 

JS = Strict Interface, Error Translation, Lean Passthrough, Idempotency / One script per task / No loss of functionality during rewrites! / Dashboard widgets follow a two-layer pattern: thin traffic-light card wrapper (wgt_*.js) + expandable detail panel (private/js/ script).

RUST = No-Panic, Async First, Type Safety, Security Gatekeeping / Documentation Comments (///) on all Public Traits and Tools. / Don't drop code during rewrites!

SQL =  Migration-First, Atomic Transactions, Explicit Relationships, Normalized Integrity / keep the code tidy / is all the data still being stored? 

---

### Codebase logic

Record.rs (source of turth) = containts key data -> edited in dashboard.html -> presented in evidence.html and timeline.html and maps.html -> linked to lists in resources.html and essays.html and responses.html / Bonus news-crawler and blog, contextual essay + Wikipedia ranking + Challenge response system. Blog articles, Essays and responses created in dashboard.html. 

Wikipedia Engine-loop (weekly) = results collected from Wikipedia -> ranked + Metadata -> pushed to wikiepedia.html -> new search results merge (but does not replace) previous search results -> ranked + Metadata -> pushed to wikiepedia.html / use UUIDs as primary keys to prevent duplicate entries during these weekly merges

Challenge Engine-loop (monthly) = results collected from challenges -> ranked + Metadata + sorted into academic or popular lists -> pushed to popular_challenge.html or academic_challenge.html -> new search results merge (but does not replace) previous search results -> ranked + Metadata -> pushed to popular_challenge.html or academic_challenge.html / use UUIDs as primary keys to prevent duplicate entries during these weekly merges

Agentic friendliness = every public page must include a <script type="application/ld+json">, plus easy access to Metadata, pdf-print and text-copy functions 

Security = ******

### AI-Agent integration 

AI-Agent integration = monitors server information + uses widgets to support codebase logic. / Widgets = initial database population, spelling (absorbs spellcheck), deadlinks scanner, page metrics (absorbs scraper), Wikipedia engine, Challenge ranking engine, contact triage (absorbs contact), research next actions, server metrics (absorbs server info), token metrics, agent chat, self-reflection (absorbs trace reasoning), agent workflow (absorbs queue), sources manager, security logs, user manager. / Resource lists + agent_guide.yml ("Living Manifest") = loaded daily to set context for AI-Agent / Research next action = static resource set (database) + dynamic search results for suggested resources.

### Codebase nomenclature

Widgets		= wgt_[name].js		/frontend/js/widgets/     # Traffic-light card wrappers
Detail Scripts	= widget_[name].js	/frontend/private/js/     # Full UI — bound by wgt_ wrappers
Tools		= tool_[name].rs	/app_core/src/tools/
Response	= response_[slug].html	/frontend/response/
Essays		= essay_[slug].html	/frontend/context/
Blog		= blog_[blogpost].html	/frontend/blog/
Wikipedia Engine = describes the files to support the Wikipdia search and ranking process
Challenge Engine = describes the files to suppport the Challenge search and ranking process
Metadata = srict RUST type that supports AI searching and scrapping

### Codebase user-comments

JS Script = highlight the key function + Sticky Comments: "Crucial logic blocks must be wrapped in // START [FUNCTION_NAME] and // END tags." 
RUST = use big headings seperating the definitions from handling and actions and error handling + Sticky Comments: "Crucial logic blocks must be wrapped in // START [FUNCTION_NAME] and // END tags." 
SQL = very structured very clear comemnts everywhere
HMTL = use comemnts only to highligth variations 

---

### Describing layouts

Col 1       Col 2
       (250px)      (1fr)
        ┌───────┬──────────────────┐
Row 1+  │ Side  │  Header          │
  ...   │ bar   │  Intro text      │
Row N   │ (all  │  Hero / Search   │
        │ rows) │  Record Grid     │
        ├───────┴──────────────────┤
Row N+1 │ Footer (a-col-span-full) │
        └──────────────────────────┘

---

## Pushing to Github

git add .
git commit -m "login page POST fixed"
git push origin main

update files



on my VPS

git pull
docker compose build agentic_hub
docker compose up -d agentic_hub


to check if latest repo is on the server

cd ~/apps/thejesuswebsite
git log -1 --oneline

