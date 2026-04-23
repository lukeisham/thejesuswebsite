import re

with open('documentation/guides/guide_function.md', 'r') as f:
    content = f.read()

replacements = [
(r"```text\n\[ User Browser Request \][\s\S]*?```", """```mermaid
graph TD
    User([User Browser Request]) --> Bootstrapper[Foundation Bootstrapper]
    
    subgraph Bootstrapper[Foundation Bootstrapper]
        CSS[1. Load grid.css] --> Layout[2. Load layout logic]
        Layout --> Header[3. Inject header.js]
        Header --> Sidebar[4. Inject sidebar.js]
        Sidebar --> Search[5. Inject search_header.js]
        Search --> Footer[6. Inject footer.js]
    end
    
    Header -.-> SEO[Invisible SEO & og:tags Metadata]
    Sidebar -.-> Nav[Constructs Left Nav Tree + Admin Portal Entry]
    Search -.-> SearchBar[Injects Visible Search Bar]
    Footer -.-> Print[Appends Footer & Print Logic]
    
    Footer --> Container[Main Content Container Loaded]
    Container -.-> Admin[Optional: Redirect to Admin Portal Module 6.1]
```"""),

(r"```text\n\[ Python ETL Pipelines \][\s\S]*?```", """```mermaid
graph TD
    ETL([Python ETL Pipelines<br/>Fetch raw external data]) --> SQLite[(SQLite Database<br/>database.sqlite)]
    Admin([Admin Portal<br/>Manual insertions]) --> SQLite
    
    SQLite --> WASM{{WASM sql.js Engine<br/>In-Memory Browser SQLite}}
    
    WASM --> Sanitize[2.3 Sanitize<br/>sanitize_query.js]
    WASM --> List[2.1 Full Lists<br/>Loops rows into cards]
    WASM --> Single[2.2 Single Record<br/>Deep data merge view]
    
    Sanitize --> Search[Search Logic]
    Single --> JSONLD[json_ld_builder.js]
    JSONLD -.-> SEO[SEO Metadata]
```"""),

(r"```text\n USER ACTION[\s\S]*?```", """```mermaid
sequenceDiagram
    actor User
    User->>search_header.js: Types query "Peter" & hits Enter
    search_header.js->>Browser: Redirect to records.html?search=Peter
    
    rect rgb(240, 240, 240)
        Note over Browser, list_view.js: Page Load Sequence
        Browser->>records.html: Load Page
        records.html->>sql-wasm.js: 1. Init WASM engine
        records.html->>setup_db.js: 2. Fetch DB & fire 'thejesusdb:ready'
        records.html->>list_view.js: 3. Listen for ready event
    end
    
    setup_db.js->>list_view.js: Event: thejesusdb:ready
    list_view.js->>sanitize_query.js: sanitizeSearchTerm("Peter")
    sanitize_query.js-->>list_view.js: Returns clean string "Peter"
    
    list_view.js->>setup_db.js: db.searchRecords("Peter", 50)
    Note over setup_db.js: SELECT id, title...<br/>WHERE title LIKE '%Peter%'
    setup_db.js-->>list_view.js: Returns Array of matching rows
    
    list_view.js->>DOM: Build HTML & inject to #record-list
    Note over DOM: Title reads "Search Results: 'Peter'"
```"""),

(r"```text\n \[ Admin Editor: edit_picture.js \][\s\S]*?```", """```mermaid
graph TD
    Admin([Admin Editor: edit_picture.js]) -->|Select PNG file| API[POST /api/admin/records/id/picture]
    API --> AdminAPI[admin_api.py<br/>Validates PNG]
    
    AdminAPI --> Processor[image_processor.py]
    
    subgraph Processor[image_processor.py]
        R1[Resize to max 800px width] --> R2[Compress to <= 250KB]
        R2 --> R3[Generate 200px thumbnail]
    end
    
    Processor --> DB[(SQLite Database<br/>UPDATE record)]
    DB -.->|Sets| P1[picture_name]
    DB -.->|Sets| P2[picture_bytes]
    DB -.->|Sets| P3[picture_thumbnail]
    
    DB --> Success([Returns 200 OK + filename])
    Success --> Preview[edit_picture.js renders preview]
```"""),

(r"```text\n \[ Admin Editor: edit_bulk_upload.js \][\s\S]*?```", """```mermaid
graph TD
    Admin([Admin Editor: edit_bulk_upload.js<br/>Drag & Drop .csv file]) -->|Client validation| API[POST /api/admin/bulk-upload]
    API -.->|Requires verify_token| Auth{JWT Admin Auth}
    
    Auth --> Backend[admin_api.py]
    
    subgraph Backend[admin_api.py]
        P1[Parse CSV via csv.DictReader] --> P2[Validate ENUMS against schema]
        P2 --> P3[Check slug uniqueness]
    end
    
    Backend --> Condition{Errors found?}
    
    Condition -->|Yes| Errors([Return 200: success: false, errors])
    Condition -->|No| Map[Dynamically map to SQLite cols & generate ULID]
    
    Map --> DB[(SQLite Database<br/>Bulk INSERT)]
    DB --> Success([Return 200 OK: success: true, created: X])
    Success --> Render[Editor renders results]
```"""),

(r"```text\n\[ WASM SQLite Data Output \][\s\S]*?```", """```mermaid
graph TD
    WASM[(WASM SQLite Data Output)] --> Extract[Extract Era, Geo, Parent_ID bounds]
    Extract --> Engine{3.0 Visualizations Render Engine}
    
    Engine -->|Plots Map lat/longs| Map[3.3 Map]
    Engine -->|Translates dates to X| Timeline[3.2 Timeline]
    Engine -->|Builds Y/Z tree| Evidence[3.1 Evidence Ardor]
    
    Map --> Render([Renders SVG/Canvas Interactive Visuals])
    Timeline --> Render
    Evidence --> Render
```"""),

(r"```text\n\[ Pipeline Scripts \][\s\S]*?```", """```mermaid
graph TD
    Wiki[4.1 Wikipedia Metrics] -->|Base Importance Score| Rank{Calculate Final Rank}
    Chall[4.2 Challenges Metrics] -->|Base Popularity Context| Rank
    
    Admin([Admin Weights Editor<br/>Multiplier Overrides]) --> Rank
    
    Rank --> Update[(Update SQLite DB Records)]
    Update --> Query[WASM Query<br/>ORDER BY final_rank DESC]
    Query --> Render([Frontend Render<br/>Displays Ranked List UI])
```"""),

(r"```text\n\[ Admin Portal: Writer Core \][\s\S]*?```", """```mermaid
graph TD
    Admin([Admin Portal: Writer Core<br/>Context / Historiography]) --> Editor[Write Content via Markdown Editor]
    Editor --> API[Admin Backend API]
    API --> DB[(Insert into SQLite DB)]
    
    DB --> Query[WASM Query in User Browser]
    Query --> Parse[Parse Markdown payload into HTML]
    Parse --> Render([Render specialized 'Essay Typography Layout'])
```"""),

(r"```text\n \[ Scheduled Job / Manual Trigger \][\s\S]*?```", """```mermaid
graph TD
    Trigger([Scheduled Job / Manual Trigger]) --> Pipeline[backend/pipelines/pipeline_news.py]
    
    subgraph Pipeline[pipeline_news.py]
        S1[Scrape external RSS feeds / News APIs] --> S2[Extract and filter relevant events]
        S2 --> S3[Rank by recency and relevance]
    end
    
    Pipeline --> DB[(SQLite Database<br/>INSERT / UPDATE)]
    DB -.->|Updates| I1[news_items JSON Blob]
    DB -.->|Updates| I2[news_sources]
    
    DB --> WASM[WASM Query Frontend]
    WASM --> Render([list_newsitem.js renders News Feed])
```"""),

(r"```text\n\[ External Web Traffic \][\s\S]*?```", """```mermaid
graph TD
    Web([External Web Traffic]) --> Nginx{Nginx Reverse Proxy<br/>Rate Limit, robots.txt, sitemap.xml}
    Agent([Automated AI Agents]) --> Nginx
    
    Nginx -->|Route: static| Static[Static Assets Files<br/>HTML, JS, CSS, WASM]
    Nginx -->|Route: /api/admin| Auth[Admin Auth API<br/>Auth & JWT Utils]
    Nginx -->|Route: /mcp| MCP[MCP Server Service<br/>rate_limiter.py]
    
    Auth -->|Read/Write| DB[(SQLite Database)]
    MCP -->|Read-Only| DB
```"""),

(r"```text\n\[ Browser Action \(e\.g\. Load 'Records'\) \][\s\S]*?```", """```mermaid
sequenceDiagram
    actor Browser
    Note over Browser, API: Load Dashboard Action
    Browser->>load_middleware.js: Load Module (e.g. 'Records')
    load_middleware.js->>API: GET /api/admin/verify
    
    rect rgb(240, 240, 240)
        Note over API: verify_token dependency
        API->>API: Read 'admin_token' from HttpOnly Cookie
        API->>API: Decode JWT via auth_utils.py
        API->>API: Validate Expiration & Role ('admin')
    end
    
    alt Token Valid
        API-->>load_middleware.js: 200 OK
        load_middleware.js->>Browser: Proceed with Module Load
    else Token Invalid / Missing
        API-->>load_middleware.js: 401 Unauthorized
        load_middleware.js->>logout_middleware.js: Trigger logout
        logout_middleware.js->>Browser: Wipe DOM & Redirect to Login
    end
```"""),

(r"```text\n\[ Browser: admin\.html \][\s\S]*?```", """```mermaid
sequenceDiagram
    actor Browser
    Note over Browser, API: Login Handshake
    Browser->>admin_login.js: Enter Password
    admin_login.js->>API: POST /api/admin/login
    
    rect rgb(240, 240, 240)
        Note over API: auth_utils.py
        API->>API: Check Brute Force (IP Lockout)
        API->>API: Verify Admin Password
    end
    
    alt Password Correct
        API->>API: Generate JWT
        API-->>Browser: Set HttpOnly Cookie & Return 200 OK
        Browser->>Browser: Transition to Dashboard
    else Password Incorrect
        API-->>Browser: Return 401 Unauthorized
    end
```"""),

(r"```text\n \[ External AI Agent \][\s\S]*?```", """```mermaid
graph TD
    Agent([External AI Agent]) --> Nginx[Nginx Proxy<br/>Rate Limited Route: /mcp/...]
    Nginx --> MCP[MCP Server Service<br/>mcp_server.py]
    
    subgraph MCP[MCP Server]
        S1[Establish read-only SQLite connection] --> S2[Execute sanitized SELECT queries]
    end
    
    MCP --> JSON[JSON Response]
    JSON --> AgentContext([Agent Context Window])
```"""),

(r"```text\n\[ Developer Local Environment \][\s\S]*?```", """```mermaid
graph TD
    Env([Developer Local Environment]) --> Port[port_test.py<br/>Wait for services]
    Port --> Security[security_audit.py<br/>pip-audit & security scans]
    Security --> AgentTrigger[Trigger browser_test_skill agent]
    AgentTrigger --> Boot[Agent boots Headless Browser framework]
    Boot --> Validate[Validates Functional UX + DB Return Paths]
    Validate --> Readability[agent_readability_test.py<br/>Asserts AI-welcoming JSON & SEO]
    Readability --> Report([Write Audit Report to /logs directory])
```"""),

(r"```text\n \[ Developer Run: python build\.py \][\s\S]*?```", """```mermaid
graph TD
    Build([Developer Run: python build.py]) --> Seeder[tools/db_seeder.py]
    
    subgraph Seeder[tools/db_seeder.py]
        S1[Reads database.sql schema] --> S2[Injects seed_data.sql records]
        S2 --> S3[Compiles database.sqlite]
    end
    
    Seeder --> Pipelines[Pipeline Triggers]
    
    Pipelines -.-> P1[pipeline_wikipedia.py]
    Pipelines -.-> P2[pipeline_popular_challenges.py]
    Pipelines -.-> P3[pipeline_academic_challenges.py]
    Pipelines -.-> P4[pipeline_news.py]
    
    Pipelines --> Sitemap[tools/generate_sitemap.py<br/>Rebuilds sitemap.xml]
    Sitemap --> Minify[tools/minify_admin.py<br/>Obfuscates admin JS]
    Minify --> Deploy([System Ready for Deployment])
```""")
]

for old, new in replacements:
    content = re.sub(old, new, content, flags=re.MULTILINE)

with open('documentation/guides/guide_function.md', 'w') as f:
    f.write(content)

print("Done replacing.")
