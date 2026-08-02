// Error handler tests — verifies consistent JSON error response formatting
// in production vs. development modes, and context nesting. Uses node:test +
// node:assert/strict with hand-built fake res objects.

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { sendError, sendValidationError } = require('../lib/error-handler');

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const originalNodeEnv = process.env.NODE_ENV;

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

afterEach(() => {
  // Restore NODE_ENV after each test
  process.env.NODE_ENV = originalNodeEnv;
});

describe('sendError', () => {
  test('includes detail in non-production environments', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-TEST-001',
      message: 'Test error message',
      detail: 'Technical detail for development',
      httpStatus: 400,
    };

    sendError(res, errorDef);

    assert.equal(res.statusCode, 400);
    assert.ok(res.jsonBody.error);
    assert.equal(res.jsonBody.error.code, 'E-TEST-001');
    assert.equal(res.jsonBody.error.message, 'Test error message');
    assert.equal(res.jsonBody.error.detail, 'Technical detail for development');
  });

  test('omits detail in production environment', () => {
    process.env.NODE_ENV = 'production';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-TEST-001',
      message: 'Test error message',
      detail: 'Technical detail should not appear',
      httpStatus: 400,
    };

    sendError(res, errorDef);

    assert.equal(res.statusCode, 400);
    assert.ok(res.jsonBody.error);
    assert.equal(res.jsonBody.error.code, 'E-TEST-001');
    assert.equal(res.jsonBody.error.message, 'Test error message');
    assert.equal(res.jsonBody.error.detail, undefined);
  });

  test('nests context object under error.context', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-TEST-002',
      message: 'Test with context',
      detail: 'Detail here',
      httpStatus: 422,
    };
    const context = {
      entity: 'evidence',
      id: 99999,
    };

    sendError(res, errorDef, context);

    assert.equal(res.statusCode, 422);
    assert.ok(res.jsonBody.error.context);
    assert.equal(res.jsonBody.error.context.entity, 'evidence');
    assert.equal(res.jsonBody.error.context.id, 99999);
  });

  test('omits context key when context is empty object', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-TEST-003',
      message: 'No context',
      detail: 'Detail',
      httpStatus: 500,
    };

    sendError(res, errorDef, {});

    assert.equal(res.statusCode, 500);
    assert.ok(res.jsonBody.error);
    assert.equal(res.jsonBody.error.context, undefined);
  });

  test('sets correct HTTP status from errorDef', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-TEST-004',
      message: 'Test',
      detail: 'Detail',
      httpStatus: 503,
    };

    sendError(res, errorDef);

    assert.equal(res.statusCode, 503);
  });

  test('returns the result of res.status().json() for chaining', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-TEST-005',
      message: 'Test',
      detail: 'Detail',
      httpStatus: 400,
    };

    const result = sendError(res, errorDef);

    // Should return the result of json(), which is the res object itself
    assert.equal(result, res);
  });
});

describe('sendValidationError', () => {
  test('puts fieldName under error.context.field', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-INPUT-001',
      message: 'Validation failed',
      detail: 'Field validation error',
      httpStatus: 400,
    };

    sendValidationError(res, 'email', errorDef);

    assert.equal(res.statusCode, 400);
    assert.ok(res.jsonBody.error.context);
    assert.equal(res.jsonBody.error.context.field, 'email');
  });

  test('merges extra context with field name', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-INPUT-001',
      message: 'Validation failed',
      detail: 'Detail',
      httpStatus: 400,
    };
    const extra = {
      received: 'invalid-email@',
      expected: 'valid email format',
    };

    sendValidationError(res, 'email', errorDef, extra);

    assert.equal(res.statusCode, 400);
    assert.ok(res.jsonBody.error.context);
    assert.equal(res.jsonBody.error.context.field, 'email');
    assert.equal(res.jsonBody.error.context.received, 'invalid-email@');
    assert.equal(res.jsonBody.error.context.expected, 'valid email format');
  });

  test('omits detail in production environment for sendValidationError too', () => {
    process.env.NODE_ENV = 'production';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-INPUT-001',
      message: 'Validation failed',
      detail: 'Should not appear in production',
      httpStatus: 400,
    };

    sendValidationError(res, 'username', errorDef);

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonBody.error.detail, undefined);
    assert.equal(res.jsonBody.error.context.field, 'username');
  });

  test('returns the result of sendError for chaining', () => {
    process.env.NODE_ENV = 'development';

    const res = makeFakeRes();
    const errorDef = {
      code: 'E-INPUT-001',
      message: 'Validation failed',
      detail: 'Detail',
      httpStatus: 400,
    };

    const result = sendValidationError(res, 'field', errorDef);

    assert.equal(result, res);
  });
});
