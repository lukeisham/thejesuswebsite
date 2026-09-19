// Admin news modal — structure test for the migration onto the shared modal
// component (issue #222). No DOM library is available, so this test reads the
// page source and the CSS files and checks them as text.
// Run with: node --test admin/tests/news-modal.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const cssDir = path.resolve(__dirname, "..", "assets", "css");
const html = fs.readFileSync(path.resolve(__dirname, "..", "news", "index.html"), "utf8");
const newsCss = fs.readFileSync(path.join(cssDir, "news.css"), "utf8");
const modalsCss = fs.readFileSync(path.join(cssDir, "admin-components", "modals.css"), "utf8");

test("news modal uses the shared backdrop, title and actions classes", () => {
  assert.match(html, /modalOverlay\.className = 'admin-modal-backdrop'/);
  assert.match(html, /modal\.className = 'admin-modal'/);
  assert.match(html, /modalTitle\.className = 'admin-modal__title'/);
  assert.match(html, /actions\.className = 'admin-modal__actions'/);
});

test("news page has no old modal class names or close button", () => {
  for (const old of ["admin-modal-overlay", "admin-modal-actions", "admin-modal__header", "admin-modal__close", "closeBtn"]) {
    assert.ok(!html.includes(old), "news/index.html still contains " + old);
  }
});

test("news.css defines no modal rule and keeps the landing badge", () => {
  assert.ok(!newsCss.includes(".admin-modal"), "news.css still has a .admin-modal rule");
  assert.ok(newsCss.includes(".admin-landing-badge"));
});

test("modals.css holds the form-group and checkbox-group rules", () => {
  assert.match(modalsCss, /\.admin-modal \.admin-form-group\s*\{/);
  assert.match(modalsCss, /\.admin-modal \.admin-checkbox-group\s*\{/);
  assert.match(modalsCss, /\.admin-modal \.admin-checkbox-group input\[type="checkbox"\]\s*\{/);
  assert.match(modalsCss, /\.admin-modal \.admin-checkbox-group label\s*\{/);
});

test("the modal has two dismiss paths: Cancel button and backdrop click", () => {
  assert.match(html, /cancelBtn\.addEventListener\('click', function \(\) \{ modalOverlay\.style\.display = 'none'; \}\)/);
  assert.match(html, /modalOverlay\.addEventListener\('click', function \(e\) \{\s*if \(e\.target === modalOverlay\) modalOverlay\.style\.display = 'none';/);
});
