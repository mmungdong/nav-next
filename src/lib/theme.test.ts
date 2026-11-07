import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isThemeMode, shouldApplyConfigTheme } from './theme.ts';

test('a visitor without a stored theme receives the configured default', () => {
  assert.equal(shouldApplyConfigTheme(null, null, 'dark'), true);
});

test('a value that is still our applied default can follow config changes', () => {
  assert.equal(shouldApplyConfigTheme('dark', 'dark', 'light'), true);
});

test('an explicit visitor choice is not overridden', () => {
  assert.equal(shouldApplyConfigTheme('light', 'dark', 'dark'), false);
  assert.equal(shouldApplyConfigTheme('light', null, 'dark'), false);
});

test('invalid configured themes are ignored', () => {
  assert.equal(shouldApplyConfigTheme(null, null, 'sepia'), false);
  assert.equal(isThemeMode('system'), true);
  assert.equal(isThemeMode('sepia'), false);
});
