// Spawns api/server.js as a child process to verify the dev-bypass gate
// (env-boot-guard plan): ADMIN_DEV_BYPASS=1 combined with NODE_ENV=production
// must refuse to mount the dev-bypass route and exit(1), regardless of the
// flag. Run out-of-process because the gate calls process.exit(1), which
// would otherwise kill the test runner itself.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const SERVER_PATH = path.join(__dirname, "..", "server.js");

test("server exits fatally when ADMIN_DEV_BYPASS=1 with NODE_ENV=production", () => {
  const result = spawnSync(process.execPath, [SERVER_PATH], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      ADMIN_DEV_BYPASS: "1",
      RP_ID: "test.example.com",
      ORIGIN: "https://test.example.com",
      PORT: "0",
    },
    timeout: 5000,
    encoding: "utf8",
  });

  assert.notStrictEqual(
    result.status,
    0,
    "server should not exit cleanly with dev-bypass armed in production",
  );
  assert.match(result.stderr, /ADMIN_DEV_BYPASS=1 is set with NODE_ENV=production/);
});
