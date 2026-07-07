thejesuswebsite/
│
├── .env
├── .gitignore
├── LICENSE
├── PERFORMANCE_REPORT.md
├── README.md
├── deploy.sh                          VPS one-command deploy
│
├── deploy/
│   └── nginx.conf                     # Production server block (TLS, /api proxy, static hosting)
│
├── scratchpad.md
├── sitemap.md
│
├── .claude/
│   └── settings.local.json
│
├── database/
│   ├── schema.sql
│   ├── thejesuswebsite.db
│   ├── seed.sql                       content seeding
│   └── migrations/
│       ├── 001_initial.sql
│       ├── 002_auth_credential_updates.sql
│       └── 003_journal_article_metadata.sql
│
├── api/
│   ├── server.js                       # Express entry point (trust proxy, security headers, route mounts)
│   ├── config.js                       # better-sqlite3 connection (WAL, foreign_keys ON)
│   ├── package.json
│   │
│   ├── config/
│   │   └── content-pages.js            # Content-type → table/route/output map (drives page-generator)
│   │
│   ├── middleware/
│   │   ├── auth.js                     # In-memory session store (12h TTL), requireAuth guard
│   │   ├── security-headers.js         # nosniff, DENY, HSTS, Referrer-Policy, Cache-Control
│   │   └── rate-limit.js               # In-memory IP-based rate limiter
│   │
│   ├── models/
│   │   ├── about.model.js              # About-page (about_pages) CRUD
│   │   ├── academic-challenges.model.js
│   │   ├── analytics.model.js
│   │   ├── arbor.model.js
│   │   ├── blog-post.model.js
│   │   ├── collection.model.js
│   │   ├── credential.model.js
│   │   ├── drafts.model.js
│   │   ├── essay.model.js
│   │   ├── evidence.model.js
│   │   ├── historiography.model.js
│   │   ├── identifiers.model.js
│   │   ├── map.model.js
│   │   ├── mla-source.model.js         # Bibliography (mla_sources) CRUD
│   │   ├── model-helpers.js            # Shared pickWritable / generateUniqueSlug
│   │   ├── news-article.model.js
│   │   ├── popular-challenges.model.js
│   │   ├── resource.model.js
│   │   ├── response.model.js
│   │   ├── search.model.js
│   │   ├── timeline.model.js
│   │   ├── wikipedia.model.js
│   │   └── relations/                  # Shared relational helpers
│   │       ├── child-rows.js           # Get/replace owned child rows (pictures, breakouts)
│   │       └── junctions.js            # Get/replace M:N links (sources, identifiers, links)
│   │
│   ├── routes/
│   │   ├── about.js                    # about_pages REST endpoints
│   │   ├── academic-challenges.js
│   │   ├── analytics.js
│   │   ├── arbor.js
│   │   ├── auth.js
│   │   ├── blog-posts.js
│   │   ├── collections.js
│   │   ├── drafts.js
│   │   ├── essays.js
│   │   ├── evidence.js
│   │   ├── historiography.js
│   │   ├── identifiers.js
│   │   ├── maps.js
│   │   ├── news-articles.js
│   │   ├── passkey.js
│   │   ├── popular-challenges.js
│   │   ├── publish.js                  # Flip published_draft across every publishable entity
│   │   ├── resources.js
│   │   ├── responses.js
│   │   ├── search.js
│   │   ├── sources.js                  # mla_sources REST endpoints
│   │   ├── timeline.js
│   │   └── wikipedia.js
│   │
│   ├── services/
│   │   └── page-generator.js           # Renders static [slug].html pages with SEO <head> at publish time
│   │
│   ├── scripts/
│   │   ├── generate-sitemap.js         # DB-driven sitemap.xml generator (deploy step)
│   │   └── regenerate-pages.js         # Batch static page (re)generation
│   │
│   └── tests/
│       ├── analytics-route.test.js     # POST /analytics rejects non-string page
│       ├── analytics.model.test.js     # getTopPagesWithTrend + getTopReferrers count field
│       ├── auth-guard.test.js          # Write routes 401 without a session
│       ├── auth.test.js
│       ├── body-limits.test.js         # JSON body-size + malformed-body error mapping
│       ├── credential-management.test.js
│       ├── credential.model.test.js
│       ├── evidence.test.js            # Evidence composite CRUD
│       ├── generate-sitemap.test.js    # DB-driven sitemap: published-only, well-formed XML
│       ├── journal-content.test.js     # Responses/essays/blog/historiography CRUD
│       ├── maps.test.js                # Maps model + pin route CRUD
│       ├── model-helpers.test.js       # pickWritable/generateUniqueSlug
│       ├── page-generator.test.js      # Static page generation/removal, SEO escaping
│       ├── passkey.test.js
│       ├── public-rate-limit.test.js   # public read + /search 429; /health exempt
│       ├── rate-limit.test.js
│       ├── relations.test.js           # child-rows + junctions helpers
│       ├── search.model.test.js        # FTS title aliasing + published-only filter
│       ├── setup-token.test.js
│       ├── sources-about.test.js       # mla_sources + about CRUD
│       └── helpers/
│           ├── db.js
│           └── seed.js                 # Content-seeding helper for model/route tests
│
├── admin/
│   ├── index.html                     # Dashboard (stats, recent drafts)
│   ├── analytics.html                 # Page views, referrers, sparklines
│   │
│   ├── auth/
│   │   ├── register.html              # First-time passkey enrolment
│   │   ├── register.css
│   │   ├── login.html                 # Ongoing passkey sign-in
│   │   └── login.css
│   │
│   ├── settings/
│   │   └── index.html                 # Site metadata + global config
│   │
│   ├── drafts/
│   │   ├── index.html
│   │   ├── new.html
│   │   └── edit-[id].html
│   │
│   ├── evidence/
│   │   ├── index.html
│   │   ├── edit-[id].html
│   │   └── bulk.html
│   │
│   ├── collections/
│   │   └── index.html
│   │
│   ├── resources/                     # Per-category drag-to-reorder list management
│   │   ├── index.html                 # Category selector + drag-to-reorder
│   │   ├── sermons-and-sayings.html
│   │   ├── parables.html
│   │   ├── objects.html
│   │   ├── people.html
│   │   ├── sites.html
│   │   ├── ot-verses.html
│   │   ├── internal-witnesses.html
│   │   ├── external-witnesses.html
│   │   ├── places.html
│   │   ├── world-events.html
│   │   ├── miracles.html
│   │   ├── events.html
│   │   ├── apologetics.html
│   │   └── manuscripts.html
│   │
│   ├── wikipedia/
│   │   └── index.html
│   │
│   ├── essays/
│   │   ├── index.html
│   │   ├── new.html
│   │   └── edit-[id].html
│   │
│   ├── debate/
│   │   ├── index.html
│   │   ├── new.html
│   │   ├── edit-[id].html
│   │   ├── popular-challenges/         # Popular Challenge CRUD (separate from academic)
│   │   │   ├── index.html
│   │   │   ├── new.html
│   │   │   └── edit-[id].html
│   │   └── academic-challenges/        # Academic Challenge CRUD (separate from popular)
│   │       ├── index.html
│   │       ├── new.html
│   │       └── edit-[id].html
│   │
│   ├── historiography/               # Historiography CMS (mirrors essays editor)
│   │   ├── index.html
│   │   ├── new.html
│   │   └── edit-[id].html
│   │
│   ├── blog/
│   │   ├── index.html
│   │   ├── new.html
│   │   └── edit-[id].html
│   │
│   ├── news/
│   │   └── index.html
│   │
│   ├── diagrams/
│   │   ├── arbor.html                 # Node/edge editor
│   │   ├── timeline.html              # Event editor
│   │   └── maps.html                  # Visual map pin editor
│   │
│   ├── assets/
│   │   ├── css/
│   │   │   ├── admin.css              # Imports all admin sheets
│   │   │   ├── analytics.css          # Stat cards, sparklines, date range
│   │   │   ├── admin-base/
│   │   │   │   ├── reset.css
│   │   │   │   ├── variables.css
│   │   │   │   └── typography.css
│   │   │   ├── admin-layout/
│   │   │   │   ├── sidebar.css
│   │   │   │   └── grid.css
│   │   │   ├── admin-components/
│   │   │   │   ├── buttons.css
│   │   │   │   ├── forms.css
│   │   │   │   ├── tables.css
│   │   │   │   ├── modals.css
│   │   │   │   └── cards.css
│   │   │   └── admin-diagrams/
│   │   │       ├── arbor-toolbar.css
│   │   │       ├── arbor-canvas.css
│   │   │       ├── arbor-zoom.css
│   │   │       ├── arbor-panel.css
│   │   │       ├── arbor-panel-form.css
│   │   │       ├── arbor-search.css
│   │   │       ├── timeline-toolbar.css
│   │   │       ├── timeline-canvas.css
│   │   │       ├── timeline-controls.css
│   │   │       ├── timeline-panel.css
│   │   │       ├── timeline-panel-form.css
│   │   │       ├── timeline-search.css
│   │   │       ├── maps-toolbar.css
│   │   │       ├── maps-canvas.css
│   │   │       ├── maps-panel.css
│   │   │       └── maps-panel-form.css
│   │   └── js/
│   │       ├── passkey.js             # WebAuthn ceremony helpers (register + login)
│   │       ├── auth.js                # Session guard / redirect
│   │       ├── admin.js               # window.Admin — API wrappers, DOM factories, shared CRUD helpers
│   │       ├── analytics.js           # Analytics fetch + sparkline render
│   │       ├── admin-ranking.js       # Drag-to-rank reorder
│   │       ├── admin-resources-topic.js # Per-topic resource list page controller
│   │       ├── update-record.js       # POST/PUT diagram positions
│   │       ├── admin-arbor/
│   │       │   ├── arbor-canvas.js
│   │       │   ├── arbor-nodes.js
│   │       │   └── arbor-edges.js
│   │       ├── admin-timeline/
│   │       │   ├── timeline-axis.js
│   │       │   ├── timeline-events.js
│   │       │   └── timeline-zoom.js
│   │       └── admin-maps/
│   │           ├── maps-render.js     # Image load + screen↔image coord mapping
│   │           ├── maps-pins.js       # Pin place/drag/edit + API persistence
│   │           └── maps-regions.js    # Map-scale selector + region highlight
│   │
│   └── tests/
│       ├── passkey.test.js
│       ├── maps.test.js               # Coordinate-mapping helper tests
│       ├── admin.test.js              # Foundation helper tests
│       ├── admin-ranking.test.js
│       ├── admin-arbor.test.js
│       └── admin-timeline.test.js
│
├── frontend/
│   ├── .well-known/
│   │   └── apple-app-site-association
│   │
│   ├── index.html                     # Home / Landing Page
│   ├── about.html                     # About page (includes donation portal slot)
│   ├── 404.html                       # Custom not-found page
│   ├── favicon.ico                    # Favicon
│   ├── robots.txt                     # Crawler rules
│   ├── sitemap.xml                    # XML sitemap (generated by api/scripts/generate-sitemap.js)
│   ├── llms.txt                       # Machine-readable API + content guide for agents
│   │
│   ├── evidence/                      # Evidence section
│   │   ├── index.html
│   │   ├── search.html
│   │   ├── arbor.html
│   │   ├── single/
│   │   │   └── [slug].html
│   │   ├── timeline/
│   │   │   ├── index.html
│   │   │   ├── beginning.html
│   │   │   ├── middle.html
│   │   │   ├── ending.html
│   │   │   ├── beginning/
│   │   │   │   └── zoom-beginning.html
│   │   │   ├── middle/
│   │   │   │   └── zoom-middle.html
│   │   │   └── ending/
│   │   │       └── zoom-ending.html
│   │   └── maps/
│   │       ├── index.html
│   │       ├── [map_key].html
│   │       ├── roman-empire.html
│   │       ├── levant.html
│   │       ├── galilee.html
│   │       ├── judea.html
│   │       ├── jerusalem.html
│   │       ├── roman-empire/
│   │       │   └── zoom-roman-empire.html
│   │       ├── levant/
│   │       │   └── zoom-levant.html
│   │       ├── galilee/
│   │       │   └── zoom-galilee.html
│   │       ├── judea/
│   │       │   └── zoom-judea.html
│   │       └── jerusalem/
│   │           └── zoom-jerusalem.html
│   │
│   ├── contextual-essays/
│   │   ├── index.html
│   │   └── [slug].html
│   │
│   ├── resources/
│   │   ├── index.html
│   │   ├── list.html
│   │   ├── list-1.html
│   │   ├── list-2.html
│   │   └── list-3.html
│   │
│   ├── debate/
│   │   ├── index.html
│   │   ├── popular-challenges.html
│   │   ├── academic-challenges.html
│   │   ├── wikipedia.html
│   │   ├── historiography.html
│   │   ├── popular-challenges/
│   │   │   └── [slug].html
│   │   ├── academic-challenges/
│   │   │   └── [slug].html
│   │   ├── historiography/
│   │   │   ├── index.html
│   │   │   └── [slug].html
│   │   └── responses/
│   │       └── [slug].html
│   │
│   ├── news-and-blog/
│   │   ├── index.html
│   │   ├── blog/
│   │   │   ├── index.html
│   │   │   └── [slug].html
│   │   └── news/
│   │       ├── index.html
│   │       └── [slug].html
│   │
│   └── assets/
│       ├── images/
│       │   ├── favicon.svg
│       │   ├── favicon.png
│       │   ├── apple-touch-icon.png
│       │   ├── feather-sprite.svg
│       │   ├── site.webmanifest
│       │   ├── jesus_walking_on_water.jpg
│       │   └── mary_encounters_two_angels_at_jesus_empty_tomb.jpg
│       ├── js/
│       │   ├── main.js
│       │   ├── api.js                 # Centralised fetch wrappers — every response is {data, error}
│       │   ├── seo.js
│       │   ├── cookies.js
│       │   ├── sidebar.js
│       │   ├── sidebar_hamburger.js
│       │   ├── footer.js
│       │   ├── search.js
│       │   ├── debate.js
│       │   ├── donation.js
│       │   ├── news-and-blog.js
│       │   ├── evidence-list.js
│       │   ├── evidence-detail.js
│       │   ├── essays-list.js
│       │   ├── essay-detail.js
│       │   ├── historiography-list.js
│       │   ├── historiography-detail.js
│       │   ├── response-detail.js
│       │   ├── challenge-detail.js
│       │   ├── wikipedia.js
│       │   ├── blog-list.js
│       │   ├── blog-detail.js
│       │   ├── news-list.js
│       │   ├── news-detail.js
│       │   ├── resources.js
│       │   ├── utils/
│       │   │   ├── debounce.js
│       │   │   ├── storage.js
│       │   │   ├── dom.js
│       │   │   ├── format.js
│       │   │   ├── router.js
│       │   │   ├── state.js
│       │   │   ├── templates.js       # HTML-escaping render helpers
│       │   │   ├── analytics.js
│       │   │   ├── lazy-load.js
│       │   │   ├── toasts.js
│       │   │   └── figures.js
│       │   ├── arbor/
│       │   │   ├── arbor-data.js
│       │   │   ├── arbor-render.js
│       │   │   └── arbor-interactions.js
│       │   ├── timeline/
│       │   │   ├── timeline-data.js
│       │   │   ├── timeline-render.js
│       │   │   └── timeline-interactions.js
│       │   └── maps/
│       │       ├── maps-data.js
│       │       ├── maps-render.js
│       │       └── maps-interactions.js
│       └── css/
│           ├── base/
│           │   ├── variables.css      # Design tokens (colors, typography, spacing, animations)
│           │   ├── reset.css          # Minimal CSS reset
│           │   ├── typography.css     # Headings, body text, links, lists
│           │   ├── utilities.css      # Margin, padding, alignment, visibility helpers
│           │   ├── invisible-header.css # Visually hidden header + skip-link
│           │   ├── animations.css     # Transition helpers, keyframes, reduced-motion
│           │   └── print.css          # Academic paper print styles
│           │
│           ├── layout/
│           │   ├── grid.css           # Container, 12-col grid, card grid, reading column
│           │   ├── navigation.css     # Sidebar, sub-navigation, content area
│           │   ├── navigation-tablet.css # Tablet breakpoint: icon-only rail
│           │   ├── hamburger.css      # Hamburger toggle, overlay, mobile off-canvas
│           │   └── footer.css         # Universal footer (copyright, print/copy buttons)
│           │
│           ├── components/
│           │   ├── badges.css         # Content badges + admin status badges
│           │   ├── breadcrumbs.css    # Slash-separated nav path
│           │   ├── breakout.css       # Supplementary side panels + collapsible variant
│           │   ├── buttons.css        # Primary, secondary, ghost + sm/md/lg sizes
│           │   ├── cards.css          # Base card, image-top, compact, hero variants
│           │   ├── empty-states.css   # Centred message + suggested actions
│           │   ├── figures.css        # Figure border, caption, numbering, full-width
│           │   ├── filters.css        # Filter chip bar, multi-select, clear button
│           │   ├── forms.css          # Inputs, selects, textareas, validation states
│           │   ├── icons.css          # Feather SVG icon sizing + color variants
│           │   ├── infinite-scroll.css # Spinner + end-of-list message
│           │   ├── loading.css        # Skeleton screens + content spinner
│           │   ├── modals.css         # Centred modal + slide-in drawer
│           │   ├── search.css         # Search bar, filter chips, highlighted matches
│           │   ├── sidebar.css        # Sidebar toggle + active section highlight
│           │   ├── tables.css         # Clean tables, sticky headers, responsive cards
│           │   ├── toasts.css         # Bottom-centre stacking notifications
│           │   └── verse-blocks.css   # Verse + code block styling
│           │
│           └── pages/
│               ├── about.css          # About page (portrait, prose, contact row)
│               ├── arbor.css          # Arbor diagram (nodes, edges, dot-grid)
│               ├── arbor-controls.css # Arbor zoom controls
│               ├── blog.css           # Blog post (magazine layout, pull quotes, tags)
│               ├── blog-footer.css    # Blog further reading section
│               ├── challenge-list.css # Ranked challenge cards
│               ├── challenge-detail.css # Challenge detail + response cards
│               ├── debate.css         # Debate landing (section nav cards)
│               ├── donation.css       # Donation container placeholder
│               ├── evidence.css       # Evidence list + detail (hero, page-info-row)
│               ├── home.css           # Home page (hero, title, content sections)
│               ├── journal-header.css # Journal title block, abstract, keywords
│               ├── journal-body.css   # Journal reading column, headings, block quotes
│               ├── journal-two-column.css # Journal two-column layout (≥1280px, two_column flag)
│               ├── journal-responses.css # Journal challenge reference + strength indicator
│               ├── journal-footer.css # Journal footnotes, bibliography, references
│               ├── maps-list.css      # Map overview grid + cards
│               ├── maps-region.css    # Map region header + navigation
│               ├── maps-view.css      # Map canvas, pins, tooltips, zoom, filters
│               ├── maps-view-responsive.css # Mobile map view breakpoint
│               ├── news-and-blog.css  # News & Blog landing (toggle chips, hero card)
│               ├── news.css           # News article (external link, summary, keywords)
│               ├── resources.css      # Resource lists (category nav, ordinal items)
│               ├── timeline-filters.css # Timeline page header + era filter chips
│               ├── timeline-labels.css  # Timeline event labels
│               ├── timeline-view.css  # Timeline spine, dots, markers, detail panel
│               └── wikipedia-list.css # Wikipedia ranked list cards
│
├── mcp-server/                        AI integration (MCP) — read-only tools, calls the HTTP API
│   ├── package.json
│   ├── server.js
│   ├── tools/
│   │   ├── searchEvidence.js
│   │   ├── getItemBySlug.js
│   │   ├── getEssayBySlug.js
│   │   ├── getBlogPostBySlug.js
│   │   ├── getNewsArticleBySlug.js
│   │   ├── getTimelineEvents.js
│   │   └── getMapData.js
│   └── tests/
│       └── tools.test.js
│
├── public/
│   └── uploads/                       # User uploads (git-ignored; .gitkeep tracked)
│       └── .gitkeep
│
└── setup/
    ├── DEPLOYMENT.md                  # Production deploy steps
    ├── Issues.md
    ├── Style_guide.md
    ├── Vibe_coding_rules.md
    ├── Website_guide.md
    ├── nginx-hardening.md             # Reverse-proxy rate/connection limiting snippets
    ├── plan_template.md
    │
    ├── ARCHIVE/
    │   └── Auth_guide.md              # Superseded by the passkey work in Vibe_coding_rules.md / DEPLOYMENT.md
    │
    ├── MOCK_UPS/
    │   ├── 01_home.html
    │   ├── 02_evidence_detail.html
    │   ├── 03_timeline_view.html
    │   ├── 04_search.html
    │   └── 05_arbor_diagram.html
    │
    ├── PLANS/
    │   ├── New/                       # Not yet started
    │   │   ├── prelaunch-bug-fixes.md
    │   │   └── production-deploy-config.md
    │   └── Completed/
    │       ├── admin-content-management.md
    │       ├── admin-diagram-editors.md
    │       ├── admin-foundation.md
    │       ├── admin-resource-topic-pages.md
    │       ├── agent-friendly-frontend.md
    │       ├── api-namespace-and-nginx-serving.md
    │       ├── auth-admin-pages.md
    │       ├── auth-credential-management.md
    │       ├── auth-registration-protection.md
    │       ├── auth-security-foundation.md
    │       ├── auth-testing-and-apple-association.md
    │       ├── complete-backend-data-layer.md
    │       ├── css-vibe-compliance.md
    │       ├── deploy-migrations-and-memory-hygiene.md
    │       ├── fix-admin-analytics-dashboard.md
    │       ├── frontend-arbor.md
    │       ├── frontend-home-and-evidence.md
    │       ├── frontend-integrity-and-api-hardening.md
    │       ├── frontend-journal-and-debate.md
    │       ├── frontend-js-foundation.md
    │       ├── frontend-map-region-pages.md
    │       ├── frontend-maps-admin.md
    │       ├── frontend-maps-api.md
    │       ├── frontend-maps-frontend.md
    │       ├── frontend-news-blog-resources-about.md
    │       ├── frontend-render-bug-fixes.md
    │       ├── frontend-resource-and-historiography-pages.md
    │       ├── frontend-timeline-zoom-pages.md
    │       ├── frontend-timeline.md
    │       ├── journal-article-metadata-columns.md
    │       ├── js-vibe-compliance.md
    │       ├── markup-corruption-cleanup.md
    │       ├── mcp-server.md
    │       ├── passkey-webauthn-hardening.md
    │       ├── public-api-rate-limiting.md
    │       ├── schema-fixes.md
    │       ├── shared-and-root.md
    │       └── template-page-generation.md
    │
    ├── SKILLS/
    │   └── !GenerateAPlan/
    │       └── SKILL.md
    │
    └── TESTS/
        ├── admin_tests.md
        ├── api_tests.md
        ├── frontend_tests.md
        ├── mcp_tests.md
        └── shared_tests.md
