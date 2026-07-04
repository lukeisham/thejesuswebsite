/**
 * MCP tool: getEssayBySlug
 *
 * Retrieves a single published contextual essay by its URL slug.
 *
 * @param {string} slug - The URL slug of the essay (required, non-empty).
 */
export const name = 'getEssayBySlug';

export const description =
  'Look up a published contextual essay by its URL slug. Returns the full essay with its content.';

export const inputSchema = {
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      description: 'The URL slug of the essay (e.g. "messianic-expectations").',
    },
  },
  required: ['slug'],
};

/**
 * Validate the slug, request the essays endpoint, and return the result.
 *
 * @param {object}   args       - Must contain a non-empty `slug` string.
 * @param {Function} apiRequest - Shared fetch helper (injected for testability).
 * @returns {Promise<object>} MCP tool result.
 */
export async function handler(args, apiRequest) {
  const slug = (args.slug || '').trim();
  if (!slug) {
    return {
      content: [{ type: 'text', text: 'Error: slug must be a non-empty string.' }],
      isError: true,
    };
  }

  const data = await apiRequest(`/essays/${encodeURIComponent(slug)}`);
  if (!data || data.error) {
    return {
      content: [{ type: 'text', text: `Essay not found for slug "${slug}".` }],
      isError: true,
    };
  }

  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
