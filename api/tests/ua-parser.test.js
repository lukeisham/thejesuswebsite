// UA parser tests — covers the top user-agent strings by market share.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { parse } = require("../services/ua-parser");

describe("ua-parser: OS detection", () => {
  test("detects macOS + Chrome", () => {
    const result = parse(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );
    assert.equal(result.os, "macOS");
    assert.equal(result.browser, "Chrome");
    assert.equal(result.device_type, "desktop");
  });

  test("detects Windows + Chrome", () => {
    const result = parse(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );
    assert.equal(result.os, "Windows");
    assert.equal(result.browser, "Chrome");
    assert.equal(result.device_type, "desktop");
  });

  test("detects iOS + Safari", () => {
    const result = parse(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    assert.equal(result.os, "iOS");
    assert.equal(result.browser, "Safari");
    assert.equal(result.device_type, "mobile");
  });

  test("detects macOS + Safari", () => {
    const result = parse(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    );
    assert.equal(result.os, "macOS");
    assert.equal(result.browser, "Safari");
    assert.equal(result.device_type, "desktop");
  });

  test("detects Android + Chrome", () => {
    const result = parse(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36",
    );
    assert.equal(result.os, "Android");
    assert.equal(result.browser, "Chrome");
    assert.equal(result.device_type, "mobile");
  });

  test("detects Windows + Firefox", () => {
    const result = parse(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    );
    assert.equal(result.os, "Windows");
    assert.equal(result.browser, "Firefox");
    assert.equal(result.device_type, "desktop");
  });

  test("detects Windows + Edge", () => {
    const result = parse(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    );
    assert.equal(result.os, "Windows");
    assert.equal(result.browser, "Edge");
    assert.equal(result.device_type, "desktop");
  });

  test("detects iPadOS + Safari (tablet)", () => {
    const result = parse(
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    assert.equal(result.os, "iPadOS");
    assert.equal(result.browser, "Safari");
    assert.equal(result.device_type, "tablet");
  });

  test("detects Linux + Firefox", () => {
    const result = parse(
      "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    );
    assert.equal(result.os, "Linux");
    assert.equal(result.browser, "Firefox");
    assert.equal(result.device_type, "desktop");
  });

  test("detects macOS + Firefox", () => {
    const result = parse(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    );
    assert.equal(result.os, "macOS");
    assert.equal(result.browser, "Firefox");
    assert.equal(result.device_type, "desktop");
  });
});

describe("ua-parser: edge cases", () => {
  test("returns nulls for null input", () => {
    const result = parse(null);
    assert.equal(result.os, null);
    assert.equal(result.browser, null);
    assert.equal(result.device_type, null);
  });

  test("returns nulls for undefined input", () => {
    const result = parse(undefined);
    assert.equal(result.os, null);
    assert.equal(result.browser, null);
    assert.equal(result.device_type, null);
  });

  test("returns nulls for empty string", () => {
    const result = parse("");
    assert.equal(result.os, null);
    assert.equal(result.browser, null);
    assert.equal(result.device_type, null);
  });

  test("returns desktop + unknown for unrecognised UA", () => {
    const result = parse("SomeRandomBot/1.0");
    assert.equal(result.device_type, "desktop");
    assert.equal(result.browser, null);
    assert.equal(result.os, null);
  });

  test("detects Internet Explorer", () => {
    const result = parse(
      "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
    );
    assert.equal(result.browser, "Internet Explorer");
    assert.equal(result.os, "Windows");
    assert.equal(result.device_type, "desktop");
  });
});
