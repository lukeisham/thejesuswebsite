/**
 * MCP tool: getEssayBySlug
 *
 * Retrieves a single published contextual essay by its URL slug.
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
      maxLength: 200,
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
  const slug = typeof args.slug === 'string' ? args.slug.trim() : '';
  if (!slug) {
    return {
      content: [{ type: 'text', text: 'Error: slug must be a non-empty string.' }],
      isError: true,
    };
  }

  const notFound = {
    content: [{ type: 'text', text: `Essay not found for slug "${slug}".` }],
    isError: true,
  };

  let data;
  try {
    data = await apiRequest(`/essays/${encodeURIComponent(slug)}`);
  } catch (error) {
    // server.js apiRequest throws for every non-2xx reply with the HTTP status
    // on error.status, so an unknown or unpublished record (404) arrives here,
    // never as data.error. Any other failure propagates to the server's error
    // response.
    if (error.status === 404) return notFound;
    throw error;
  }
  if (!data || data.error) return notFound;

  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
