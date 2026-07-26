// Resources API tests — model + route layer, using node:test + node:assert.
// Covers the holding-pen flag (in_holding_pen), the admin read routes this
// plan adds (GET /resources/admin, GET /resources/admin/holding-pen), and
// list_key validation on create()/update().

process.env.DB_PATH = ":memory:";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "database",
  "schema.sql",
);

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

const resourceModel = require("../models/resource.model");
const requireAuth = require("../middleware/auth");
const { createSession } = requireAuth;

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedResource(overrides = {}) {
  return resourceModel.create({
    list_key: overrides.list_key || "ot-verses",
    resource_title: overrides.resource_title || "Test Resource",
    resource_url: overrides.resource_url,
    resource_description: overrides.resource_description || "A test resource.",
    sort_order: overrides.sort_order ?? 0,
    published_draft: overrides.published_draft ?? 1,
    in_holding_pen: overrides.in_holding_pen ?? 0,
    item_type: overrides.item_type || "item",
  });
}

/** Make an HTTP request against a mounted Express app, resolve { status, body }. */
function makeRequest(app, method, reqPath, { cookie, body } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: "localhost",
        port,
        path: reqPath,
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (cookie) options.headers.Cookie = cookie;

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          server.close();
          try {
            resolve({
              status: res.statusCode,
              body: data ? JSON.parse(data) : null,
            });
          } catch (_e) {
            resolve({ status: res.statusCode, body: data || null });
          }
        });
      });
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

function authCookie() {
  const token = createSession("admin");
  return `sid=${token}`;
}

function clearResources() {
  db.exec("DELETE FROM resources");
}

// ── Model: holding pen ─────────────────────────────────────────────────────────

describe("resource model: holding pen", () => {
  beforeEach(clearResources);

  test("getByListKeyAdmin excludes parked items", () => {
    seedResource({ resource_title: "Filed", list_key: "ot-verses" });
    seedResource({
      resource_title: "Parked",
      list_key: "ot-verses",
      in_holding_pen: 1,
    });

    const items = resourceModel.getByListKeyAdmin("ot-verses");
    const titles = items.map((r) => r.resource_title);
    assert.ok(titles.includes("Filed"));
    assert.ok(!titles.includes("Parked"));
  });

  test("getByListKey (public) excludes parked items", () => {
    seedResource({
      resource_title: "Public Filed",
      list_key: "ot-verses",
      published_draft: 1,
    });
    seedResource({
      resource_title: "Public Parked",
      list_key: "ot-verses",
      published_draft: 1,
      in_holding_pen: 1,
    });

    const items = resourceModel.getByListKey("ot-verses");
    const titles = items.map((r) => r.resource_title);
    assert.ok(titles.includes("Public Filed"));
    assert.ok(!titles.includes("Public Parked"));
  });

  test("getHoldingPen returns items from every list, ordered by title", () => {
    seedResource({
      resource_title: "Zebra",
      list_key: "objects",
      in_holding_pen: 1,
    });
    seedResource({
      resource_title: "Apple",
      list_key: "people",
      in_holding_pen: 1,
    });
    seedResource({ resource_title: "Not Parked", list_key: "objects" });

    const pen = resourceModel.getHoldingPen();
    assert.equal(pen.length, 2);
    assert.equal(pen[0].resource_title, "Apple");
    assert.equal(pen[1].resource_title, "Zebra");
    assert.equal(pen[1].list_key, "objects");
  });

  test("parking then filing moves an item between the pen and its list", () => {
    const item = seedResource({ resource_title: "Movable", list_key: "sites" });

    const parked = resourceModel.update(item.id, { in_holding_pen: 1 });
    assert.equal(parked.in_holding_pen, 1);
    assert.equal(parked.list_key, "sites"); // list_key preserved while parked
    assert.equal(resourceModel.getByListKeyAdmin("sites").length, 0);
    assert.equal(resourceModel.getHoldingPen().length, 1);

    const filed = resourceModel.update(item.id, {
      list_key: "sites",
      in_holding_pen: 0,
    });
    assert.equal(filed.in_holding_pen, 0);
    assert.equal(resourceModel.getByListKeyAdmin("sites").length, 1);
    assert.equal(resourceModel.getHoldingPen().length, 0);
  });

  test("update() rejects an invalid list_key", () => {
    const item = seedResource({ list_key: "sites" });
    assert.throws(
      () => resourceModel.update(item.id, { list_key: "not-a-real-list" }),
      (err) => err.code === "E-INPUT-035",
    );
  });

  test("getAllPublishedByListKey excludes parked items from the count", () => {
    seedResource({ resource_title: "A", list_key: "sources", published_draft: 1 });
    seedResource({
      resource_title: "B",
      list_key: "sources",
      published_draft: 1,
      in_holding_pen: 1,
    });

    const grouped = resourceModel.getAllPublishedByListKey();
    const row = grouped.find((g) => g.list_key === "sources");
    assert.equal(row.count, 1);
  });

  test("create() rejects an invalid list_key", () => {
    assert.throws(
      () =>
        resourceModel.create({
          list_key: "not-a-real-list",
          resource_title: "Bad",
        }),
      (err) => err.code === "E-INPUT-035",
    );
  });
});

