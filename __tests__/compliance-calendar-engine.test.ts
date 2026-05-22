import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateEventsForRule, type CalendarRule, type ClientProfile } from '../lib/services/compliance-calendar-engine';

function rule(overrides: Partial<CalendarRule> = {}): CalendarRule {
  return {
    id: 'r1',
    rule_code: 'TEST-001',
    display_name: 'Test Rule',
    service_kind: 'gst',
    periodicity: 'monthly',
    due_day: 20,
    due_month_offset: 0,
    due_date_formula: null,
    applies_when: {},
    reminder_days: [7, 3, 1],
    is_active: true,
    ...overrides,
  };
}

function profile(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return {
    client_id: 'c1',
    gst_filing_frequency: 'monthly',
    state_group: null,
    entity_type: null,
    is_audit_applicable: false,
    is_tds_deductor: false,
    is_tcs_collector: false,
    is_advance_tax_applicable: false,
    is_pf_applicable: false,
    is_esi_applicable: false,
    is_pt_applicable: false,
    pt_state: null,
    is_roc_applicable: false,
    agm_date: null,
    is_transfer_pricing: false,
    annual_turnover_estimate: null,
    fy_start_month: 4,
    ...overrides,
  };
}

describe('generateEventsForRule — monthly', () => {
  test('generates one event per month in window', () => {
    const events = generateEventsForRule(rule(), profile(), '2024-01-01', '2024-03-31');
    assert.equal(events.length, 3);
    assert.equal(events[0].period_label, 'Jan 2024');
    assert.equal(events[1].period_label, 'Feb 2024');
    assert.equal(events[2].period_label, 'Mar 2024');
  });
  test('due date respects due_month_offset', () => {
    // Window Feb-Apr: loop processes Feb, Mar, Apr periods.
    // Feb → due Mar 20; Mar → due Apr 20; Apr → due May 20 (outside window)
    const events = generateEventsForRule(rule({ due_month_offset: 1, due_day: 20 }), profile(), '2024-02-01', '2024-04-30');
    assert.equal(events.length, 2);
    assert.equal(events[0].due_date, '2024-03-20');
    assert.equal(events[0].period_label, 'Feb 2024');
    assert.equal(events[1].due_date, '2024-04-20');
    assert.equal(events[1].period_label, 'Mar 2024');
  });
  test('filters by due_date window (not period date)', () => {
    // Window Jan only: loop processes Jan period → due Feb 20 (outside window)
    const events = generateEventsForRule(rule({ due_month_offset: 1, due_day: 20 }), profile(), '2024-01-01', '2024-01-31');
    assert.equal(events.length, 0);
  });
  test('period with due_date inside window is included', () => {
    // Window Mar-Apr: Mar period due Mar 20 (inside); Apr period due Apr 20 (inside)
    const events = generateEventsForRule(rule({ due_month_offset: 0, due_day: 20 }), profile(), '2024-03-01', '2024-04-30');
    assert.equal(events.length, 2);
    assert.equal(events[0].period_label, 'Mar 2024');
    assert.equal(events[0].due_date, '2024-03-20');
    assert.equal(events[1].period_label, 'Apr 2024');
    assert.equal(events[1].due_date, '2024-04-20');
  });
  test('respects month predicate', () => {
    const r = rule({ applies_when: { month: 3 } });
    const events = generateEventsForRule(r, profile(), '2024-01-01', '2024-06-30');
    assert.equal(events.length, 1);
    assert.equal(events[0].period_label, 'Mar 2024');
  });
  test('respects exclude_month predicate', () => {
    const r = rule({ applies_when: { exclude_month: 2 } });
    const events = generateEventsForRule(r, profile(), '2024-01-01', '2024-03-31');
    assert.equal(events.length, 2);
    assert.ok(events.every((e) => !e.period_label.startsWith('Feb')));
  });
  test('inactive rule returns empty', () => {
    const r = rule({ is_active: false });
    const events = generateEventsForRule(r, profile(), '2024-01-01', '2024-12-31');
    assert.equal(events.length, 0);
  });
  test('gst_filing_frequency predicate', () => {
    const r = rule({ applies_when: { gst_filing_frequency: 'monthly' } });
    const events = generateEventsForRule(r, profile({ gst_filing_frequency: 'monthly' }), '2024-01-01', '2024-01-31');
    assert.equal(events.length, 1);
    const events2 = generateEventsForRule(r, profile({ gst_filing_frequency: 'qrmp' }), '2024-01-01', '2024-01-31');
    assert.equal(events2.length, 0);
  });
  test('boolean predicate (is_tds_deductor)', () => {
    const r = rule({ applies_when: { is_tds_deductor: true } });
    assert.equal(generateEventsForRule(r, profile({ is_tds_deductor: true }), '2024-01-01', '2024-01-31').length, 1);
    assert.equal(generateEventsForRule(r, profile({ is_tds_deductor: false }), '2024-01-01', '2024-01-31').length, 0);
  });
  test('annual_turnover_above threshold', () => {
    const r = rule({ applies_when: { annual_turnover_above: 500 } });
    assert.equal(generateEventsForRule(r, profile({ annual_turnover_estimate: 600 }), '2024-01-01', '2024-01-31').length, 1);
    assert.equal(generateEventsForRule(r, profile({ annual_turnover_estimate: 400 }), '2024-01-01', '2024-01-31').length, 0);
    assert.equal(generateEventsForRule(r, profile({ annual_turnover_estimate: null }), '2024-01-01', '2024-01-31').length, 0);
  });
});

