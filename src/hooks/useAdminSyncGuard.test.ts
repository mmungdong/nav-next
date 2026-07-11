import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideLeave } from './useAdminSyncGuard.ts';

test('decideLeave returns clean when neither store dirty', () => {
  assert.equal(decideLeave(false, false), 'clean');
});

test('decideLeave returns dirty when nav store dirty', () => {
  assert.equal(decideLeave(true, false), 'dirty');
});

test('decideLeave returns dirty when config store dirty', () => {
  assert.equal(decideLeave(false, true), 'dirty');
});

test('decideLeave returns dirty when both dirty', () => {
  assert.equal(decideLeave(true, true), 'dirty');
});
