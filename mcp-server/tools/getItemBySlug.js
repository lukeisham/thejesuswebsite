/**
 * MCP tool: getItemBySlug
 *
 * Retrieves a single published evidence record by its URL slug, including all
 * related data (pictures, sources, identifiers, internal links).
 *
 * @param {string} slug - The URL slug of the evidence item (required, non-empty).
 */
export const name = 'getItemBySlug';

export const description =
  'Look up a published evidence item by its URL slug. Returns the full record with related pictures, sources, and links.';

export const inputSchema = {
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      description: 'The URL slug of the evidence item (e.g. "baptism-of-jesus").',
      maxLength: 200,
    },
  },
  required: ['slug'],
};

/**
 * Validate the slug, request the evidence endpoint, and return the result.
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

  const data = await apiRequest(`/evidence/${encodeURIComponent(slug)}`);
  if (!data || data.error) {
    return {
      content: [{ type: 'text', text: `Evidence not found for slug "${slug}".` }],
      isError: true,
    };
  }

  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