// ── Model: subheadings ─────────────────────────────────────────────────────────

describe("resource model: subheadings", () => {
  beforeEach(clearResources);

  test("update() rejects an invalid item_type", () => {
    const item = seedResource({ list_key: "sites" });
    assert.throws(
      () => resourceModel.update(item.id, { item_type: "not-a-real-type" }),
      (err) => err.code === "E-INPUT-036",
    );
  });

  test("create() rejects an invalid item_type", () => {
    assert.throws(
      () =>
        resourceModel.create({
          list_key: "sites",
          resource_title: "Bad",
          item_type: "not-a-real-type",
        }),
      (err) => err.code === "E-INPUT-036",
    );
  });

  test("a subheading appears in the admin list", () => {
    seedResource({ resource_title: "Section A", list_key: "sites", item_type: "subheading" });
    seedResource({ resource_title: "Item under it", list_key: "sites" });

    const items = resourceModel.getByListKeyAdmin("sites");
    const types = items.map((r) => r.item_type);
    assert.ok(types.includes("subheading"));
    assert.ok(types.includes("item"));
  });

  test("a subheading is excluded from the public list count", () => {
    seedResource({
      resource_title: "Section A",
      list_key: "sites",
      item_type: "subheading",
      published_draft: 1,
    });
    seedResource({ resource_title: "Item under it", list_key: "sites", published_draft: 1 });

    const grouped = resourceModel.getAllPublishedByListKey();
    const row = grouped.find((g) => g.list_key === "sites");
    assert.equal(row.count, 1);
  });
});

// ── Routes: admin read endpoints ────────────────────────────────────────────────

describe("resources routes: admin read endpoints", () => {
  let app;
  beforeEach(() => {
    clearResources();
    app = express();
    app.use(express.json());
    app.use("/resources", require("../routes/resources"));
  });

  test("GET /resources/admin?list_key=… returns 401 without a session", async () => {
    const res = await makeRequest(app, "GET", "/resources/admin?list_key=ot-verses");
    assert.equal(res.status, 401);
  });

  test("GET /resources/admin/holding-pen returns 401 without a session", async () => {
    const res = await makeRequest(app, "GET", "/resources/admin/holding-pen");
    assert.equal(res.status, 401);
  });

  test("GET /resources/admin?list_key=… excludes parked items when authed", async () => {
    seedResource({ resource_title: "Filed", list_key: "ot-verses" });
    seedResource({
      resource_title: "Parked",
      list_key: "ot-verses",
      in_holding_pen: 1,
    });

    const res = await makeRequest(app, "GET", "/resources/admin?list_key=ot-verses", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 200);
    const titles = res.body.map((r) => r.resource_title);
    assert.ok(titles.includes("Filed"));
    assert.ok(!titles.includes("Parked"));
  });

  test("GET /resources/admin/holding-pen returns parked items when authed", async () => {
    seedResource({
      resource_title: "Parked Item",
      list_key: "miracles",
      in_holding_pen: 1,
    });

    const res = await makeRequest(app, "GET", "/resources/admin/holding-pen", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].resource_title, "Parked Item");
    assert.equal(res.body[0].list_key, "miracles");
  });

  test("GET /resources/admin without list_key returns 400", async () => {
    const res = await makeRequest(app, "GET", "/resources/admin", {
      cookie: authCookie(),
    });
    assert.equal(res.status, 400);
  });

  test("PUT /resources/:id rejects an invalid list_key with 400", async () => {
    const item = seedResource({ list_key: "sites" });
    const res = await makeRequest(app, "PUT", `/resources/${item.id}`, {
      cookie: authCookie(),
      body: { list_key: "not-a-real-list" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test("PUT /resources/:id rejects an invalid item_type with 400", async () => {
    const item = seedResource({ list_key: "sites" });
    const res = await makeRequest(app, "PUT", `/resources/${item.id}`, {
      cookie: authCookie(),
      body: { item_type: "not-a-real-type" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});
