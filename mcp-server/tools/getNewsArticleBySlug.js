/**
 * MCP tool: getNewsArticleBySlug
 *
 * Retrieves a single published news article by its URL slug. Returns metadata
 * plus the source URL (the full article lives on the external news site).
 *
 * @param {string} slug - The URL slug of the news article (required, non-empty).
 */
export const name = 'getNewsArticleBySlug';

export const description =
  'Look up a published news article by its URL slug. Returns article metadata and the source URL.';

export const inputSchema = {
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      description: 'The URL slug of the news article (e.g. "new-discovery-qumran").',
      maxLength: 200,
    },
  },
  required: ['slug'],
};

/**
 * Validate the slug, request the news-articles endpoint, and return the result.
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

  const data = await apiRequest(`/news-articles/${encodeURIComponent(slug)}`);
  if (!data || data.error) {
    return {
      content: [{ type: 'text', text: `News article not found for slug "${slug}".` }],
      isError: true,
    };
  }

  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
