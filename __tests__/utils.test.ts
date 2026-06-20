import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cn, formatCurrencyINR, formatDateIST, timeAgo, buildTaskTitle, displayTaskName } from '../lib/utils';

describe('cn() — tailwind class merger', () => {
  test('merges conditional classes', () => {
    assert.equal(cn('px-2', true && 'py-1', false && 'hidden'), 'px-2 py-1');
  });
  test('deduplicates tailwind conflicts', () => {
    assert.equal(cn('p-2', 'p-4'), 'p-4');
  });
  test('handles empty inputs', () => {
    assert.equal(cn(), '');
  });
});

describe('formatCurrencyINR()', () => {
  test('formats whole rupees', () => {
    assert.equal(formatCurrencyINR(150000), '₹1,50,000');
  });
  test('returns em-dash for null/undefined/NaN', () => {
    assert.equal(formatCurrencyINR(null), '—');
    assert.equal(formatCurrencyINR(undefined), '—');
    assert.equal(formatCurrencyINR(NaN), '—');
  });
  test('compact notation', () => {
    assert.equal(formatCurrencyINR(1500000, { compact: true }), '₹15L');
  });
});

describe('formatDateIST()', () => {
  test('formats ISO date to IST', () => {
    assert.equal(formatDateIST('2024-08-15'), '15 Aug 2024');
  });
  test('returns em-dash for null/undefined', () => {
    assert.equal(formatDateIST(null), '—');
    assert.equal(formatDateIST(undefined), '—');
  });
  test('accepts Date object', () => {
    assert.equal(formatDateIST(new Date('2024-01-26')), '26 Jan 2024');
  });
});

describe('timeAgo()', () => {
  test('just now for < 60s', () => {
    const now = new Date();
    assert.equal(timeAgo(now), 'just now');
  });
  test('minutes ago', () => {
    const d = new Date(Date.now() - 5 * 60_000);
    assert.equal(timeAgo(d), '5m ago');
  });
  test('hours ago', () => {
    const d = new Date(Date.now() - 3 * 3_600_000);
    assert.equal(timeAgo(d), '3h ago');
  });
  test('days ago', () => {
    const d = new Date(Date.now() - 2 * 86_400_000);
    assert.equal(timeAgo(d), '2d ago');
  });
  test('weeks ago', () => {
    const d = new Date(Date.now() - 14 * 86_400_000);
    assert.equal(timeAgo(d), '2w ago');
  });
  test('months ago', () => {
    const d = new Date(Date.now() - 60 * 86_400_000);
    assert.equal(timeAgo(d), '2mo ago');
  });
  test('years ago', () => {
    const d = new Date(Date.now() - 730 * 86_400_000);
    assert.equal(timeAgo(d), '2y ago');
  });
  test('returns em-dash for null/undefined', () => {
    assert.equal(timeAgo(null), '—');
    assert.equal(timeAgo(undefined), '—');
  });
});


describe('displayTaskName()', () => {
  test('returns sub-service name when available', () => {
    assert.equal(displayTaskName({ title: 'GSTR-1 — Acme — 07/2025', sub_services: { name: 'GSTR-1' } }), 'GSTR-1');
  });
  test('falls back to title prefix when sub_service missing', () => {
    assert.equal(displayTaskName({ title: 'GSTR-3B — Acme — 07/2025' }), 'GSTR-3B');
  });
  test('handles title without separator', () => {
    assert.equal(displayTaskName({ title: 'Adhoc task' }), 'Adhoc task');
  });
  test('returns untitled for null/undefined task', () => {
    assert.equal(displayTaskName(null), 'Untitled task');
    assert.equal(displayTaskName(undefined), 'Untitled task');
  });
  test('returns untitled when title missing', () => {
    assert.equal(displayTaskName({}), 'Untitled task');
  });
});

describe('buildTaskTitle()', () => {
  test('builds title with sub-service and client', () => {
    assert.equal(buildTaskTitle({ subServiceName: 'GSTR-1', clientName: 'Acme Corp' }), 'GSTR-1 — Acme Corp');
  });
  test('appends month/year period', () => {
    assert.equal(buildTaskTitle({ subServiceName: 'GSTR-1', clientName: 'Acme', periodYear: 2025, periodMonth: 7 }), 'GSTR-1 — Acme — 7/2025');
  });
  test('appends quarter period', () => {
    assert.equal(buildTaskTitle({ subServiceName: 'TDS', periodYear: 2025, periodQuarter: 2 }), 'TDS — Q2 2025');
  });
  test('works with sub-service only', () => {
    assert.equal(buildTaskTitle({ subServiceName: 'ITR' }), 'ITR');
  });
});
