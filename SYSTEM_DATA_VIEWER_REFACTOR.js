const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak } = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading(text, level) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: [new TextRun({ text, size: 22, ...opts.run })] });
}

function boldPara(label, text) {
  return new Paragraph({ spacing: { after: 120 }, children: [
    new TextRun({ text: label, bold: true, size: 22 }),
    new TextRun({ text, size: 22 }),
  ]});
}

function stepParagraph(stepNum, text) {
  return new Paragraph({ spacing: { after: 80 }, children: [
    new TextRun({ text: `Step ${stepNum}: `, bold: true, size: 22, color: "2E75B6" }),
    new TextRun({ text, size: 22 }),
  ]});
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { after: 120 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    children: [new TextRun({ text, font: "Courier New", size: 18 })],
  });
}

function taskRow(step, file, instruction) {
  return new TableRow({ children: [
    new TableCell({ borders, width: { size: 800, type: WidthType.DXA }, margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: step, size: 20, bold: true })] })] }),
    new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: file, font: "Courier New", size: 18 })] })] }),
    new TableCell({ borders, width: { size: 6160, type: WidthType.DXA }, margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: instruction, size: 20 })] })] }),
  ]});
}

function headerRow(c1, c2, c3) {
  const hdr = { fill: "2E75B6", type: ShadingType.CLEAR };
  const run = { size: 20, bold: true, color: "FFFFFF" };
  return new TableRow({ children: [
    new TableCell({ borders, width: { size: 800, type: WidthType.DXA }, margins: cellMargins, shading: hdr,
      children: [new Paragraph({ children: [new TextRun({ text: c1, ...run })] })] }),
    new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, margins: cellMargins, shading: hdr,
      children: [new Paragraph({ children: [new TextRun({ text: c2, ...run })] })] }),
    new TableCell({ borders, width: { size: 6160, type: WidthType.DXA }, margins: cellMargins, shading: hdr,
      children: [new Paragraph({ children: [new TextRun({ text: c3, ...run })] })] }),
  ]});
}

function sectionBreak() {
  return new Paragraph({ spacing: { before: 200, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 8 } }, children: [] });
}

