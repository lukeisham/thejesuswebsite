# MCP Server — thejesuswebsite.org

Exposes thejesuswebsite's published scholarly content to AI assistants via the
[Model Context Protocol](https://modelcontextprotocol.io) (MCP). Any MCP-compatible
client can use these tools to search and retrieve evidence, essays, blog posts,
timeline events, maps, and news articles.

## How it works

The server supports two transports:

- **Streamable HTTP** (default) — runs as a standalone process listening on a
  port. Any MCP client can connect via URL. Used on the VPS to serve the hosted
  endpoint at `https://www.thejesuswebsite.org/mcp`. No local install required.
- **stdio** (`--stdio` flag) — classic MCP transport for local development.
  Your MCP client launches and manages the process directly.

Both modes make read-only HTTP `GET` requests to the main website's public JSON
API and return structured results to the AI client.

```
# Streamable HTTP (hosted / VPS):
AI Client ──HTTP──▶ nginx ──proxy──▶ mcp-server ──HTTP──▶ API ──▶ SQLite

# stdio (local development):
AI Client ──stdio──▶ mcp-server ──HTTP──▶ API ──▶ SQLite
```

### Hosted endpoint (no setup required)

```
https://www.thejesuswebsite.org/mcp
```

Point any MCP-compatible client at this URL. The server is read-only and
requires no authentication — it only returns published (public) content.

## Available tools

| Tool | Description |
|---|---|
| `searchEvidence` | Full-text search across evidence, essays, blog posts, etc. |
| `getItemBySlug` | Look up a published evidence item by its URL slug. |
| `getEssayBySlug` | Look up a published contextual essay by slug. |
| `getBlogPostBySlug` | Look up a published blog post by slug. |
| `getNewsArticleBySlug` | Look up a published news article by slug. |
| `getTimelineEvents` | Fetch the narrative timeline, optionally filtered by era. |
| `getMapData` | Fetch a map and its pins by unique map key. |

All tools are **read-only** and return only published (public) content.

## Discovery

AI agents can discover this server through several channels:

- **`llms.txt`** — the website serves an [`llms.txt`](https://llmstxt.org) at
  `https://www.thejesuswebsite.org/llms.txt` that describes the MCP server,
  its hosted endpoint URL, and lists all available tools. It is linked from the
  homepage via `<link rel="llms.txt">` and from every HTML response via a
  `Link` HTTP header.

- **Homepage `<link>` tag** — `<link rel="llms.txt" href="/llms.txt">` in
  `<head>` on every page.

- **`Link` HTTP header** — `Link: </llms.txt>; rel="llms.txt"` is sent with
  every HTML response, discoverable without parsing the page.

- **Direct URL** — `https://www.thejesuswebsite.org/mcp` is the hosted
  Streamable HTTP endpoint. Any MCP client that supports URL-based connections
  can connect directly without reading `llms.txt`.

- **Community MCP registries** — to register in the official
  [MCP server list](https://github.com/modelcontextprotocol/servers),
  submit a PR adding this entry:

  ```json
  {
    "thejesuswebsite": {
      "name": "The Jesus Website",
      "description": "Read-only access to published scholarly content about the historical Jesus — evidence items, essays, blog posts, news articles, timeline events, and maps.",
      "repository": "https://github.com/your-org/thejesuswebsite",
      "url": "https://www.thejesuswebsite.org/mcp",
      "tools": [
        "searchEvidence",
        "getItemBySlug",
        "getEssayBySlug",
        "getBlogPostBySlug",
        "getNewsArticleBySlug",
        "getTimelineEvents",
        "getMapData"
      ]
    }
  }
  ```

- **Aggregators** — also submit to [glama.ai/mcp](https://glama.ai/mcp),
  [mcp.so](https://mcp.so), and [smithery.ai](https://smithery.ai) for
  broader discoverability.

## Prerequisites

- **Node.js >= 18**
- Access to the thejesuswebsite API, either:
  - **Local**: the API running on `http://localhost:3000` (see `../api/`)
  - **Remote**: the production API at `https://www.thejesuswebsite.org/api`

## Quick start

### Hosted (no setup)

Connect your MCP client directly to `https://www.thejesuswebsite.org/mcp`.
See the client-specific config snippets below for URL-based connection examples.

### Local development

```bash
cd mcp-server
npm install

# Copy and edit the env file (or set variables directly)
cp .env.example .env

# Streamable HTTP mode (default — listens on port 3100):
node --env-file=.env server.js

# stdio mode (for IDE-based MCP clients like Zed, Cursor):
node --env-file=.env server.js --stdio
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000/api` | Base URL of the thejesuswebsite JSON API. Set to `https://www.thejesuswebsite.org/api` for production. |
| `PORT` | `3100` | Port for the Streamable HTTP server. Ignored in `--stdio` mode. |

Three ways to load env vars:

```bash
# Option 1 — Node --env-file flag (Node 20.6+, simplest)
cp .env.example .env
node --env-file=.env server.js

# Option 2 — export for the current shell session
cp .env.example .env
export $(cat .env | xargs)
node server.js

# Option 3 — let your MCP client set the env (see config snippets below)
```

## MCP client configuration

### URL-based connection (recommended — no local install)

For clients that support MCP over HTTP, point them at the hosted endpoint.
This works from anywhere with no Node.js, no repo clone, and no config:

```
URL: https://www.thejesuswebsite.org/mcp
```

Client-specific URL config:

**Zed** — `zed: open settings` → `{}` icon for JSON:

```json
{
  "context_servers": {
    "thejesuswebsite": {
      "url": "https://www.thejesuswebsite.org/mcp"
    }
  }
}
```

**Claude Desktop** — `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`):

```json
{
  "mcpServers": {
    "thejesuswebsite": {
      "url": "https://www.thejesuswebsite.org/mcp"
    }
  }
}
```

**Cursor** — `Cursor > Settings > MCP > Add new MCP server`:

```json
{
  "mcpServers": {
    "thejesuswebsite": {
      "url": "https://www.thejesuswebsite.org/mcp"
    }
  }
}
```

### stdio connection (local development — full control)

If you need to run the server locally (e.g. pointing at `localhost:3000`
during development), use stdio mode:

**Zed:**

```json
{
  "context_servers": {
    "thejesuswebsite": {
      "command": {
        "path": "node",
        "args": ["/absolute/path/to/mcp-server/server.js", "--stdio"],
        "env": {
          "API_BASE_URL": "http://localhost:3000/api"
        }
      }
    }
  }
}
```

**Claude Desktop:**

```json
{
  "mcpServers": {
    "thejesuswebsite": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/server.js", "--stdio"],
      "env": {
        "API_BASE_URL": "http://localhost:3000/api"
      }
    }
  }
}
```

**VS Code / Cline** (`~/.cline/mcp_settings.json`):

```json
{
  "mcpServers": {
    "thejesuswebsite": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/server.js", "--stdio"],
      "env": {
        "API_BASE_URL": "https://www.thejesuswebsite.org/api"
      }
    }
  }
}
```

**Continue** (VS Code / JetBrains, in `~/.continue/config.json`):

```json
{
  "mcpServers": [
    {
      "name": "thejesuswebsite",
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/server.js", "--stdio"],
      "env": {
        "API_BASE_URL": "https://www.thejesuswebsite.org/api"
      }
    }
  ]
}
```

### Generic

**URL-based (hosted):**

```
url: https://www.thejesuswebsite.org/mcp
```

**stdio (local):**

```
command: node
args: ["/path/to/server.js", "--stdio"]
env: { "API_BASE_URL": "https://www.thejesuswebsite.org/api" }
```

## Running tests

```bash
npm test
```

Tests use `node:test` and `node:assert` (no extra dependencies). They inject
a mock `apiRequest` so no live API or network access is needed.

## Project structure

```
mcp-server/
├── server.js          # Entry point — MCP server, HTTP + stdio transports
├── tools/             # One file per tool (Vibe Coding Rule SR-1)
│   ├── searchEvidence.js
│   ├── getItemBySlug.js
│   ├── getEssayBySlug.js
│   ├── getBlogPostBySlug.js
│   ├── getNewsArticleBySlug.js
│   ├── getTimelineEvents.js
│   └── getMapData.js
├── tests/
│   └── tools.test.js  # Offline tests for every tool + health endpoint
├── package.json
├── .env.example       # Environment variable reference
└── README.md          # This file
```
