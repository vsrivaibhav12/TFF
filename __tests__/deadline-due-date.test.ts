import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeadlineDueDate } from '../lib/services/deadline-due-date';
import { makeMonthly, makeQuarterly, makeYearly, makeHalfYearly } from '../lib/periods';
import { generateEventsForRule, type CalendarRule } from '../lib/services/compliance-calendar-engine';

const rule = (over: Partial<CalendarRule>): CalendarRule => ({
  id: 'r1', rule_code: 'GSTR1', display_name: 'GSTR-1', service_kind: 'gst', periodicity: 'monthly',
  due_day: 11, due_month_offset: 1, due_date_formula: null, applies_when: {}, reminder_days: [7, 3, 1], is_active: true,
  ...over,
});

describe('resolveDeadlineDueDate', () => {
  test('monthly rule: GSTR-1 for October is due on 11 November', () => {
    const r = resolveDeadlineDueDate({ period: makeMonthly(2026, 10), rules: [rule({})] });
    assert.deepEqual(r, { dueDate: '2026-11-11', source: 'rule' });
  });

  test('quarterly rule: Jul-Sep quarter is due the month after the quarter ends', () => {
    const r = resolveDeadlineDueDate({ period: makeQuarterly(2026, 2), rules: [rule({ periodicity: 'quarterly', due_day: 31, due_month_offset: 1 })] });
    assert.deepEqual(r, { dueDate: '2026-10-31', source: 'rule' });
  });

  test('half-yearly and yearly rules resolve to a date', () => {
    const h = resolveDeadlineDueDate({ period: makeHalfYearly(2026, 1), rules: [rule({ periodicity: 'half_yearly', due_day: 30, due_month_offset: 1 })] });
    assert.equal(h.source, 'rule');
    const y = resolveDeadlineDueDate({ period: makeYearly(2025), rules: [rule({ periodicity: 'yearly', due_day: 30, due_month_offset: 12 })] });
    assert.equal(y.source, 'rule');
  });

  test('a rule predicate never hides the deadline itself', () => {
    const r = resolveDeadlineDueDate({ period: makeMonthly(2026, 10), rules: [rule({ applies_when: { is_tds_deductor: true } })] });
    assert.equal(r.dueDate, '2026-11-11');
  });

  test('an override wins over the rule', () => {
    const r = resolveDeadlineDueDate({ period: makeMonthly(2026, 10), rules: [rule({})], override: '2026-11-18' });
    assert.deepEqual(r, { dueDate: '2026-11-18', source: 'override' });
  });

  const svc = (over = {}) => ({ id: 's1', code: 'GST', name: 'GST', frequency: 'monthly', due_day_of_month: 20, due_day_of_quarter: null, due_month: null, ...over });

  test('without a rule the sub-service due day is used, in the month after the period', () => {
    assert.deepEqual(resolveDeadlineDueDate({ period: makeMonthly(2026, 10), subService: svc() }), { dueDate: '2026-11-20', source: 'sub_service' });
    assert.deepEqual(resolveDeadlineDueDate({ period: makeMonthly(2026, 12), subService: svc() }), { dueDate: '2027-01-20', source: 'sub_service' });
  });

  test('sub-service due day is capped to the last day of the month', () => {
    assert.equal(resolveDeadlineDueDate({ period: makeMonthly(2027, 1), subService: svc({ due_day_of_month: 31 }) }).dueDate, '2027-02-28');
  });

  test('sub-service quarterly and yearly deadlines fall after the period ends', () => {
    assert.equal(resolveDeadlineDueDate({ period: makeQuarterly(2026, 2), subService: svc({ frequency: 'quarterly', due_day_of_month: 31 }) }).dueDate, '2026-10-31');
    // FY 2025-26 ends in March 2026; its return is due in July 2026, not July 2025.
    assert.equal(resolveDeadlineDueDate({ period: makeYearly(2025), subService: svc({ frequency: 'annually', due_month: 7, due_day_of_month: 31 }) }).dueDate, '2026-07-31');
  });

  test('a sub-service with no due day has no date', () => {
    assert.equal(resolveDeadlineDueDate({ period: makeMonthly(2026, 10), subService: svc({ due_day_of_month: null }) }).dueDate, null);
  });

  test('with several linked rules the one matching the period kind is used', () => {
    const monthly = rule({ rule_code: 'M', periodicity: 'monthly', due_day: 20, due_month_offset: 1 });
    const quarterly = rule({ rule_code: 'Q', periodicity: 'quarterly', due_day: 22, due_month_offset: 1 });
    assert.equal(resolveDeadlineDueDate({ period: makeMonthly(2026, 10), rules: [monthly, quarterly] }).dueDate, '2026-11-20');
    assert.equal(resolveDeadlineDueDate({ period: makeQuarterly(2026, 2), rules: [monthly, quarterly] }).dueDate, '2026-10-22');
  });

  test('a rule of a different periodicity falls back to the sub-service, then to none', () => {
    const quarterlyOnly = rule({ periodicity: 'quarterly' });
    assert.equal(resolveDeadlineDueDate({ period: makeMonthly(2026, 10), rules: [quarterlyOnly] }).source, 'none');
  });

  test('nothing configured gives no date', () => {
    assert.deepEqual(resolveDeadlineDueDate({ period: makeMonthly(2026, 10) }), { dueDate: null, source: 'none' });
  });

  test('rules with an AGM formula have no fixed deadline', () => {
    const r = resolveDeadlineDueDate({ period: makeYearly(2025), rules: [rule({ periodicity: 'yearly', due_date_formula: 'agm_date+30d' })] });
    assert.equal(r.source, 'none');
  });
});

describe('calendar events carry canonical period keys', () => {
  const profile = {
    client_id: 'c1', is_audit_applicable: false, is_tds_deductor: false, is_tcs_collector: false,
    is_advance_tax_applicable: false, is_pf_applicable: false, is_esi_applicable: false, is_pt_applicable: false,
    is_roc_applicable: false, is_transfer_pricing: false, fy_start_month: 4,
  };
  test('monthly events: the window starts at the first period month and keeps events due inside it', () => {
    const ev = generateEventsForRule(rule({}), profile, '2026-11-01', '2026-12-31');
    assert.deepEqual(ev.map((e) => [e.period_label, e.period_key]), [['Nov 2026', '2026-11']]);
  });
  test('quarterly events use the fiscal quarter', () => {
    const ev = generateEventsForRule(rule({ periodicity: 'quarterly', due_day: 31 }), profile, '2026-10-01', '2026-10-31');
    assert.deepEqual(ev.map((e) => e.period_key), ['FY2026-27-Q2']);
  });
});
