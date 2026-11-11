import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reviewTaskPeriod } from '../lib/services/period-review';

const sub = (period_type: string, frequency = 'monthly') => ({ period_type, frequency });

describe('reviewTaskPeriod', () => {
  test('a keyed period of the right type is fine', () => {
    assert.equal(reviewTaskPeriod({ period_key: '2026-10' }, sub('monthly')).status, 'ok');
    assert.equal(reviewTaskPeriod({ period_key: 'FY2025-26' }, sub('yearly')).status, 'ok');
  });

  test('a keyed period of the wrong type is a mismatch', () => {
    const r = reviewTaskPeriod({ period_key: 'FY2025-26' }, sub('monthly'));
    assert.equal(r.status, 'mismatch');
    assert.match(r.reason ?? '', /monthly/);
  });

  test('a period on a service with none is a mismatch', () => {
    const r = reviewTaskPeriod({ period_year: 2026, period_month: 4 }, sub('none'));
    assert.equal(r.status, 'mismatch');
    assert.match(r.reason ?? '', /does not use a period/);
  });

  test('older monthly rows are fine without a key', () => {
    assert.equal(reviewTaskPeriod({ period_year: 2026, period_month: 10 }, sub('monthly')).status, 'ok');
  });

  test('older quarterly and yearly rows need confirmation and get a suggested key', () => {
    const q = reviewTaskPeriod({ period_year: 2026, period_quarter: 1 }, sub('quarterly'));
    assert.equal(q.status, 'confirm');
    assert.equal(q.suggestedKey, 'FY2026-27-Q1');
    const y = reviewTaskPeriod({ period_year: 2026 }, sub('yearly'));
    assert.equal(y.status, 'confirm');
    assert.equal(y.suggestedKey, 'FY2026-27');
  });

  test('a required period that is missing is a mismatch', () => {
    assert.equal(reviewTaskPeriod({}, sub('monthly')).status, 'mismatch');
  });

  test('no period on a none service is fine', () => {
    assert.equal(reviewTaskPeriod({}, sub('none')).status, 'ok');
  });

  test('gst_frequency accepts either a month or a quarter', () => {
    assert.equal(reviewTaskPeriod({ period_key: '2026-10' }, sub('gst_frequency')).status, 'ok');
    assert.equal(reviewTaskPeriod({ period_key: 'FY2026-27-Q2' }, sub('gst_frequency')).status, 'ok');
    assert.equal(reviewTaskPeriod({ period_key: 'FY2026-27' }, sub('gst_frequency')).status, 'mismatch');
  });

  test('falls back to the schedule frequency when period_type is unset', () => {
    assert.equal(reviewTaskPeriod({ period_key: 'FY2025-26' }, { frequency: 'annually' }).status, 'ok');
  });
});
