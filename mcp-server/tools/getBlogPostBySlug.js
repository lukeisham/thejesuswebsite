/**
 * MCP tool: getBlogPostBySlug
 *
 * Retrieves a single published blog post by its URL slug.
 */
export const name = 'getBlogPostBySlug';

export const description =
  'Look up a published blog post by its URL slug. Returns the full post with its content and metadata.';

export const inputSchema = {
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      description: 'The URL slug of the blog post (e.g. "historical-jesus-debate-update").',
      maxLength: 200,
    },
  },
  required: ['slug'],
};

/**
 * Validate the slug, request the blog-posts endpoint, and return the result.
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
    content: [{ type: 'text', text: `Blog post not found for slug "${slug}".` }],
    isError: true,
  };

  let data;
  try {
    data = await apiRequest(`/blog-posts/${encodeURIComponent(slug)}`);
  } catch (error) {
    // server.js apiRequest throws "Upstream API returned <status>..." for every
    // non-2xx reply, so an unknown or draft slug (404) arrives here, never as
    // data.error. Any other failure still propagates to the server's error
    // response. If that message format changes, change this match with it.
    if (/returned 404\b/.test(error.message)) return notFound;
    throw error;
  }
  if (!data || data.error) return notFound;

  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
