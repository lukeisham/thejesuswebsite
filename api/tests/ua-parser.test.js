// ua-parser tests — uses node:test + node:assert.
// Tests isBot() and parseSearchTerms() functions.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { isBot, parseSearchTerms } = require("../services/ua-parser");

// ── isBot() ──────────────────────────────────────────────────────────────────

describe("isBot()", () => {
  test("returns true for Googlebot UA", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      ),
      true,
    );
  });

  test("returns true for Bingbot UA", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      ),
      true,
    );
  });

  test("returns true for Twitterbot UA", () => {
    assert.equal(isBot("Twitterbot/1.0"), true);
  });

  test("returns true for AhrefsBot UA", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
      ),
      true,
    );
  });

  test("returns true for SemrushBot UA", () => {
    assert.equal(isBot("SemrushBot/7~bl"), true);
  });

  test("returns false for Chrome desktop UA", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ),
      false,
    );
  });

  test("returns false for Safari mobile UA", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
      false,
    );
  });

  test("returns false for Firefox desktop UA", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
      ),
      false,
    );
  });

  test("returns false for null", () => {
    assert.equal(isBot(null), false);
  });

  test("returns false for undefined", () => {
    assert.equal(isBot(undefined), false);
  });

  test("returns false for empty string", () => {
    assert.equal(isBot(""), false);
  });
});

// ── parseSearchTerms() ───────────────────────────────────────────────────────

describe("parseSearchTerms()", () => {
  test("extracts query from Google referrer", () => {
    assert.equal(
      parseSearchTerms(
        "https://www.google.com/search?q=historical+jesus+evidence",
      ),
      "historical jesus evidence",
    );
  });

  test("extracts query from Google URL with extra params", () => {
    assert.equal(
      parseSearchTerms(
        "https://www.google.com/search?q=roman+crucifixion&sourceid=chrome&ie=UTF-8",
      ),
      "roman crucifixion",
    );
  });

  test("extracts query from Bing referrer", () => {
    assert.equal(
      parseSearchTerms("https://www.bing.com/search?q=jesus+of+nazareth"),
      "jesus of nazareth",
    );
  });

  test("extracts query from DuckDuckGo referrer", () => {
    assert.equal(
      parseSearchTerms("https://duckduckgo.com/?q=new+testament+reliability"),
      "new testament reliability",
    );
  });

  test("extracts query from Yahoo referrer (p= param)", () => {
    assert.equal(
      parseSearchTerms("https://search.yahoo.com/search?p=evidence+for+jesus"),
      "evidence for jesus",
    );
  });

  test("extracts query from Yandex referrer (text= param)", () => {
    assert.equal(
      parseSearchTerms("https://yandex.ru/search/?text=historical+jesus"),
      "historical jesus",
    );
  });

  test("returns null for non-search referrer", () => {
    assert.equal(parseSearchTerms("https://example.com/blog/post"), null);
  });

  test("returns null for thejesuswebsite.org referrer", () => {
    assert.equal(
      parseSearchTerms("https://thejesuswebsite.org/evidence/"),
      null,
    );
  });

  test("returns null for null", () => {
    assert.equal(parseSearchTerms(null), null);
  });

  test("returns null for undefined", () => {
    assert.equal(parseSearchTerms(undefined), null);
  });

  test("returns null for empty string", () => {
    assert.equal(parseSearchTerms(""), null);
  });

  test("handles URL-encoded characters", () => {
    assert.equal(
      parseSearchTerms("https://www.google.com/search?q=J%C3%BCrgen+Moltmann"),
      "Jürgen Moltmann",
    );
  });

  test("handles plus signs as spaces", () => {
    assert.equal(
      parseSearchTerms("https://www.google.com/search?q=who+was+jesus"),
      "who was jesus",
    );
  });
});
