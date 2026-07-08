// MCP Server entry point — instantiates the MCP server, registers all seven
// read-only tools, and serves via Streamable HTTP transport (the 2025 MCP spec
// addition). The server can also run in stdio mode for local development — see
// the --stdio flag below. The API base URL is read from the API_BASE_URL
// environment variable with a localhost default.
//
// Each tool module exports { name, description, inputSchema, handler } so the
// server registration loop is declarative and easy to extend.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "node:http";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";
const PORT = parseInt(process.env.PORT || "3100", 10);

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

// stdio mode: run with --stdio for local development / IDE integration.
// Streamable HTTP mode (default): listen on PORT for any MCP client to connect
// via URL — no local install required.

if (process.argv.includes("--stdio")) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    // Health check — lightweight, no MCP negotiation needed.
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    try {
      if (req.method === "POST") {
        // Read the request body for the JSON-RPC payload.
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();
        await transport.handleRequest(req, res, body);
      } else if (req.method === "GET" || req.method === "DELETE") {
        // GET: SSE stream or session lookup. DELETE: session teardown.
        await transport.handleRequest(req, res);
      } else {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method Not Allowed");
      }
    } catch (error) {
      console.error("MCP request failed:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`MCP server listening on http://localhost:${PORT}`);
  });
}
