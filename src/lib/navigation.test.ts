import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickActiveSection, resolveActiveId, scrollTopFor } from './navigation.ts';

test('resolveActiveId keeps a valid id and drops a stale one', () => {
  assert.equal(resolveActiveId('category-2', ['category-1', 'category-2']), 'category-2');
  assert.equal(resolveActiveId('category-9', ['category-1', 'category-2']), 'category-1');
  assert.equal(resolveActiveId('category-9', []), '');
});

test('scrollTopFor applies the sticky offset and never goes negative', () => {
  assert.equal(scrollTopFor(500, 92), 408);
  assert.equal(scrollTopFor(20, 92), 0);
});

test('pickActiveSection follows the offset line', () => {
  const sections = [
    { id: 'a', top: 0 },
    { id: 'b', top: 500 },
    { id: 'c', top: 1000 },
  ];
  assert.equal(pickActiveSection(sections, 92, false), 'a');
  assert.equal(
    pickActiveSection(
      [
        { id: 'a', top: -400 },
        { id: 'b', top: 100 },
      ],
      92,
      false
    ),
    'a'
  );
  assert.equal(
    pickActiveSection(
      [
        { id: 'a', top: -400 },
        { id: 'b', top: 0 },
      ],
      92,
      false
    ),
    'b'
  );
});

test('the last section wins at the bottom of the page', () => {
  const sections = [
    { id: 'a', top: -800 },
    { id: 'b', top: -100 },
  ];
  assert.equal(pickActiveSection(sections, 92, true), 'b');
});

test('no sections produces an empty id', () => {
  assert.equal(pickActiveSection([], 92, false), '');
  assert.equal(pickActiveSection([], 92, true), '');
});