describe('generateEventsForRule — quarterly', () => {
  test('generates quarter events for FY', () => {
    const r = rule({ periodicity: 'quarterly', due_month_offset: 1, due_day: 15 });
    const events = generateEventsForRule(r, profile({ fy_start_month: 4 }), '2024-01-01', '2024-12-31');
    assert.ok(events.length >= 4, `expected at least 4 quarterly events, got ${events.length}`);
    const labels = events.map((e) => e.period_label);
    assert.ok(labels.some((l) => l.includes('Q1')));
    assert.ok(labels.some((l) => l.includes('Q4')));
  });
  test('quarter predicate filtering', () => {
    const r = rule({ periodicity: 'quarterly', due_month_offset: 0, due_day: 15, applies_when: { quarter: 1 } });
    const events = generateEventsForRule(r, profile({ fy_start_month: 4 }), '2024-01-01', '2024-12-31');
    assert.ok(events.length >= 1);
    assert.ok(events.every((e) => e.period_label.includes('Q1')));
  });
});

describe('generateEventsForRule — yearly', () => {
  test('generates one event per FY', () => {
    const r = rule({ periodicity: 'yearly', due_month_offset: 1, due_day: 15 });
    const events = generateEventsForRule(r, profile({ fy_start_month: 4 }), '2024-01-01', '2024-12-31');
    assert.ok(events.length >= 1, `expected at least 1 yearly event, got ${events.length}`);
    const labels = events.map((e) => e.period_label);
    assert.ok(labels.some((l) => l.startsWith('FY ')));
  });
});

describe('generateEventsForRule — half_yearly', () => {
  test('generates two events per FY', () => {
    const r = rule({ periodicity: 'half_yearly', due_month_offset: 1, due_day: 15 });
    const events = generateEventsForRule(r, profile({ fy_start_month: 4 }), '2024-01-01', '2024-12-31');
    assert.ok(events.length >= 2, `expected at least 2 half-yearly events, got ${events.length}`);
  });
});

describe('generateEventsForRule — AGM formula', () => {
  test('computes due date from AGM + 30d offset', () => {
    const r = rule({ periodicity: 'one_off', due_date_formula: 'agm_date+30d', due_month_offset: 0, due_day: null });
    const events = generateEventsForRule(r, profile({ agm_date: '2024-09-15', fy_start_month: 4 }), '2024-01-01', '2024-12-31');
    assert.equal(events.length, 1);
    assert.equal(events[0].due_date, '2024-10-15');
  });
  test('computes due date from AGM + 60d offset', () => {
    const r = rule({ periodicity: 'one_off', due_date_formula: 'agm_date+60d', due_month_offset: 0, due_day: null });
    const events = generateEventsForRule(r, profile({ agm_date: '2024-09-15', fy_start_month: 4 }), '2024-01-01', '2024-12-31');
    assert.equal(events.length, 1);
    assert.equal(events[0].due_date, '2024-11-14');
  });
  test('returns empty if no AGM date', () => {
    const r = rule({ periodicity: 'one_off', due_date_formula: 'agm_date+30d' });
    const events = generateEventsForRule(r, profile({ agm_date: null }), '2024-01-01', '2024-12-31');
    assert.equal(events.length, 0);
  });
});
