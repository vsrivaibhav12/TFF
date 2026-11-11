import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { diffFields } from '../lib/services/field-diff';

describe('diffFields', () => {
  test('returns only changed keys', () => {
    const d = diffFields({ a: 1, b: 2 }, { a: 1, b: 3 }, ['a', 'b']);
    assert.deepEqual(d, { b: { from: 2, to: 3 } });
  });

  test('treats null, undefined and empty string as equal', () => {
    assert.deepEqual(diffFields({ a: null, b: undefined, c: '' }, { a: '', b: null, c: undefined }, ['a', 'b', 'c']), {});
  });

  test('treats 5 and "5" as different', () => {
    assert.deepEqual(diffFields({ a: 5 }, { a: '5' }, ['a']), { a: { from: 5, to: '5' } });
  });

  test('ignores keys not in the list', () => {
    assert.deepEqual(diffFields({ a: 1, b: 1 }, { a: 2, b: 2 }, ['a']), { a: { from: 1, to: 2 } });
  });

  test('reports a cleared value as a change to null', () => {
    assert.deepEqual(diffFields({ a: 'x' }, { a: '' }, ['a']), { a: { from: 'x', to: null } });
  });
});
