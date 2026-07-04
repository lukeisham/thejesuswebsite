/**
 * MCP tool: getTimelineEvents
 *
 * Returns timeline events from the published evidence, arranged in narrative
 * order. Optionally filters by era.
 *
 * @param {string} [era] - Optional era filter ("beginning", "middle", or "end").
 */
export const name = 'getTimelineEvents';

export const description =
  'Fetch the full narrative timeline of published evidence events. Optionally filter by era: "beginning", "middle", or "end".';

export const inputSchema = {
  type: 'object',
  properties: {
    era: {
      type: 'string',
      description: 'Optional era to filter by. One of "beginning", "middle", or "end".',
    },
  },
};

/**
 * Validate optional era, build the query string, and fetch timeline data.
 *
 * @param {object}   args       - May contain an optional `era` string.
 * @param {Function} apiRequest - Shared fetch helper (injected for testability).
 * @returns {Promise<object>} MCP tool result.
 */
export async function handler(args, apiRequest) {
  const era = (args.era || '').trim();
  const validEras = new Set(['beginning', 'middle', 'end']);

  if (era && !validEras.has(era)) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: era must be one of "beginning", "middle", or "end". Got "${era}".`,
        },
      ],
      isError: true,
    };
  }

  const path = era
    ? `/timeline?timeline_era=${encodeURIComponent(era)}`
    : '/timeline';

  const data = await apiRequest(path);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
