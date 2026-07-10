// Admin Settings page unit tests
// Run with: node --test admin/tests/settings.test.js
//
// This project's admin test suite has no DOM implementation (SR-2: no new
// dependencies, so no jsdom). Following the existing pattern in admin.test.js
// and admin-ranking.test.js, these tests replicate the *pure* logic extracted
// from admin/settings/index.html's inline script — the character-counter
// calculation and the snake_case/camelCase field-key normalisation on load
// and save. The actual DOM structure (labelled inputs, hint text, image
// preview, disabled-while-saving button, styled messages) was verified
// manually in a live browser session — see setup/TESTS/site-settings-wiring.md.

const test = require("node:test");
const assert = require("node:assert");

/* ─────────────────────────────────────────────────────────────────────────────
   Replicated pure helpers (mirror admin/settings/index.html's inline script)
   ───────────────────────────────────────────────────────────────────────────── */

function charCounterText(length) {
  return length + " / 160 characters";
}

function isOverCharLimit(length) {
  return length > 160;
}

// Mirrors the load-time normalisation: API returns snake_case og_image; the
// form's internal field id is the camelCase "ogImage".
function fieldValuesFromSettings(settings) {
  return {
    title: settings.title || "",
    description: settings.description || "",
    ogImage: settings.og_image || "",
  };
}

// Mirrors the save-time normalisation: build the snake_case payload the API
// (site-settings.model.js WRITABLE_COLUMNS) expects from the form's field values.
function payloadFromFieldValues(fieldValues) {
  return {
    title: fieldValues.title.trim(),
    description: fieldValues.description.trim(),
    og_image: fieldValues.ogImage.trim(),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Character counter
   ───────────────────────────────────────────────────────────────────────────── */

test("charCounterText: formats length as 'X / 160 characters'", function () {
  assert.strictEqual(charCounterText(0), "0 / 160 characters");
  assert.strictEqual(charCounterText(139), "139 / 160 characters");
  assert.strictEqual(charCounterText(160), "160 / 160 characters");
  assert.strictEqual(charCounterText(180), "180 / 160 characters");
});

test("isOverCharLimit: true only when length exceeds 160", function () {
  assert.strictEqual(isOverCharLimit(0), false);
  assert.strictEqual(isOverCharLimit(160), false);
  assert.strictEqual(isOverCharLimit(161), true);
  assert.strictEqual(isOverCharLimit(300), true);
});

/* ─────────────────────────────────────────────────────────────────────────────
   Field-key normalisation (load direction: snake_case -> camelCase)
   ───────────────────────────────────────────────────────────────────────────── */

test("fieldValuesFromSettings: maps og_image to the ogImage field", function () {
  const result = fieldValuesFromSettings({
    title: "My Site",
    description: "My description.",
    og_image: "https://example.com/img.jpg",
  });

  assert.deepStrictEqual(result, {
    title: "My Site",
    description: "My description.",
    ogImage: "https://example.com/img.jpg",
  });
});

test("fieldValuesFromSettings: defaults missing fields to empty strings", function () {
  const result = fieldValuesFromSettings({});
  assert.deepStrictEqual(result, { title: "", description: "", ogImage: "" });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Payload normalisation (save direction: camelCase -> snake_case)
   ───────────────────────────────────────────────────────────────────────────── */

test("payloadFromFieldValues: maps ogImage back to og_image and trims values", function () {
  const result = payloadFromFieldValues({
    title: "  My Site  ",
    description: "  My description.  ",
    ogImage: "  https://example.com/img.jpg  ",
  });

  assert.deepStrictEqual(result, {
    title: "My Site",
    description: "My description.",
    og_image: "https://example.com/img.jpg",
  });
});

test("round-trip: fieldValuesFromSettings then payloadFromFieldValues is idempotent", function () {
  const settings = {
    title: "The Jesus Website",
    description: "A comprehensive survey.",
    og_image: "https://thejesuswebsite.org/assets/images/jesus_walking_on_water.jpg",
  };

  const payload = payloadFromFieldValues(fieldValuesFromSettings(settings));
  assert.deepStrictEqual(payload, settings);
});
