# Sitemap

```text
.
├── .env
├── .env.example
├── .gitignore
├── .dockerignore
├── .github
│   └── workflow/
├── app
│   ├── app_brain
│   │   ├── src
│   │   │   ├── addmetadata.rs
│   │   │   ├── agent.rs
│   │   │   ├── api.rs
│   │   │   ├── candle.rs
│   │   │   ├── challenge.rs
│   │   │   ├── domain.rs
│   │   │   ├── lib.rs
│   │   │   ├── models.rs
│   │   │   ├── record.rs
│   │   │   ├── search.rs
│   │   │   ├── thinking.rs
│   │   │   └── wikipedia.rs
│   │   └── cargo.toml
│   ├── app_core
│   │   ├── src
│   │   │   ├── types
│   │   │   │   ├── blog_and_news
│   │   │   │   │   ├── blog.rs
│   │   │   │   │   ├── news.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── contact
│   │   │   │   │   ├── contact.rs
│   │   │   │   │   ├── contact_message.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── donate
│   │   │   │   │   ├── budget.rs
│   │   │   │   │   ├── donor.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── essays_and_ranks
│   │   │   │   │   ├── challenge.rs
│   │   │   │   │   ├── essay.rs
│   │   │   │   │   ├── response.rs
│   │   │   │   │   ├── wikipedia.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── jesus
│   │   │   │   │   ├── content.rs
│   │   │   │   │   ├── map.rs
│   │   │   │   │   ├── timeline.rs
│   │   │   │   │   ├── type.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── record
│   │   │   │   │   ├── record.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── search_create_rank
│   │   │   │   │   ├── big_idea.rs
│   │   │   │   │   ├── search_domain.rs
│   │   │   │   │   ├── search_word.rs
│   │   │   │   │   ├── source_and_quote.rs
│   │   │   │   │   ├── weights.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── system
│   │   │   │   │   ├── bible_verse.rs
│   │   │   │   │   ├── context_window.rs
│   │   │   │   │   ├── error.rs
│   │   │   │   │   ├── id_academic_article.rs
│   │   │   │   │   ├── id_geo.rs
│   │   │   │   │   ├── id_iaa.rs
│   │   │   │   │   ├── id_isbn.rs
│   │   │   │   │   ├── id_lgpn.rs
│   │   │   │   │   ├── id_manuscript.rs
│   │   │   │   │   ├── id_orcid.rs
│   │   │   │   │   ├── id_pleiades.rs
│   │   │   │   │   ├── json.rs
│   │   │   │   │   ├── metadata.rs
│   │   │   │   │   ├── page_id.rs
│   │   │   │   │   ├── page_views.rs
│   │   │   │   │   ├── picture.rs
│   │   │   │   │   ├── publication_status.rs
│   │   │   │   │   ├── referral.rs
│   │   │   │   │   ├── request.rs
│   │   │   │   │   ├── sequenceid.rs
│   │   │   │   │   ├── server_ram.rs
│   │   │   │   │   ├── server_storage.rs
│   │   │   │   │   ├── source.rs
│   │   │   │   │   ├── token.rs
│   │   │   │   │   ├── trace_reasoning.rs
│   │   │   │   │   ├── ulid.rs
│   │   │   │   │   ├── url.rs
│   │   │   │   │   ├── user_metrics.rs
│   │   │   │   │   ├── websocket.rs
│   │   │   │   │   ├── work_queue.rs
│   │   │   │   │   ├── workspace.rs
│   │   │   │   │   └── mod.rs
│   │   │   │   ├── traits.rs
│   │   │   │   └── mod.rs
│   │   │   └── lib.rs
│   │   └── cargo.toml
│   ├── app_schema
│   │   ├── src
│   │   │   ├── codegen.rs
│   │   │   ├── frontend.rs
│   │   │   ├── static_data.rs
│   │   │   └── lib.rs
│   │   └── cargo.toml
│   ├── app_storage
│   │   ├── src
│   │   │   ├── chroma.rs
│   │   │   └── lib.rs
│   │   └── cargo.toml
│   └── app_ui
│       ├── src
│       │   ├── bin
│       │   │   └── export_openapi.rs
│       │   ├── login.rs
│       │   ├── middleware.rs
│       │   ├── router.rs
│       │   ├── security.rs
│       │   ├── server.rs
│       │   ├── websocket.rs
│       │   ├── ws.rs
│       │   ├── main.rs
│       │   └── lib.rs
│       └── cargo.toml
├── frontend
│   ├── assets
│   │   ├── fonts/
│   │   └── images/
│   ├── navigation_sidebar
│   │   ├── js/
│   │   └── navigation.html
│   ├── private
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── template_ response/
│   │   └── template_essay/
│   ├── public
│   │   ├── about/
│   │   ├── challenge/
│   │   ├── context/
│   │   ├── evidence/
│   │   ├── maps/
│   │   ├── news_and_blog/
│   │   ├── records/
│   │   ├── resources/
│   │   ├── robot_header/
│   │   ├── timeline/
│   │   ├── wikipedia/
│   │   ├── readme.md
│   │   └── robots.txt
│   └── static
│       ├── js
│       │   └── wasm_interop_demo.js
│       └── style.css
├── test/
├── Cargo.lock
├── build.rs
├── cargo.toml
├── clippy.toml
├── clippyerrors.log
├── docker.yml
├── dockerfile
├── makefile
├── openai.yml
├── readme.md
├── rust_toolchain.toml
├── rustfmt.toml
└── sitemap.md
```

