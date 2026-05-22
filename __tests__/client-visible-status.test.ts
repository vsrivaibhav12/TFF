import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getClientVisibleStatus,
  CLIENT_VISIBLE_LABELS,
  CLIENT_VISIBLE_VARIANTS,
  type TaskForClientView,
} from '../lib/services/client-visible-status';

describe('getClientVisibleStatus', () => {
  test('pending → scheduled', () => {
    assert.equal(getClientVisibleStatus({ status: 'pending' }), 'scheduled');
  });
  test('in_progress → in_progress', () => {
    assert.equal(getClientVisibleStatus({ status: 'in_progress' }), 'in_progress');
  });
  test('review → under_review', () => {
    assert.equal(getClientVisibleStatus({ status: 'review' }), 'under_review');
  });
  test('completed → done', () => {
    assert.equal(getClientVisibleStatus({ status: 'completed' }), 'done');
  });
  test('cancelled → cancelled', () => {
    assert.equal(getClientVisibleStatus({ status: 'cancelled' }), 'cancelled');
  });
  test('is_stuck overrides everything', () => {
    assert.equal(getClientVisibleStatus({ status: 'pending', is_stuck: true }), 'on_hold');
    assert.equal(getClientVisibleStatus({ status: 'completed', is_stuck: true }), 'on_hold');
    assert.equal(getClientVisibleStatus({ status: 'in_progress', is_stuck: true }), 'on_hold');
  });
  test('is_blocked_on_client → we_need_info (when not stuck)', () => {
    assert.equal(getClientVisibleStatus({ status: 'in_progress', is_blocked_on_client: true }), 'we_need_info');
  });
  test('stuck takes priority over blocked_on_client', () => {
    assert.equal(
      getClientVisibleStatus({ status: 'in_progress', is_blocked_on_client: true, is_stuck: true }),
      'on_hold'
    );
  });
  test('unknown status defaults to scheduled', () => {
    assert.equal(getClientVisibleStatus({ status: 'unknown' as any }), 'scheduled');
  });
});

describe('CLIENT_VISIBLE_LABELS', () => {
  test('every status has a label', () => {
    const statuses = Object.keys(CLIENT_VISIBLE_LABELS);
    assert.ok(statuses.includes('scheduled'));
    assert.ok(statuses.includes('done'));
    assert.equal(CLIENT_VISIBLE_LABELS.done, 'Done');
  });
});

describe('CLIENT_VISIBLE_VARIANTS', () => {
  test('done maps to success', () => {
    assert.equal(CLIENT_VISIBLE_VARIANTS.done, 'success');
  });
  test('on_hold maps to destructive', () => {
    assert.equal(CLIENT_VISIBLE_VARIANTS.on_hold, 'destructive');
  });
});
