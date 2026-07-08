// AdminInsertImage pure helper unit tests
// Run with: node --test admin/tests/admin-insert-image.test.js
// Tests: buildShortcode and insertAtCursor — no DOM.

const test = require('node:test');
const assert = require('node:assert');

// Replicate the pure helpers from admin-insert-image.js

function buildShortcode(imagePath, caption) {
  var safeCaption = caption || "";
  safeCaption = safeCaption.replace(/"/g, "&quot;");
  if (safeCaption) {
    return '[figure src="' + imagePath + '" caption="' + safeCaption + '"]';
  }
  return '[figure src="' + imagePath + '"]';
}

function insertAtCursor(text, insertion, selectionStart, selectionEnd) {
  var before = text.slice(0, selectionStart);
  var after = text.slice(selectionEnd);
  var newText = before + insertion + after;
  var cursorPos = (before + insertion).length;
  return { text: newText, cursorPos: cursorPos };
}

// ── buildShortcode ─────────────────────────────────────────────────────────────

test('buildShortcode: with caption', function () {
  var result = buildShortcode('/uploads/2026/01/abc.jpg', 'A manuscript');
  assert.strictEqual(result, '[figure src="/uploads/2026/01/abc.jpg" caption="A manuscript"]');
});

test('buildShortcode: without caption', function () {
  var result = buildShortcode('/uploads/2026/01/abc.jpg', '');
  assert.strictEqual(result, '[figure src="/uploads/2026/01/abc.jpg"]');
});

test('buildShortcode: null caption', function () {
  var result = buildShortcode('/uploads/abc.png', null);
  assert.strictEqual(result, '[figure src="/uploads/abc.png"]');
});

test('buildShortcode: escapes double-quotes in caption', function () {
  var result = buildShortcode('/a.jpg', 'He said "hello"');
  assert.strictEqual(result, '[figure src="/a.jpg" caption="He said &quot;hello&quot;"]');
});

test('buildShortcode: empty imagePath', function () {
  var result = buildShortcode('', 'test');
  assert.strictEqual(result, '[figure src="" caption="test"]');
});

// ── insertAtCursor ─────────────────────────────────────────────────────────────

test('insertAtCursor: middle of text', function () {
  var result = insertAtCursor('Hello world', ' beautiful', 5, 5);
  assert.deepStrictEqual(result, {
    text: 'Hello beautiful world',
    cursorPos: 15,
  });
});

test('insertAtCursor: start of text', function () {
  var result = insertAtCursor('world', 'Hello ', 0, 0);
  assert.deepStrictEqual(result, {
    text: 'Hello world',
    cursorPos: 6,
  });
});

test('insertAtCursor: end of text', function () {
  var result = insertAtCursor('Hello', ' world', 5, 5);
  assert.deepStrictEqual(result, {
    text: 'Hello world',
    cursorPos: 11,
  });
});

test('insertAtCursor: replaces selection', function () {
  var result = insertAtCursor('Hello old world', 'brave new ', 6, 10);
  assert.deepStrictEqual(result, {
    text: 'Hello brave new world',
    cursorPos: 16,
  });
});

test('insertAtCursor: empty text', function () {
  var result = insertAtCursor('', 'hello', 0, 0);
  assert.deepStrictEqual(result, {
    text: 'hello',
    cursorPos: 5,
  });
});

test('insertAtCursor: empty insertion', function () {
  var result = insertAtCursor('hello', '', 2, 3);
  assert.deepStrictEqual(result, {
    text: 'helo',
    cursorPos: 2,
  });
});
