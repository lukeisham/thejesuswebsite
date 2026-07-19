/**
 * MCP tool: searchEvidence
 *
 * Searches the published evidence corpus via the public FTS endpoint.
 * Returns ranked matches across all searchable entity types (evidence, essays, etc.).
 *
 * @param {string} query - The search term (required, non-empty).
 * @param {string} [type]  - Optional entity type filter (e.g. "evidence").
 * @param {number} [limit] - Max results to return (1–100, default 25).
 */
export const name = 'searchEvidence';

export const description =
  'Search the published scholarly evidence corpus. Returns ranked matches across evidence items, essays, blog posts, and more.';

export const inputSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'The search term — at least one non-whitespace character.',
      maxLength: 200,
    },
    type: {
      type: 'string',
      description: 'Optional entity type to narrow results (e.g. "evidence").',
      maxLength: 50,
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (1–100, default 25).',
    },
  },
  required: ['query'],
};

/**
 * Build and validate the request, then call the shared fetch helper.
 *
 * @param {object}   args      - Validated tool arguments.
 * @param {Function} apiRequest - Shared fetch helper (injected for testability).
 * @returns {Promise<object>} MCP tool result with content array.
 */
export async function handler(args, apiRequest) {
  const query = (args.query || '').trim();
  if (!query) {
    return {
      content: [{ type: 'text', text: 'Error: query must be a non-empty string.' }],
      isError: true,
    };
  }

  const params = new URLSearchParams();
  params.set('q', query);

  if (args.type) {
    params.set('type', args.type);
  }

  if (args.limit != null) {
    const resolved = Math.max(1, Math.min(Number(args.limit), 100));
    params.set('limit', String(resolved));
  }

  const data = await apiRequest(`/search?${params.toString()}`);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
