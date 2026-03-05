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
│   │   │   ├── challenge_engine.rs
│   │   │   ├── domain.rs
│   │   │   ├── lib.rs
│   │   │   ├── models.rs
│   │   │   ├── record.rs
│   │   │   ├── search.rs
│   │   │   ├── spelling.rs
│   │   │   ├── thinking.rs
│   │   │   ├── wiki_engine.rs
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
│   │   │   │   │   ├── draft_counts.rs
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
│   │   │   │   │   ├── mcp.rs
│   │   │   │   │   ├── meta_research.rs
│   │   │   │   │   ├── metadata.rs
│   │   │   │   │   ├── page_id.rs
│   │   │   │   │   ├── page_views.rs
│   │   │   │   │   ├── pdf.rs
│   │   │   │   │   ├── picture.rs
│   │   │   │   │   ├── pttx.rs
│   │   │   │   │   ├── publication_status.rs
│   │   │   │   │   ├── referral.rs
│   │   │   │   │   ├── request.rs
│   │   │   │   │   ├── sequenceid.rs
│   │   │   │   │   ├── server_metrics.rs
│   │   │   │   │   ├── server_ram.rs
│   │   │   │   │   ├── server_storage.rs
│   │   │   │   │   ├── source.rs
│   │   │   │   │   ├── token.rs
│   │   │   │   │   ├── trace_reasoning.rs
│   │   │   │   │   ├── ulid.rs
│   │   │   │   │   ├── url.rs
│   │   │   │   │   ├── user.rs
│   │   │   │   │   ├── user_metrics.rs
│   │   │   │   │   ├── websocket.rs
│   │   │   │   │   ├── widget_status.rs
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
│   │   │   ├── manager.rs
│   │   │   └── lib.rs
│   │   └── cargo.toml
│   └── app_ui
│       ├── src
│       │   ├── bin
│       │   │   └── export_openapi.rs
│       │   ├── api_agents.rs
│       │   ├── api_records.rs
│       │   ├── api_security.rs
│       │   ├── api_sources.rs
│       │   ├── api_spider.rs
│       │   ├── api_widgets.rs
│       │   ├── login.rs
│       │   ├── main.rs
│       │   ├── middleware.rs
│       │   ├── rate_limit.rs
│       │   ├── router.rs
│       │   ├── security.rs
│       │   ├── server.rs
│       │   ├── websocket.rs
│       │   ├── ws.rs
│       │   └── lib.rs
│       └── cargo.toml
├── frontend
│   ├── _footer.html
│   ├── _header.html
│   ├── _sidebar.html
│   ├── about.html
│   ├── blog_feed.html
│   ├── challenge.html
│   ├── challenge_academic.html
│   ├── challenge_popular.html
│   ├── context.html
│   ├── evidence.html
│   ├── historgraphy.html
│   ├── index.html
│   ├── list_events.html
│   ├── list_manuscripts.html
│   ├── list_miracles.html
│   ├── list_objects.html
│   ├── list_ot_verses.html
│   ├── list_parables.html
│   ├── list_people.html
│   ├── list_places.html
│   ├── list_sayings_and_sermons.html
│   ├── list_sites.html
│   ├── list_sources.html
│   ├── news_and_blog.html
│   ├── news_feed.html
│   ├── records.html
│   ├── resources.html
│   ├── timeline.html
│   ├── wikipedia.html
│   ├── readme.md
│   ├── robots.txt
│   ├── style.css
│   ├── js
│   │   ├── widgets
│   │   │   └── wgt_[name].js (17 widgets)
│   │   ├── blog_feed_hero.js
│   │   ├── challenge_academic_hero.js
│   │   ├── challenge_popular_hero.js
│   │   ├── context_hero.js
│   │   ├── current_item_highlight.js
│   │   ├── display_academic_list.js
│   │   ├── display_academic_results.js
│   │   ├── display_blog_feed.js
│   │   ├── display_news_feed.js
│   │   ├── display_popular_list.js
│   │   ├── display_popular_results.js
│   │   ├── display_top_blog_post.js
│   │   ├── display_top_four_news_items.js
│   │   ├── expand_verse.js
│   │   ├── footer_actions.js
│   │   ├── list_sources_hero.js
│   │   ├── news_feed_hero.js
│   │   ├── react_flow.js
│   │   ├── record_card.js
│   │   ├── refresh_list.js
│   │   ├── refresh_records.js
│   │   ├── search_records.js
│   │   ├── sidebar_toggle.js
│   │   ├── store_contact.js
│   │   ├── store_donor.js
│   │   ├── wasm_interop_demo.js
│   │   └── wikipedia_hero.js
│   ├── maps/
│   ├── private
│   │   ├── js
│   │   │   ├── blog_crud.js
│   │   │   ├── chat_with_agent.js
│   │   │   ├── check_passcode.js
│   │   │   ├── dashboard_tabs.js
│   │   │   ├── edit_challenge_results.js
│   │   │   ├── edit_records.js
│   │   │   ├── edit_wikipedia_results.js
│   │   │   ├── record_card.js
│   │   │   ├── send_passcode.js
│   │   │   ├── show_queue.js
│   │   │   ├── show_server_info.js
│   │   │   ├── show_trace_reasoning.js
│   │   │   └── widget_[name].js (8 detail scripts)
│   │   ├── blog_post.html
│   │   ├── dashboard.html
│   │   ├── essay.html
│   │   ├── login.html
│   │   └── response.html
│   └── public (legacy folders)
│       ├── context/
│       ├── maps/
│       └── responses/
├── node_modules/
├── test/
├── Cargo.lock
├── build.rs
├── cargo.toml
├── clippy.toml
├── docker-compose.yml
├── docker.yml
├── dockerfile
├── LICENCE
├── makefile
├── openai.yml
├── package-lock.json
├── package.json
├── readme.md
├── rust_toolchain.toml
├── rustfmt.toml
└── sitemap.md
```

