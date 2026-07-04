// AdminRanking.computeSortOrders unit tests
// Run with: node --test admin/tests/admin-ranking.test.js
// Tests the pure reorder helper from admin-ranking.js

const test = require('node:test');
const assert = require('node:assert');

// Replicate the pure function from admin-ranking.js
function computeSortOrders(items, fromIndex, toIndex) {
  const len = items.length;
  if (len < 2 || fromIndex === toIndex) {
    return items.map(function (item, i) { return { id: item.id, sort_order: i }; });
  }

  const clampedFrom = Math.max(0, Math.min(fromIndex, len - 1));
  const clampedTo = Math.max(0, Math.min(toIndex, len - 1));
  if (clampedFrom === clampedTo) {
    return items.map(function (item, i) { return { id: item.id, sort_order: i }; });
  }

  const reordered = items.slice();
  const moved = reordered.splice(clampedFrom, 1)[0];
  reordered.splice(clampedTo, 0, moved);

  return reordered.map(function (item, i) { return { id: item.id, sort_order: i }; });
}

test('reorder: move first to last', function () {
  const items = [{id:1},{id:2},{id:3},{id:4}];
  const result = computeSortOrders(items, 0, 3);
  assert.deepStrictEqual(result, [
    {id:2, sort_order:0},
    {id:3, sort_order:1},
    {id:4, sort_order:2},
    {id:1, sort_order:3}
  ]);
});

test('reorder: move last to first', function () {
  const items = [{id:1},{id:2},{id:3},{id:4}];
  const result = computeSortOrders(items, 3, 0);
  assert.deepStrictEqual(result, [
    {id:4, sort_order:0},
    {id:1, sort_order:1},
    {id:2, sort_order:2},
    {id:3, sort_order:3}
  ]);
});

test('reorder: move up by one', function () {
  const items = [{id:1},{id:2},{id:3}];
  const result = computeSortOrders(items, 2, 1);
  assert.deepStrictEqual(result, [
    {id:1, sort_order:0},
    {id:3, sort_order:1},
    {id:2, sort_order:2}
  ]);
});

test('reorder: move down by one', function () {
  const items = [{id:1},{id:2},{id:3}];
  const result = computeSortOrders(items, 0, 1);
  assert.deepStrictEqual(result, [
    {id:2, sort_order:0},
    {id:1, sort_order:1},
    {id:3, sort_order:2}
  ]);
});

test('reorder: same index — no change', function () {
  const items = [{id:1},{id:2},{id:3}];
  const result = computeSortOrders(items, 1, 1);
  assert.deepStrictEqual(result, [
    {id:1, sort_order:0},
    {id:2, sort_order:1},
    {id:3, sort_order:2}
  ]);
});

test('reorder: boundary — from below 0 clamps', function () {
  const items = [{id:1},{id:2},{id:3}];
  const result = computeSortOrders(items, -1, 2);
  assert.deepStrictEqual(result, [
    {id:2, sort_order:0},
    {id:3, sort_order:1},
    {id:1, sort_order:2}
  ]);
});

test('reorder: boundary — to above length clamps', function () {
  const items = [{id:1},{id:2},{id:3}];
  const result = computeSortOrders(items, 2, 99);
  assert.deepStrictEqual(result, [
    {id:1, sort_order:0},
    {id:2, sort_order:1},
    {id:3, sort_order:2}
  ]);
});

test('reorder: stable sequence — all ids present', function () {
  const items = [{id:10},{id:20},{id:30},{id:40},{id:50}];
  const result = computeSortOrders(items, 1, 3);
  const ids = result.map(function (r) { return r.id; });
  assert.deepStrictEqual(ids, [10, 30, 40, 20, 50]);
  result.forEach(function (r, i) { assert.strictEqual(r.sort_order, i); });
});

test('reorder: single item array', function () {
  const items = [{id:1}];
  const result = computeSortOrders(items, 0, 0);
  assert.deepStrictEqual(result, [{id:1, sort_order:0}]);
});

test('reorder: empty array', function () {
  const result = computeSortOrders([], 0, 0);
  assert.deepStrictEqual(result, []);
});
