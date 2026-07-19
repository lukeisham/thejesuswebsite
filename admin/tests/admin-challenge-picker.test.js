// Challenge admin picker-guarded payload logic — pure helper unit tests
// Run with: node --test admin/tests/admin-challenge-picker.test.js
// Tests: the challengePicker ? ... : undefined guard used by buildPayload
// in the academic-challenges/popular-challenges new/edit admin forms.

const test = require('node:test');
const assert = require('node:assert');

// Replicate the guard from buildPayload():
// challenge_picture: challengePicker ? challengePicker.getValue().image_path || undefined : undefined

function resolveChallengePicture(challengePicker) {
  return challengePicker ? challengePicker.getValue().image_path || undefined : undefined;
}

test('resolveChallengePicture: returns undefined when challengePicker is null', function () {
  var result = resolveChallengePicture(null);
  assert.strictEqual(result, undefined);
});

test('resolveChallengePicture: returns the picker image_path when present', function () {
  var mockPicker = { getValue: function () { return { image_path: '/uploads/2026/01/abc.jpg' }; } };
  var result = resolveChallengePicture(mockPicker);
  assert.strictEqual(result, '/uploads/2026/01/abc.jpg');
});

test('resolveChallengePicture: returns undefined when picker value has no image_path', function () {
  var mockPicker = { getValue: function () { return {}; } };
  var result = resolveChallengePicture(mockPicker);
  assert.strictEqual(result, undefined);
});
