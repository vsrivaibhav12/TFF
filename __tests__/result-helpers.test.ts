import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ok, fail, ServiceError } from '../lib/actions/result';

describe('ok()', () => {
  test('returns success shape with data', () => {
    const r = ok(42);
    assert.equal(r.success, true);
    assert.equal(r.data, 42);
  });
  test('works with void', () => {
    const r = ok(undefined);
    assert.equal(r.success, true);
    assert.equal(r.data, undefined);
  });
  test('works with objects', () => {
    const r = ok({ id: 'x' });
    assert.equal(r.success, true);
    assert.deepEqual(r.data, { id: 'x' });
  });
});

describe('fail()', () => {
  test('returns failure shape with default code', () => {
    const r = fail('something went wrong');
    assert.equal(r.success, false);
    assert.equal(r.error, 'something went wrong');
    assert.equal(r.code, 'SERVICE_ERROR');
  });
  test('accepts custom code', () => {
    const r = fail('not found', 'NOT_FOUND');
    assert.equal(r.success, false);
    assert.equal(r.error, 'not found');
    assert.equal(r.code, 'NOT_FOUND');
  });
});

describe('ServiceError', () => {
  test('carries message and code', () => {
    const err = new ServiceError('bad input', 'VALIDATION');
    assert.equal(err.message, 'bad input');
    assert.equal(err.code, 'VALIDATION');
  });
  test('defaults code to SERVICE_ERROR', () => {
    const err = new ServiceError('oops');
    assert.equal(err.code, 'SERVICE_ERROR');
  });
  test('is instanceof Error', () => {
    const err = new ServiceError('test');
    assert.ok(err instanceof Error);
  });
});
