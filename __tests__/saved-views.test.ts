import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeQuery, normalizeLayout, orderColumns, parseSavedViewInput } from '../lib/services/saved-views';

describe('sanitizeQuery', () => {
  test('keeps known filters, drops paging, the open panel and unknown keys, and sorts', () => {
    const q = sanitizeQuery('?page=3&dock=task%3Aabc&status=blocked&evil=1&assigned=u1&q=%20gst%20');
    assert.equal(q, 'assigned=u1&q=gst&status=blocked');
  });
  test('drops empty values and caps long ones', () => {
    assert.equal(sanitizeQuery('client=&priority=high'), 'priority=high');
    assert.equal(sanitizeQuery('q=' + 'x'.repeat(500)).length, 'q='.length + 200);
  });
  test('the same filters in any order give the same string', () => {
    assert.equal(sanitizeQuery('b=1&status=a&assigned=u'), sanitizeQuery('assigned=u&status=a'));
  });
});

describe('normalizeLayout', () => {
  test('rejects junk and keeps valid keys once', () => {
    const l = normalizeLayout({ order: ['due_date', 'due_date', 'Bad Key', 42, 'owner'], visible: { owner: false, 'x y': true, due_date: 'yes' }, density: 'compact' });
    assert.deepEqual(l.order, ['due_date', 'owner']);
    assert.deepEqual(l.visible, { owner: false });
    assert.equal(l.density, 'compact');
  });
  test('anything that is not an object gives an empty layout', () => {
    assert.deepEqual(normalizeLayout(null), { order: [], visible: {} });
    assert.deepEqual(normalizeLayout('x'), { order: [], visible: {} });
  });
  test('at most 30 columns', () => {
    const order = Array.from({ length: 50 }, (_, i) => `c${i}`);
    assert.equal(normalizeLayout({ order }).order.length, 30);
  });
});

describe('orderColumns', () => {
  const cols = ['select', 'sub_service', 'client', 'due_date', 'status', 'owner', 'actions'].map((key) => ({ key }));
  test('applies the saved order and keeps pinned columns at the ends', () => {
    const out = orderColumns(cols, ['owner', 'status', 'actions', 'select', 'sub_service']).map((c) => c.key);
    assert.deepEqual(out, ['select', 'owner', 'status', 'sub_service', 'client', 'due_date', 'actions']);
  });
  test('ignores unknown saved keys and keeps columns the layout does not mention', () => {
    const out = orderColumns(cols, ['nope', 'due_date']).map((c) => c.key);
    assert.deepEqual(out, ['select', 'due_date', 'sub_service', 'client', 'status', 'owner', 'actions']);
  });
  test('an empty order leaves the page default', () => {
    assert.deepEqual(orderColumns(cols, []).map((c) => c.key), cols.map((c) => c.key));
  });
});

describe('parseSavedViewInput', () => {
  test('accepts a clean view', () => {
    const r = parseSavedViewInput({ scope: 'tasks', name: '  Overdue   mine ', query: 'assigned=u1&page=2', layout: { order: ['owner'] }, is_shared: true });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, 'Overdue mine');
      assert.equal(r.value.query, 'assigned=u1');
      assert.equal(r.value.is_shared, true);
    }
  });
  test('rejects an unknown scope, an empty name and a long name', () => {
    assert.equal(parseSavedViewInput({ scope: 'clients', name: 'x' }).ok, false);
    assert.equal(parseSavedViewInput({ scope: 'tasks', name: '   ' }).ok, false);
    assert.equal(parseSavedViewInput({ scope: 'tasks', name: 'x'.repeat(61) }).ok, false);
  });
  test('sharing is off unless it is exactly true', () => {
    const r = parseSavedViewInput({ scope: 'tasks', name: 'a', is_shared: 'true' });
    assert.equal(r.ok && r.value.is_shared, false);
  });
});
