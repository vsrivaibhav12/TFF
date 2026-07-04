import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSearchTerm, wrapLike, mergeById } from '@/lib/supabase/safe-search';

describe('sanitizeSearchTerm()', () => {
  it('removes PostgREST structural characters', () => {
    assert.equal(sanitizeSearchTerm('a,b'), 'ab');
    assert.equal(sanitizeSearchTerm('a(b)'), 'ab');
    assert.equal(sanitizeSearchTerm('a:b'), 'ab');
    assert.equal(sanitizeSearchTerm('a.b'), 'ab');
    assert.equal(sanitizeSearchTerm('a[b]'), 'ab');
  });

  it('preserves normal text, numbers and wildcards', () => {
    assert.equal(sanitizeSearchTerm('Acme 123'), 'Acme 123');
    assert.equal(sanitizeSearchTerm('50% off'), '50% off');
    assert.equal(sanitizeSearchTerm('under_score'), 'under_score');
  });
});

describe('wrapLike()', () => {
  it('wraps sanitized term in %', () => {
    assert.equal(wrapLike('Acme'), '%Acme%');
    assert.equal(wrapLike('a,b'), '%ab%');
  });
});

describe('mergeById()', () => {
  it('deduplicates by id preserving first appearance', () => {
    const result = mergeById([
      [{ id: '1', name: 'a' }, { id: '2', name: 'b' }],
      [{ id: '2', name: 'B' }, { id: '3', name: 'c' }],
    ]);
    assert.deepEqual(result, [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: 'c' },
    ]);
  });

  it('skips rows without id', () => {
    const result = mergeById([[{ id: '1', name: 'a' }, { name: 'no-id' }]]);
    assert.deepEqual(result, [{ id: '1', name: 'a' }]);
  });
});
