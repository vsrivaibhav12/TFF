import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeadlinePlan, type PlanClientInput } from '../lib/services/deadline-plan';
import type { CalendarRule, ClientProfile } from '../lib/services/compliance-calendar-engine';

const sub = (period_type: string | null = 'monthly') => ({
  id: 's1', code: 'GSTR1', name: 'GSTR-1', frequency: 'monthly', period_type,
  due_day_of_month: 11, due_day_of_quarter: null, due_month: null,
});

const profile = (over: Partial<ClientProfile> = {}): ClientProfile => ({
  client_id: 'x', is_audit_applicable: false, is_tds_deductor: false, is_tcs_collector: false,
  is_advance_tax_applicable: false, is_pf_applicable: false, is_esi_applicable: false, is_pt_applicable: false,
  is_roc_applicable: false, is_transfer_pricing: false, fy_start_month: 4, ...over,
});

const client = (id: string, over: Partial<PlanClientInput> = {}): PlanClientInput => ({
  client_id: id, business_name: `Client ${id}`, group_name: null, default_assignee_id: null,
  gst_filing_frequency: null, profile: null, existing_task_id: null, ...over,
});

const rule = (over: Partial<CalendarRule> = {}): CalendarRule => ({
  id: 'r1', rule_code: 'GSTR1', display_name: 'GSTR-1', service_kind: 'gst', periodicity: 'monthly',
  due_day: 11, due_month_offset: 1, due_date_formula: null, applies_when: {}, reminder_days: [7, 3, 1], is_active: true, ...over,
});

describe('buildDeadlinePlan', () => {
  test('every linked client is ready when nothing excludes it', () => {
    const r = buildDeadlinePlan({ subService: sub(), periodKey: '2026-10', rule: rule(), clients: [client('a'), client('b')] });
    assert.ok(r.ok);
    if (r.ok) {
      assert.deepEqual(r.plan.counts, { linked: 2, applicable: 2, exists: 0, ready: 2, notApplicable: 0 });
      assert.equal(r.plan.due.dueDate, '2026-11-11');
      assert.equal(r.plan.due.source, 'rule');
    }
  });

  test('clients that already have a task are marked, not offered again', () => {
    const r = buildDeadlinePlan({ subService: sub(), periodKey: '2026-10', rule: rule(), clients: [client('a', { existing_task_id: 't1' }), client('b')] });
    assert.ok(r.ok);
    if (r.ok) {
      assert.deepEqual(r.plan.clients.map((c) => c.status), ['exists', 'ready']);
      assert.deepEqual(r.plan.counts, { linked: 2, applicable: 2, exists: 1, ready: 1, notApplicable: 0 });
    }
  });

  test('a rule predicate removes clients it does not apply to', () => {
    const r = buildDeadlinePlan({
      subService: sub(), periodKey: '2026-10', rule: rule({ applies_when: { is_tds_deductor: true } }),
      clients: [client('a', { profile: profile({ is_tds_deductor: true }) }), client('b', { profile: profile() })],
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.deepEqual(r.plan.clients.map((c) => c.status), ['ready', 'not_applicable']);
      assert.match(r.plan.clients[1].reason ?? '', /does not apply/);
    }
  });

  test('a client with no compliance profile cannot be excluded by a predicate', () => {
    const r = buildDeadlinePlan({ subService: sub(), periodKey: '2026-10', rule: rule({ applies_when: { is_tds_deductor: true } }), clients: [client('a')] });
    assert.ok(r.ok && r.plan.clients[0].status === 'ready');
  });

  test('GST service: a quarterly filer is not applicable to a monthly period', () => {
    const r = buildDeadlinePlan({
      subService: sub('gst_frequency'), periodKey: '2026-10', rule: rule(),
      clients: [client('a', { gst_filing_frequency: 'monthly' }), client('b', { gst_filing_frequency: 'qrmp' }), client('c', { gst_filing_frequency: null })],
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.deepEqual(r.plan.clients.map((c) => c.status), ['ready', 'not_applicable', 'ready']);
      assert.match(r.plan.clients[1].reason ?? '', /quarterly/);
    }
  });

  test('an override moves the due date', () => {
    const r = buildDeadlinePlan({ subService: sub(), periodKey: '2026-10', rule: rule(), override: '2026-11-18', clients: [client('a')] });
    assert.ok(r.ok && r.plan.due.dueDate === '2026-11-18' && r.plan.due.source === 'override');
  });

  test('rejects an invalid period key and a period of the wrong type', () => {
    assert.equal(buildDeadlinePlan({ subService: sub(), periodKey: 'nope', clients: [] }).ok, false);
    const r = buildDeadlinePlan({ subService: sub('monthly'), periodKey: 'FY2026-27', clients: [] });
    assert.equal(r.ok, false);
  });

  test('a service with no period cannot have a deadline', () => {
    const r = buildDeadlinePlan({ subService: sub('none'), periodKey: '2026-10', clients: [] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /no period/i);
  });

  test('with no due date configured the plan still lists clients, without a date', () => {
    const r = buildDeadlinePlan({ subService: { ...sub(), frequency: 'on_demand', due_day_of_month: null }, periodKey: '2026-10', clients: [client('a')] });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.plan.due.dueDate, null);
  });
});
