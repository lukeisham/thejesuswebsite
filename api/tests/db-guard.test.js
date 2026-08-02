// Database guard tests — verifies safeQuery, safeTransaction, mapDbError,
// and sendDbError with a real in-memory SQLite database. Uses node:test +
// node:assert/strict, no mocks needed.

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  safeQuery,
  safeTransaction,
  sendDbError,
  mapDbError,
} = require('../lib/db-guard');

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a hand-crafted fake Express Response object that collects status and json() calls.
 */
function makeFakeRes() {
  const res = {
    statusCode: null,
    jsonBody: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('safeQuery', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER
      );
    `);
  });

  test('returns { ok: true, result } on successful query', () => {
    const outcome = safeQuery(db, (d) => {
      const stmt = d.prepare('INSERT INTO test_table (name, value) VALUES (?, ?)');
      return stmt.run('Test Item', 42);
    });

    assert.ok(outcome.ok);
    assert.ok(outcome.result);
    assert.equal(outcome.result.changes, 1);
  });

  test('returns { ok: false, code } when operation throws', () => {
    const outcome = safeQuery(db, (d) => {
      throw new Error('Intentional database error');
    });

    assert.equal(outcome.ok, false);
    assert.ok(outcome.code);
    assert.ok(outcome.code.startsWith('E-PERSIST-'));
  });

  test('converts a thrown operation into a failure result instead of propagating', () => {
    let outcome;
    assert.doesNotThrow(() => {
      outcome = safeQuery(db, () => {
        throw new Error('Test error');
      });
    });
    assert.equal(outcome.ok, false);
    assert.ok(outcome.code.startsWith('E-PERSIST-'));
    assert.equal(outcome.result, undefined);
  });

  test('allows reading query results', () => {
    // Insert a row first
    db.prepare('INSERT INTO test_table (name, value) VALUES (?, ?)')
      .run('Read Test', 99);

    const outcome = safeQuery(db, (d) => {
      return d.prepare('SELECT * FROM test_table WHERE name = ?').get('Read Test');
    });

    assert.ok(outcome.ok);
    assert.equal(outcome.result.name, 'Read Test');
    assert.equal(outcome.result.value, 99);
  });
});

describe('safeTransaction', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER
      );
    `);
  });

  test('returns { ok: true, result } on successful transaction', () => {
    const outcome = safeTransaction(db, (d) => {
      const stmt = d.prepare('INSERT INTO test_table (name, value) VALUES (?, ?)');
      stmt.run('Transaction 1', 10);
      stmt.run('Transaction 2', 20);
      return { inserted: 2 };
    });

    assert.ok(outcome.ok);
    assert.equal(outcome.result.inserted, 2);

    // Verify both rows were inserted
    const rows = db.prepare('SELECT COUNT(*) as count FROM test_table').get();
    assert.equal(rows.count, 2);
  });

  test('returns { ok: false, code } when transaction fails', () => {
    const outcome = safeTransaction(db, (d) => {
      throw new Error('Transaction error');
    });

    assert.equal(outcome.ok, false);
    assert.ok(outcome.code);
    assert.ok(outcome.code.startsWith('E-PERSIST-'));
  });

  test('rolls back changes when callback throws mid-way', () => {
    const outcome = safeTransaction(db, (d) => {
      const stmt = d.prepare('INSERT INTO test_table (name, value) VALUES (?, ?)');
      stmt.run('Row 1', 100);

      // Throw after first insert — the transaction should roll back.
      throw new Error('Rollback test');
    });

    assert.equal(outcome.ok, false);

    // Verify no rows were inserted (rolled back)
    const rows = db.prepare('SELECT COUNT(*) as count FROM test_table').get();
    assert.equal(rows.count, 0);
  });

  test('converts a thrown transaction into a failure result instead of propagating', () => {
    let outcome;
    assert.doesNotThrow(() => {
      outcome = safeTransaction(db, () => {
        throw new Error('Test error');
      });
    });
    assert.equal(outcome.ok, false);
    assert.ok(outcome.code.startsWith('E-PERSIST-'));
  });
});

