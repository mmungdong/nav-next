import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeHostname } from './utils.ts';

test('safeHostname extracts hostname from valid url', () => {
  assert.equal(safeHostname('https://www.example.com/path'), 'example.com');
  assert.equal(safeHostname('https://example.com'), 'example.com');
});

test('safeHostname strips www prefix', () => {
  assert.equal(safeHostname('https://www.github.com/repo'), 'github.com');
});

test('safeHostname returns input as-is for invalid url', () => {
  assert.equal(safeHostname('not a url'), 'not a url');
  assert.equal(safeHostname(''), '');
  assert.equal(safeHostname('example'), 'example');
});