// ─── Build Document ───

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1A1A1A" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "404040" },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets6", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets7", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ children: [
        new TextRun({ text: "The Jesus Website \u2014 System Data Viewer Refactor", size: 16, color: "999999", font: "Arial" }),
      ]})] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
        new TextRun({ text: "Page ", size: 16, color: "999999" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999" }),
      ]})] }),
    },
    children: [
      // ═══ TITLE PAGE ═══
      heading("System Data Viewer Refactor", HeadingLevel.HEADING_1),
      boldPara("Project: ", "The Jesus Website"),
      boldPara("Date: ", "10 March 2026"),
      boldPara("Target Agent: ", "Gemini Flash (AntiGravity)"),
      boldPara("Status: ", "Implementation Plan"),
      para(""),
      para("This document contains step-by-step instructions for converting the System Data Viewer panel in dashboard.html from a tabbed, interactive tool into a read-only, auto-refreshing system health feed. Each step is small and self-contained so that an LLM coding agent can execute them sequentially without hallucinating or skipping."),
      sectionBreak(),

      // ═══ OVERVIEW ═══
      heading("Overview of Changes", HeadingLevel.HEADING_2),
      para("The System Data Viewer currently shows tabbed content (Essays, Records, Responses, Blogs, Wiki Data, Research) and system tabs (Metrics, Queue, Security, Triage, Deadlinks, Spelling, Weights). The goal is to:"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Remove ALL tabs and action buttons from the System Data Viewer panel", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Replace with a single scrollable feed showing system health data from all system categories", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Auto-refresh every 60 minutes via a frontend setInterval timer", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "When any system category reports an error or warning, inject an alert message into the #chat-messages panel", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Ensure all backend endpoints exist and return real data (fix stubs where needed)", size: 22 })] }),
      para(""),
      boldPara("Excluded from feed: ", "Records, Essays, Responses, Blog posts, Challenges, Research, Wikipedia lists, Weights. These remain in the CRUD tabs and are not system health data."),
      sectionBreak(),

      // ═══ CURRENT STATE ═══
      heading("Current Backend State Audit", HeadingLevel.HEADING_2),
      para("Before making changes, here is the current state of each system data endpoint. The agent must understand which are real and which are stubs."),
      para(""),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1800, 2800, 1600, 1600, 1560],
        rows: [
          new TableRow({ children: [
            ...["Category", "API Route", "DB Table", "Status", "Handler File"].map(t =>
              new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, margins: cellMargins,
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: t, size: 18, bold: true, color: "FFFFFF" })] })] }))
          ]}),
          ...([
            ["Server Metrics", "GET /api/v1/metrics/server", "server_metrics", "FULL", "api_tools.rs"],
            ["Token Metrics", "GET /api/v1/metrics/tokens", "tokens", "FULL", "api_tools.rs"],
            ["Security Logs", "GET /api/v1/admin/security/logs", "security_logs", "FULL", "api_security.rs"],
            ["Contact Triage", "GET /api/v1/contact/triage", "contacts", "FULL", "api_contacts.rs"],
            ["Queue/Workflow", "GET /api/v1/agent/queue", "work_queue", "FULL", "api_agents.rs"],
            ["Sources", "GET /api/v1/sources", "sources", "FULL", "api_sources.rs"],
            ["Self Reflection", "GET /api/v1/agent/trace", "trace_reasoning", "MIXED", "api_agents.rs"],
            ["Page Metrics", "GET /api/v1/metrics/page", "page_views", "STUB", "api_tools.rs"],
            ["Deadlinks", "GET /api/widgets/deadlinks/run", "(none)", "STUB", "api_deadlinks.rs"],
            ["Spelling", "GET /api/widgets/spellcheck/run", "(none)", "STUB", "api_spelling.rs"],
          ].map(([cat, route, table, status, file]) =>
            new TableRow({ children: [cat, route, table, status, file].map((t, i) =>
              new TableCell({ borders, width: { size: [1800,2800,1600,1600,1560][i], type: WidthType.DXA }, margins: cellMargins,
                shading: status === "STUB" && i === 3 ? { fill: "FFF3CD", type: ShadingType.CLEAR } :
                         status === "MIXED" && i === 3 ? { fill: "D4EDDA", type: ShadingType.CLEAR } : undefined,
                children: [new Paragraph({ children: [new TextRun({ text: t, size: 18, font: i === 1 || i === 4 ? "Courier New" : "Arial" })] })] }))
            })
          )),
        ],
      }),

      para(""),
      boldPara("Key: ", "FULL = queries real DB data. STUB = returns hardcoded mock data. MIXED = some endpoints real, some stub."),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ PHASE 1 ═══
      heading("Phase 1: Fix Backend Stubs (Rust)", HeadingLevel.HEADING_1),
      para("Before touching the frontend, make sure every system endpoint returns real data from the database. Complete each step, compile, and confirm no errors before moving to the next."),
      para(""),

      heading("1A: Fix Page Metrics Endpoint", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("1.1", "app/app_storage/database/schema.sql", "Confirm the page_views table exists. It should have columns: id, page_url TEXT, view_count INTEGER, last_viewed_at TEXT. If missing, add a CREATE TABLE statement."),
        taskRow("1.2", "app/app_storage/src/sqlite.rs", "Find the function that the page metrics handler calls. If it returns hardcoded values, replace it with a real query: SELECT COUNT(DISTINCT page_url) as pages_tracked, SUM(view_count) as total_views FROM page_views. Return these two numbers."),
        taskRow("1.3", "app/app_ui/src/api_tools.rs", "Find handle_page_metrics() (around line 256). It currently returns hardcoded strings like \"120ms\". Change it to call the sqlite function from step 1.2 and return the real counts. The response struct PageMetricsResponse may need its fields changed from load_time/ttfb/dom_ready to pages_tracked/total_views."),
        taskRow("1.4", "Compile check", "Run: cargo check from the project root. Fix any compile errors before proceeding."),
      ]}),

      para(""),
      heading("1B: Fix Spelling Endpoint", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("1.5", "app/app_storage/database/schema.sql", "Add a new table if it does not exist: CREATE TABLE IF NOT EXISTS spelling_issues (id TEXT PRIMARY KEY, bad_word TEXT NOT NULL, suggestion TEXT, source_text TEXT, context TEXT, created_at TEXT NOT NULL DEFAULT (datetime(\"now\")));"),
        taskRow("1.6", "app/app_storage/src/sqlite.rs", "Add two functions: (a) store_spelling_issue(issue) that does INSERT OR REPLACE into spelling_issues. (b) get_spelling_issues() that does SELECT * FROM spelling_issues ORDER BY created_at DESC LIMIT 50 and returns a Vec of spelling issue structs."),
        taskRow("1.7", "app/app_ui/src/api_spelling.rs", "Find handle_spellcheck_run() (around line 7). It returns mock data. Change it to call get_spelling_issues() from sqlite.rs. Return the real results. Keep the same response shape (Vec of objects with bad_word, suggestion, text, context)."),
        taskRow("1.8", "Compile check", "Run: cargo check. Fix any compile errors."),
      ]}),

      para(""),
      heading("1C: Fix Deadlinks Endpoint", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("1.9", "app/app_storage/database/schema.sql", "Add a new table if it does not exist: CREATE TABLE IF NOT EXISTS deadlink_issues (id TEXT PRIMARY KEY, url TEXT NOT NULL, status_code INTEGER, context TEXT, created_at TEXT NOT NULL DEFAULT (datetime(\"now\")));"),
        taskRow("1.10", "app/app_storage/src/sqlite.rs", "Add two functions: (a) store_deadlink_issue(issue) that does INSERT OR REPLACE into deadlink_issues. (b) get_deadlink_issues() that does SELECT * FROM deadlink_issues ORDER BY created_at DESC LIMIT 50 and returns a Vec."),
        taskRow("1.11", "app/app_ui/src/api_deadlinks.rs", "Find handle_deadlinks_run() (around line 7). It returns mock deadlink data. Change it to call get_deadlink_issues() from sqlite.rs. Keep the same response shape (Vec of objects with id, url, status, context)."),
        taskRow("1.12", "Compile check", "Run: cargo check. Fix any compile errors."),
      ]}),

      para(""),
      heading("1D: Fix Self Reflection Endpoint", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("1.13", "app/app_ui/src/api_agents.rs", "Find handle_agent_reflection() (around line 127). It returns a hardcoded string. Change it to query the trace_reasoning table: SELECT step, reasoning FROM trace_reasoning ORDER BY created_at DESC LIMIT 1. Return the most recent reasoning entry as the reflection text. If the table is empty, return \"No reflections recorded yet.\""),
        taskRow("1.14", "Compile check", "Run: cargo check. Fix any compile errors."),
      ]}),

      para(""),
      heading("1E: Create Unified System Feed Endpoint", HeadingLevel.HEADING_2),
      para("Create a single endpoint that aggregates all system data into one response, so the frontend only needs one fetch call."),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("1.15", "app/app_ui/src/api_tools.rs", "At the bottom of the file, add a new handler function: pub async fn handle_system_feed(State(state): State<AppState>) -> impl IntoResponse. This function should call each of these existing functions and collect their results into a single JSON response: (a) server metrics, (b) token metrics, (c) security logs (last 5 only), (d) contact triage summary, (e) agent queue status, (f) source count, (g) agent trace (last entry), (h) page metrics, (i) deadlink issues (last 5), (j) spelling issues (last 5). Wrap all results in a single struct called SystemFeedResponse with one field per category."),
        taskRow("1.16", "app/app_ui/src/api_tools.rs", "Define the SystemFeedResponse struct above the handler. It should have fields: server_metrics, token_metrics, security_alerts (Vec, max 5), contact_summary, queue_status, source_count (usize), last_reflection (String), page_metrics, deadlink_issues (Vec, max 5), spelling_issues (Vec, max 5). Each field uses the existing response types from the individual endpoints. Add #[derive(Serialize)] to the struct."),
        taskRow("1.17", "Router file", "Find the router file (likely app/app_ui/src/lib.rs or router.rs). Add a new route: .route(\"/api/v1/system/feed\", get(handle_system_feed)). Make sure the import is added at the top."),
        taskRow("1.18", "Compile check", "Run: cargo check. Fix any compile errors."),
        taskRow("1.19", "Full build", "Run: cargo build --release. Confirm it compiles successfully with zero errors."),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ PHASE 2 ═══
      heading("Phase 2: Refactor Frontend (dashboard.html)", HeadingLevel.HEADING_1),
      para("Now modify the dashboard to replace the tabbed viewer with a unified feed. Work in small steps. After each step, save the file and visually check in the browser."),
      para(""),

      heading("2A: Remove Viewer Tabs and Action Bar", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("2.1", "dashboard.html", "Find the div with class \"tabs viewer-tabs\" (around line 713-732). This is the scrollable tab bar with buttons like Essays, Records, Responses, Blogs, Wiki Data, Research, Metrics, Queue, Security, Triage, Deadlinks, Spelling, Weights. DELETE this entire div element including all its children. Do not delete anything else."),
        taskRow("2.2", "dashboard.html", "Find the div with id \"viewer-action-bar\" (around line 748-765). This contains Select All checkbox, Generate button, Delete button, Edit in CRUD button, Publish button. DELETE this entire div element including all its children."),
        taskRow("2.3", "dashboard.html", "Find the span with id \"viewer-status-indicator\" that shows \"[CONTENT MODE]\" or \"[SYSTEM MODE]\" (in the header area of the System Data Viewer panel). Change its text content from \"[CONTENT MODE]\" to \"System Health Feed\" and remove the font-weight: bold style."),
        taskRow("2.4", "Save and check", "Save dashboard.html. Open the dashboard in a browser. The right panel should now show just the header \"System Data Viewer\" with \"System Health Feed\" label, and the empty scrollable list area. No tabs, no buttons at the bottom."),
      ]}),

      para(""),
      heading("2B: Update the List Container", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("2.5", "dashboard.html", "Find the div with id \"viewer-list-container\". Change its max-height style from 280px to 500px so the feed has more vertical space now that there are no tabs or action bar."),
        taskRow("2.6", "dashboard.html", "Inside that div, find the ul with id \"viewer-results-list\". Replace all its children (the default li with checkbox) with this single placeholder: <li style=\"padding: 12px; color: #999; font-size: 0.85rem; text-align: center;\">Loading system health data...</li>"),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ PHASE 3 ═══
      heading("Phase 3: Create System Feed JS Module", HeadingLevel.HEADING_1),
      para("Create a new JavaScript module that fetches the unified system feed and renders it as a scrollable list of labeled sections."),
      para(""),

      heading("3A: Create the File", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("3.1", "frontend/js/widgets/wgt_system_feed.js", "Create a new file at this path. It will be an ES module (type=\"module\"). Start with this skeleton and fill in the implementation in the following steps."),
      ]}),

      para(""),
      heading("3B: Implement the Fetch Function", HeadingLevel.HEADING_2),
      para("Inside wgt_system_feed.js, write a function called fetchSystemFeed that does the following:"),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("3.2", "wgt_system_feed.js", "Write an async function fetchSystemFeed(). It should: (a) fetch GET /api/v1/system/feed with no auth header. (b) Parse the JSON response. (c) Call renderFeed(data) with the result. (d) Call checkForAlerts(data) to look for problems. (e) Wrap everything in try/catch. On error, log to console and show an error message in #viewer-results-list."),
      ]}),

      para(""),
      heading("3C: Implement the Render Function", HeadingLevel.HEADING_2),
      para("The render function converts the feed JSON into HTML list items, one section per category, each clearly labeled."),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("3.3", "wgt_system_feed.js", "Write a function renderFeed(data). It should: (a) Get the element #viewer-results-list. (b) Clear its innerHTML. (c) For each system category, append one <li> element. Each <li> should have: a bold label (e.g. \"Server Metrics\"), then the key data points as text below it, separated by <br> tags. Use a light bottom border between sections."),
        taskRow("3.4", "wgt_system_feed.js", "The categories to render (in this exact order) and what to show for each: 1. Server Metrics: RAM usage, disk usage. 2. Token Metrics: tokens used vs limit, show percentage. 3. Security: count of recent alerts, list the last 3 event types. 4. Contact Triage: new message count, critical flag. 5. Queue/Workflow: running count, pending count. 6. Sources: total source count. 7. Last Reflection: the reflection text (truncate to 200 chars if longer). 8. Page Metrics: pages tracked, total views. 9. Deadlinks: count of issues, list first 3 URLs. 10. Spelling: count of issues, list first 3 bad words."),
        taskRow("3.5", "wgt_system_feed.js", "Each <li> should use this HTML structure: <li style=\"padding: 10px 8px; border-bottom: 1px solid #eee;\"><div style=\"font-weight: 600; font-size: 0.85rem; color: var(--accent-color); margin-bottom: 4px;\">CATEGORY LABEL</div><div style=\"font-size: 0.82rem; color: #555; line-height: 1.5;\">DATA POINTS HERE</div></li>"),
        taskRow("3.6", "wgt_system_feed.js", "At the very bottom of the feed list, append one final <li> with a small timestamp showing when the data was last refreshed. Format: \"Last refreshed: HH:MM:SS\" in gray italic text, centered."),
      ]}),

      para(""),
      heading("3D: Implement the Alert Function", HeadingLevel.HEADING_2),
      para("When system data shows problems, inject a warning message into the AI chat panel so the user notices."),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("3.7", "wgt_system_feed.js", "Write a function checkForAlerts(data). It should check these conditions and build an array of alert strings: (a) If token_metrics.used / token_metrics.limit > 0.8, add \"Token usage above 80%\". (b) If security_alerts array has any items with event_type \"Honeypot\" or \"LoginFail\", add \"Security alert: [event_type] detected\". (c) If contact_summary has critical === true, add \"Critical contact message waiting\". (d) If deadlink_issues has length > 0, add \"[N] broken links detected\". (e) If spelling_issues has length > 0, add \"[N] spelling issues found\"."),
        taskRow("3.8", "wgt_system_feed.js", "If the alerts array is not empty, find the element #chat-messages. Create a new div element with this structure: <div style=\"background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin: 6px 0; font-size: 0.85rem;\"><strong style=\"color: #856404;\">System Alert</strong><div style=\"margin-top: 4px; color: #856404;\">[Each alert on its own line joined by <br>]</div><div style=\"font-size: 0.7rem; color: #999; margin-top: 4px;\">[Current timestamp]</div></div>. Append this div to #chat-messages. Then scroll #chat-messages to the bottom by setting its scrollTop to its scrollHeight."),
        taskRow("3.9", "wgt_system_feed.js", "Add a deduplication check. Before injecting an alert, check if the LAST child of #chat-messages already contains \"System Alert\" and was added less than 5 minutes ago (store last alert time in a module-level variable). If so, skip injection to avoid flooding the chat."),
      ]}),

      para(""),
      heading("3E: Implement the Timer", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("3.10", "wgt_system_feed.js", "At the bottom of the module, add initialization code that runs on DOMContentLoaded: (a) Call fetchSystemFeed() immediately to load data on page open. (b) Set up setInterval(fetchSystemFeed, 60 * 60 * 1000) to refresh every 60 minutes. (c) Store the interval ID in a module-level variable in case it needs to be cleared later."),
      ]}),

      para(""),
      heading("3F: Add Script Tag", HeadingLevel.HEADING_2),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("3.11", "dashboard.html", "Find the section labeled \"Widget Scripts (ES Modules)\" near the bottom of the file (around line 1436). Add a new script tag: <script type=\"module\" src=\"/js/widgets/wgt_system_feed.js\"></script>. Add it AFTER the existing widget scripts."),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ PHASE 4 ═══
      heading("Phase 4: Clean Up Orphaned JS", HeadingLevel.HEADING_1),
      para("The viewer tab switching logic in the inline script is now dead code. Remove it carefully without breaking other functionality."),
      para(""),

      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [800, 2400, 6160], rows: [
        headerRow("#", "File", "Instruction"),
        taskRow("4.1", "dashboard.html", "In the inline <script> block (around line 1282-1320), find the block that starts with: const viewerTabsContainer = document.querySelector('.viewer-tabs'); This entire block (from that line through the closing }); of its addEventListener) is dead code because we deleted the .viewer-tabs element. DELETE this entire block. It spans roughly 40 lines and ends just before the \"Select All Logic\" comment."),
        taskRow("4.2", "dashboard.html", "Find the \"Select All Logic\" block (around line 1324-1332) starting with: const selectAllCb = document.getElementById('viewer-select-all'); DELETE this entire block. The select-all checkbox no longer exists."),
        taskRow("4.3", "dashboard.html", "Find the \"Edit in CRUD logic\" block (around line 1334-1392) starting with: if (btnEditCopy) {. DELETE this entire block. The edit/copy button no longer exists."),
        taskRow("4.4", "dashboard.html", "Find the variable declarations that referenced the deleted buttons (around line 1285-1288): const btnGenerate, const btnDeleteDismiss, const btnEditCopy, const btnPublish. DELETE these four lines."),
        taskRow("4.5", "Save and check", "Save the file. Open the dashboard in a browser. Open the browser console (F12). Confirm there are no JavaScript errors. The CRUD tabs (Records, Essays, etc) should still work. The cheatsheet panel should still update when you click CRUD tabs. The glossary panel should still update when you click CRUD tabs."),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ PHASE 5 ═══
      heading("Phase 5: Verification", HeadingLevel.HEADING_1),
      para("These are manual checks for the human developer to perform after the agent has completed all steps."),
      para(""),

      heading("5A: Backend Verification (Run on Server Terminal)", HeadingLevel.HEADING_2),
      para("Run each curl command on the server and confirm you get real JSON data back (not hardcoded stubs)."),
      para(""),
      codeBlock("# 1. Check unified feed endpoint exists and returns data:"),
      codeBlock("curl -s http://localhost:3000/api/v1/system/feed | python3 -m json.tool | head -40"),
      para(""),
      codeBlock("# 2. Check page metrics returns real data (not \"120ms\" strings):"),
      codeBlock("curl -s http://localhost:3000/api/v1/metrics/page | python3 -m json.tool"),
      para(""),
      codeBlock("# 3. Check spelling endpoint returns array (even if empty):"),
      codeBlock("curl -s http://localhost:3000/api/widgets/spellcheck/run | python3 -m json.tool"),
      para(""),
      codeBlock("# 4. Check deadlinks endpoint returns array (even if empty):"),
      codeBlock("curl -s http://localhost:3000/api/widgets/deadlinks/run | python3 -m json.tool"),
      para(""),
      codeBlock("# 5. Check reflection returns DB data (not hardcoded string):"),
      codeBlock("curl -s http://localhost:3000/api/v1/agent/reflection | python3 -m json.tool"),
      para(""),
      boldPara("Expected: ", "Each command should return valid JSON. No hardcoded placeholder strings. Empty arrays are fine if no data has been generated yet."),

      para(""),
      heading("5B: Frontend Verification (Check in Browser)", HeadingLevel.HEADING_2),
      para("Open the dashboard in your browser and verify these things visually:"),
      para(""),

      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "The System Data Viewer panel (right side) shows NO tabs at the top.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "The panel header says \"System Data Viewer\" with \"System Health Feed\" on the right.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "The scrollable area shows labeled sections: Server Metrics, Token Metrics, Security, Contact Triage, Queue/Workflow, Sources, Last Reflection, Page Metrics, Deadlinks, Spelling.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "There are NO action buttons (Generate, Delete, Edit, Publish) at the bottom.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "At the bottom of the feed there is a \"Last refreshed: HH:MM:SS\" timestamp.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "The CRUD tabs (Records, Essays, Responses, Blogs, Wiki Weights) still work normally.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "The cheatsheet panel still updates when you click CRUD tabs.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "The glossary panel still updates when you click CRUD tabs.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Open browser console (F12). Confirm zero JavaScript errors.", size: 22 })] }),
      new Paragraph({ numbering: { reference: "bullets2", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "Wait 2 minutes or manually trigger a token/security condition. Check that a yellow \"System Alert\" message appears in the chat panel.", size: 22 })] }),

      para(""),
      heading("5C: Quick Smoke Test for Chat Alerts", HeadingLevel.HEADING_2),
      para("To test the alert system without waiting for real problems, temporarily modify one endpoint to return a warning condition:"),
      para(""),
      codeBlock("# In the browser console, paste this to simulate a high token usage alert:"),
      codeBlock("// This tests that the alert injection into #chat-messages works"),
      codeBlock("// Restore the original after confirming the alert appears"),
      para(""),
      para("Alternatively, add a single entry to the deadlink_issues or spelling_issues table via SQLite to trigger an alert on the next feed refresh."),
      codeBlock("sqlite3 /path/to/your/database.db \"INSERT INTO deadlink_issues (id, url, status_code, context) VALUES ('test-1', 'https://example.com/broken', 404, 'Test entry');\""),
      para(""),
      boldPara("After testing: ", "Delete the test entry with: DELETE FROM deadlink_issues WHERE id = 'test-1';"),

      sectionBreak(),

      // ═══ APPENDIX ═══
      heading("Appendix: Files Changed Summary", HeadingLevel.HEADING_2),
      para(""),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [4000, 1400, 3960], rows: [
        new TableRow({ children: [
          ...["File Path", "Action", "Phase"].map(t =>
            new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: cellMargins,
              shading: { fill: "2E75B6", type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: t, size: 18, bold: true, color: "FFFFFF" })] })] }))
        ]}),
        ...([
          ["app/app_storage/database/schema.sql", "Edit", "Phase 1"],
          ["app/app_storage/src/sqlite.rs", "Edit", "Phase 1"],
          ["app/app_ui/src/api_tools.rs", "Edit", "Phase 1"],
          ["app/app_ui/src/api_spelling.rs", "Edit", "Phase 1"],
          ["app/app_ui/src/api_deadlinks.rs", "Edit", "Phase 1"],
          ["app/app_ui/src/api_agents.rs", "Edit", "Phase 1"],
          ["Router file (lib.rs or router.rs)", "Edit", "Phase 1"],
          ["frontend/private/dashboard.html", "Edit", "Phase 2 & 4"],
          ["frontend/js/widgets/wgt_system_feed.js", "New", "Phase 3"],
        ].map(([file, action, phase]) =>
          new TableRow({ children: [file, action, phase].map((t, i) =>
            new TableCell({ borders, width: { size: [4000,1400,3960][i], type: WidthType.DXA }, margins: cellMargins,
              shading: action === "New" && i === 1 ? { fill: "D4EDDA", type: ShadingType.CLEAR } : undefined,
              children: [new Paragraph({ children: [new TextRun({ text: t, size: 18, font: i === 0 ? "Courier New" : "Arial" })] })] }))
          })
        )),
      ]}),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/zen-eager-wright/mnt/thejesuswebsite/SYSTEM_DATA_VIEWER_REFACTOR.docx", buffer);
  console.log("Done: SYSTEM_DATA_VIEWER_REFACTOR.docx");
});