describe('mapDbError', () => {
  test('maps SQLITE_CONSTRAINT_UNIQUE to E-PERSIST-007', () => {
    const err = new Error('UNIQUE constraint failed');
    err.code = 'SQLITE_CONSTRAINT_UNIQUE';

    const code = mapDbError(err);
    assert.equal(code, 'E-PERSIST-007');
  });

  test('maps SQLITE_CONSTRAINT_FOREIGNKEY to E-PERSIST-006', () => {
    const err = new Error('FOREIGN KEY constraint failed');
    err.code = 'SQLITE_CONSTRAINT_FOREIGNKEY';

    const code = mapDbError(err);
    assert.equal(code, 'E-PERSIST-006');
  });

  test('maps SQLITE_CONSTRAINT to E-PERSIST-003', () => {
    const err = new Error('Constraint failed');
    err.code = 'SQLITE_CONSTRAINT';

    const code = mapDbError(err);
    assert.equal(code, 'E-PERSIST-003');
  });

  test('maps SQLITE_CANTOPEN to E-PERSIST-001', () => {
    const err = new Error('Cannot open database');
    err.code = 'SQLITE_CANTOPEN';

    const code = mapDbError(err);
    assert.equal(code, 'E-PERSIST-001');
  });

  test('maps "no such table" in message to E-PERSIST-025', () => {
    const err = new Error('no such table: test_table');
    err.code = 'SQLITE_ERROR';

    const code = mapDbError(err);
    assert.equal(code, 'E-PERSIST-025');
  });

  test('handles error without code or message properties', () => {
    const err = new Error();
    delete err.code;
    delete err.message;

    const code = mapDbError(err);
    // Should fall back to generic persistence error
    assert.ok(code.startsWith('E-PERSIST-'));
  });

  test('detects real SQLITE_CONSTRAINT_UNIQUE violation', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE unique_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL
      );
    `);

    // Insert first row
    db.prepare('INSERT INTO unique_test (email) VALUES (?)').run('test@example.com');

    // Try to insert duplicate
    let thrownError = null;
    try {
      db.prepare('INSERT INTO unique_test (email) VALUES (?)').run('test@example.com');
    } catch (err) {
      thrownError = err;
    }

    assert.ok(thrownError);
    const code = mapDbError(thrownError);
    assert.equal(code, 'E-PERSIST-007');
  });
});

describe('sendDbError', () => {
  test('sets response status and body from error code', () => {
    const res = makeFakeRes();

    // E-PERSIST-007 is UNIQUE constraint — should be 409 Conflict
    sendDbError(res, 'E-PERSIST-007');

    assert.ok(res.statusCode);
    assert.ok(res.jsonBody);
    assert.ok(res.jsonBody.error);
    // The error field is a string message, not an object
    assert.equal(typeof res.jsonBody.error, 'string');
  });

  test('produces valid error body with message', () => {
    const res = makeFakeRes();

    sendDbError(res, 'E-PERSIST-002');

    assert.ok(res.jsonBody.error);
    // error is a string message per responseBody() implementation
    assert.ok(typeof res.jsonBody.error === 'string');
  });

  test('handles all common E-PERSIST codes', () => {
    const codes = [
      'E-PERSIST-001', // Database unavailable
      'E-PERSIST-002', // Generic query failure
      'E-PERSIST-003', // Constraint violation
      'E-PERSIST-006', // Foreign key violation
      'E-PERSIST-007', // Unique constraint violation
    ];

    codes.forEach((code) => {
      const res = makeFakeRes();
      sendDbError(res, code);

      assert.ok(res.statusCode, `Missing status for ${code}`);
      assert.ok(res.jsonBody.error, `Missing error body for ${code}`);
      assert.equal(typeof res.jsonBody.error, 'string', `error should be string for ${code}`);
    });
  });
});

describe('Integration: safeQuery + mapDbError', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE unique_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL
      );
    `);
  });

  test('safeQuery returns mapped error code for real UNIQUE violation', () => {
    // Insert a row
    db.prepare('INSERT INTO unique_test (email) VALUES (?)').run('user@example.com');

    // Try to insert duplicate with safeQuery
    const outcome = safeQuery(db, (d) => {
      return d.prepare('INSERT INTO unique_test (email) VALUES (?)').run('user@example.com');
    });

    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, 'E-PERSIST-007');
  });
});
