import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createClientSchema,
  createTaskSchema,
  createQuerySchema,
  replyQuerySchema,
  taskStatusEnum,
} from '../lib/validation/schemas';

describe('createClientSchema', () => {
  test('accepts valid client', () => {
    const r = createClientSchema.safeParse({
      business_name: 'Acme Corp',
      pan: 'ABCDE1234F',
      gstin: '27ABCDE1234F1Z5',
    });
    assert.equal(r.success, true);
  });
  test('rejects empty business name', () => {
    const r = createClientSchema.safeParse({ business_name: '' });
    assert.equal(r.success, false);
  });
  test('rejects invalid PAN', () => {
    const r = createClientSchema.safeParse({ business_name: 'X', pan: 'invalid' });
    assert.equal(r.success, false);
  });
  test('rejects invalid GSTIN', () => {
    const r = createClientSchema.safeParse({ business_name: 'X', gstin: 'bad' });
    assert.equal(r.success, false);
  });
  test('allows optional fields to be omitted', () => {
    const r = createClientSchema.safeParse({ business_name: 'Solo' });
    assert.equal(r.success, true);
  });
});

describe('createTaskSchema', () => {
  test('accepts valid task', () => {
    const r = createTaskSchema.safeParse({
      client_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'File GSTR-1',
      priority: 'high',
    });
    assert.equal(r.success, true);
  });
  test('rejects missing client_id', () => {
    const r = createTaskSchema.safeParse({ title: 'File GSTR-1' });
    assert.equal(r.success, false);
  });
  test('rejects title too short', () => {
    const r = createTaskSchema.safeParse({
      client_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'X',
    });
    assert.equal(r.success, false);
  });
  test('defaults priority to medium', () => {
    const r = createTaskSchema.safeParse({
      client_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Task',
    });
    assert.equal(r.success, true);
    assert.equal((r.data as any).priority, 'medium');
  });
  test('rejects invalid period_month', () => {
    const r = createTaskSchema.safeParse({
      client_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Task',
      period_month: 13,
    });
    assert.equal(r.success, false);
  });
});

describe('createQuerySchema', () => {
  test('accepts valid query', () => {
    const r = createQuerySchema.safeParse({
      client_id: '550e8400-e29b-41d4-a716-446655440000',
      subject: 'GST notice clarification',
      description: 'Need to understand Section 74 implications.',
    });
    assert.equal(r.success, true);
  });
  test('rejects empty description', () => {
    const r = createQuerySchema.safeParse({
      client_id: '550e8400-e29b-41d4-a716-446655440000',
      subject: 'X',
      description: '',
    });
    assert.equal(r.success, false);
  });
});

describe('replyQuerySchema', () => {
  test('accepts valid reply', () => {
    const r = replyQuerySchema.safeParse({
      query_id: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Here is the document you requested.',
    });
    assert.equal(r.success, true);
  });
  test('rejects empty message', () => {
    const r = replyQuerySchema.safeParse({
      query_id: '550e8400-e29b-41d4-a716-446655440000',
      message: '',
    });
    assert.equal(r.success, false);
  });
});

describe('taskStatusEnum', () => {
  test('allows valid statuses', () => {
    assert.ok(taskStatusEnum.safeParse('pending').success);
    assert.ok(taskStatusEnum.safeParse('in_progress').success);
    assert.ok(taskStatusEnum.safeParse('completed').success);
    assert.ok(taskStatusEnum.safeParse('cancelled').success);
  });
  test('rejects invalid status', () => {
    assert.equal(taskStatusEnum.safeParse('review').success, false);
    assert.equal(taskStatusEnum.safeParse('archived').success, false);
  });
});
