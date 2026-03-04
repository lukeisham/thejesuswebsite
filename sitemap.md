# Sitemap

**Total Lines of Code: 53,988**

```text
.
├── Cargo.lock
├── Cargo.toml
├── Makefile
├── build.rs
├── clippy.toml
├── docker.yml
├── dockerfile
├── makefile
├── openai.yml
├── readme.md
├── rust_toolchain.toml
├── rustfmt.toml
├── sitemap.md
├── todo.md
├── app
│   ├── app_brain
│   │   ├── Cargo.toml
│   │   └── src
│   │       ├── addmetadata.rs
│   │       ├── agent.rs
│   │       ├── api.rs
│   │       ├── candle.rs
│   │       ├── challenge.rs
│   │       ├── domain.rs
│   │       ├── lib.rs
│   │       ├── models.rs
│   │       ├── record.rs
│   │       ├── search.rs
│   │       ├── thinking.rs
│   │       └── wikipedia.rs
│   ├── app_core
│   │   ├── Cargo.toml
│   │   └── src
│   │       ├── lib.rs
│   │       └── types
│   │           ├── blog_and_news
│   │           ├── contact
│   │           ├── donate
│   │           ├── essays_and_ranks
│   │           ├── jesus
│   │           ├── mod.rs
│   │           ├── record
│   │           ├── search_create_rank
│   │           ├── system
│   │           └── traits.rs
│   ├── app_schema
│   │   ├── Cargo.toml
│   │   └── src
│   │       ├── codegen.rs
│   │       ├── frontend.rs
│   │       ├── lib.rs
│   │       └── static_data.rs
│   ├── app_storage
│   │   ├── Cargo.toml
│   │   ├── database
│   │   │   ├── schema.sql
│   │   │   └── seed.sql
│   │   └── src
│   │       ├── chroma.rs
│   │       ├── lib.rs
│   │       └── manager.rs
│   └── app_ui
│       ├── Cargo.toml
│       └── src
│           ├── api_agents.rs
│           ├── api_records.rs
│           ├── api_security.rs
│           ├── api_sources.rs
│           ├── api_spider.rs
│           ├── api_widgets.rs
│           ├── bin
│           ├── lib.rs
│           ├── login.rs
│           ├── main.rs
│           ├── middleware.rs
│           ├── rate_limit.rs
│           ├── router.rs
│           ├── security.rs
│           ├── server.rs
│           ├── websocket.rs
│           └── ws.rs
├── frontend
│   ├── assets
│   │   ├── fonts
│   │   └── images
│   ├── private
│   │   ├── dashboard
│   │   │   ├── js
│   │   │   │   ├── blog_crud.js
│   │   │   │   ├── chat_with_agent.js
│   │   │   │   ├── dashboard_tabs.js
│   │   │   │   ├── edit_challenge_results.js
│   │   │   │   ├── edit_records.js
│   │   │   │   ├── edit_wikipedia_results.js
│   │   │   │   ├── show_queue.js
│   │   │   │   ├── show_server_info.js
│   │   │   │   ├── show_trace_reasoning.js
│   │   │   │   ├── widget_contact.js
│   │   │   │   ├── widget_deadlinks.js
│   │   │   │   ├── widget_record_generator.js
│   │   │   │   ├── widget_security.js
│   │   │   │   ├── widget_sources.js
│   │   │   │   ├── widget_spellcheck.js
│   │   │   │   ├── widget_spider.js
│   │   │   │   └── widget_user_manager.js
│   │   │   ├── contributor_dashboard.html
│   │   │   └── dashboard.html
│   │   ├── login
│   │   │   ├── js
│   │   │   │   ├── check_passcode.js
│   │   │   │   └── send_passcode.js
│   │   │   └── login.html
│   │   └── template_ response
│   │       ├── js
│   │       │   └── response_links_to_challenge.js
│   │       └── response.html
│   ├── public
│   │   ├── assets
│   │   │   └── images
│   │   ├── challenge
│   │   │   ├── js
│   │   │   └── response1.html
│   │   ├── context
│   │   │   ├── js
│   │   │   └── ... (40+ articles)
│   │   ├── js
│   │   │   ├── admin_edit_view.js
│   │   │   ├── agent_webhook_status.js
│   │   │   ├── ardor_tree.js
│   │   │   ├── display_academic_list.js
│   │   │   ├── display_page_views.js
│   │   │   ├── display_popular_list.js
│   │   │   ├── display_sources.js
│   │   │   ├── display_top_blog_post.js
│   │   │   ├── display_top_four_news_items.js
│   │   │   ├── dynamic_tabs.js
│   │   │   ├── map_zoom.js
│   │   │   ├── record_form_handler.js
│   │   │   ├── refresh_list.js
│   │   │   ├── refresh_records.js
│   │   │   ├── search_records.js
│   │   │   ├── show_draft_record.js
│   │   │   ├── store_contact.js
│   │   │   ├── store_donor.js
│   │   │   └── timeline.js
│   │   ├── map
│   │   │   ├── js
│   │   │   │   └── map_zoom.js
│   │   │   ├── galilee.html
│   │   │   ├── jerusalem.html
│   │   │   ├── judea.html
│   │   │   ├── levant.html
│   │   │   └── rome.html
│   │   ├── resource
│   │   │   ├── js
│   │   │   └── ... (list files)
│   │   ├── static
│   │   │   └── js
│   │   │       └── display_sources.js
│   │   ├── about.html
│   │   ├── academic_challenge.html
│   │   ├── blog_feed.html
│   │   ├── challenge.html
│   │   ├── context.html
│   │   ├── evidence.html
│   │   ├── histography.html
│   │   ├── maps.html
│   │   ├── news_and_blog.html
│   │   ├── news_feed.html
│   │   ├── popular_challenge.html
│   │   ├── readme.md
│   │   ├── records.html
│   │   ├── resources.html
│   │   ├── robots.txt
│   │   ├── timeline.html
│   │   └── wikipedia.html
│   └── static
│       ├── js
│       │   ├── bible_linker.js
│       │   ├── component_loader.js
│       │   ├── current_item_highlight.js
│       │   ├── destination_item_highlight.js
│       │   ├── error_translator.js
│       │   ├── essay_editor.js
│       │   ├── evidence_drag_drop.js
│       │   ├── footer_actions.js
│       │   ├── metadata_loader.js
│       │   ├── mobile_menu.js
│       │   ├── render_bibliography.js
│       │   ├── wasm_bridge.js
│       │   └── wasm_interop_demo.js
│       ├── navigation
│       │   ├── js
│       │   ├── footer.html
│       │   ├── header.html
│       │   ├── robot_header.html
│       │   └── side_bar.html
│       └── style.css
└── makefile
```
