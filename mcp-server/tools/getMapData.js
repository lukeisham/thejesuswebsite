/**
 * MCP tool: getMapData
 *
 * Returns a single map and its associated pins by the map's unique key.
 *
 * @param {string} mapKey - The unique map key (required, non-empty).
 */
export const name = 'getMapData';

export const description =
  'Fetch a map and its pins by the unique map key. Returns the map metadata and all associated pin locations.';

export const inputSchema = {
  type: 'object',
  properties: {
    mapKey: {
      type: 'string',
      description: 'The unique map key (e.g. "roman-empire", "galilee", "jerusalem").',
      maxLength: 200,
    },
  },
  required: ['mapKey'],
};

/**
 * Validate the map key, request the maps endpoint, and return the result.
 *
 * @param {object}   args       - Must contain a non-empty `mapKey` string.
 * @param {Function} apiRequest - Shared fetch helper (injected for testability).
 * @returns {Promise<object>} MCP tool result.
 */
export async function handler(args, apiRequest) {
  const mapKey = (args.mapKey || '').trim();
  if (!mapKey) {
    return {
      content: [{ type: 'text', text: 'Error: mapKey must be a non-empty string.' }],
      isError: true,
    };
  }

  const notFound = {
    content: [{ type: 'text', text: `Map not found for key "${mapKey}".` }],
    isError: true,
  };

  let data;
  try {
    data = await apiRequest(`/maps/${encodeURIComponent(mapKey)}`);
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
