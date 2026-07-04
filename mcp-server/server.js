// MCP Server entry point — instantiates the MCP server, registers all seven
// read-only tools, and connects via stdio transport. The API base URL is read
// from the API_BASE_URL environment variable with a localhost default.
//
// Each tool module exports { name, description, inputSchema, handler } so the
// server registration loop is declarative and easy to extend.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

// --- Tool registry -----------------------------------------------------------
// Import one module per tool (SR-1). Add new tools by inserting another entry
// and creating the matching file under tools/.

const toolModules = [
  await import("./tools/searchEvidence.js"),
  await import("./tools/getItemBySlug.js"),
  await import("./tools/getEssayBySlug.js"),
  await import("./tools/getBlogPostBySlug.js"),
  await import("./tools/getNewsArticleBySlug.js"),
  await import("./tools/getTimelineEvents.js"),
  await import("./tools/getMapData.js"),
];

// --- Shared fetch helper (JS-5: centralise raw fetch, async/await + try/catch)
// Every tool calls this instead of reaching for fetch directly, so we can
// inject a mock in tests and keep error handling in one place.

/**
 * Makes a GET request to the upstream API and returns parsed JSON.
 * Throws on network failure or non-2xx responses so callers get a clean
 * MCP error result rather than an unhandled rejection.
 *
 * @param {string} path - URL path with leading slash (e.g. "/search?q=term").
 * @returns {Promise<object>} Parsed JSON body.
 */
export async function apiRequest(path) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    // 404s are returned as { error: "..." } JSON, so parse the body if possible.
    let detail = "";
    try {
      const body = await res.json();
      detail = body.error || "";
    } catch {
      // ignore — fall through with status-only message.
    }
    throw new Error(
      `Upstream API returned ${res.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  return res.json();
}

// --- Server setup ------------------------------------------------------------

const server = new Server(
  {
    name: "thejesuswebsite-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  },
);

// ListTools: respond with the name, description, and inputSchema of every tool.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolModules.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

// CallTool: dispatch to the matching handler, passing validated args and the
// shared apiRequest helper. Unknown tool names and upstream errors both produce
// explicit MCP error responses (JS-2: never fail silently).
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolModules.find((t) => t.name === request.params.name);

  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: "${request.params.name}".`,
        },
      ],
      isError: true,
    };
  }

  try {
    return await tool.handler(request.params.arguments ?? {}, apiRequest);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Tool "${request.params.name}" failed: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// --- Transport ---------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
