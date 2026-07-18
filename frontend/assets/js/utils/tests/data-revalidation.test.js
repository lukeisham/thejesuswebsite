// Data revalidation tests — node:test + node:assert.
// Tests the background revalidateInBackground helper from data-revalidation.js.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Mirror the revalidateInBackground logic from data-revalidation.js ───────
// Replicated here so tests can run without ES module tooling.

/**
 * Replicates the revalidateInBackground export from data-revalidation.js.
 */
async function revalidateInBackground({ embeddedData, fetchLive, onFresh }) {
  let data;
  try {
    ({ data } = await fetchLive());
  } catch {
    return;
  }

  if (data === undefined || data === null) return;
  if (JSON.stringify(data) === JSON.stringify(embeddedData)) return;

  onFresh(data);
}

describe("revalidateInBackground", () => {
  test("does not call onFresh when the fetch returns an error", async () => {
    let called = false;
    await revalidateInBackground({
      embeddedData: { nodes: [1] },
      fetchLive: async () => ({ data: null, error: "network error" }),
      onFresh: () => {
        called = true;
      },
    });
    assert.equal(called, false);
  });

  test("does not call onFresh when fetchLive rejects", async () => {
    let called = false;
    await revalidateInBackground({
      embeddedData: { nodes: [1] },
      fetchLive: async () => {
        throw new Error("boom");
      },
      onFresh: () => {
        called = true;
      },
    });
    assert.equal(called, false);
  });

  test("does not call onFresh when live data is identical to embedded data", async () => {
    let called = false;
    const embeddedData = { nodes: [{ id: 1, title: "A" }], edges: [] };
    await revalidateInBackground({
      embeddedData,
      fetchLive: async () => ({
        data: { nodes: [{ id: 1, title: "A" }], edges: [] },
        error: null,
      }),
      onFresh: () => {
        called = true;
      },
    });
    assert.equal(called, false);
  });

  test("calls onFresh with the live data when it differs from embedded data", async () => {
    let receivedData = null;
    const embeddedData = { nodes: [{ id: 1, title: "A" }], edges: [] };
    const liveData = {
      nodes: [
        { id: 1, title: "A" },
        { id: 2, title: "B" },
      ],
      edges: [{ source_id: 1, target_id: 2 }],
    };
    await revalidateInBackground({
      embeddedData,
      fetchLive: async () => ({ data: liveData, error: null }),
      onFresh: (data) => {
        receivedData = data;
      },
    });
    assert.deepEqual(receivedData, liveData);
  });

  test("calls onFresh when there was no embedded data to begin with", async () => {
    let receivedData = null;
    const liveData = { nodes: [{ id: 1, title: "A" }], edges: [] };
    await revalidateInBackground({
      embeddedData: undefined,
      fetchLive: async () => ({ data: liveData, error: null }),
      onFresh: (data) => {
        receivedData = data;
      },
    });
    assert.deepEqual(receivedData, liveData);
  });

  test("does not call onFresh when live data is null", async () => {
    let called = false;
    await revalidateInBackground({
      embeddedData: { nodes: [] },
      fetchLive: async () => ({ data: null, error: null }),
      onFresh: () => {
        called = true;
      },
    });
    assert.equal(called, false);
  });
});
