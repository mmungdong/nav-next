import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useNavStore } from './navStore.ts';

const { compareData } = useNavStore.getState();

const baseWebsite = {
  id: 1,
  name: 'Google',
  desc: 'search',
  url: 'https://google.com',
  icon: 'g',
  tags: ['search'],
  rate: 5,
  top: true,
  ownVisible: false,
  topTypes: [1, 2],
  index: 0,
};

const baseCategory = { id: 1, title: '常用', icon: '🛠️', nav: [baseWebsite] };

test('compareData detects tags change', () => {
  const remote = [{ ...baseCategory, nav: [{ ...baseWebsite, tags: ['changed'] }] }];
  const diff = compareData([baseCategory], remote);
  assert.equal(diff.websitesModified.length, 1);
});

test('compareData detects topTypes change', () => {
  const remote = [{ ...baseCategory, nav: [{ ...baseWebsite, topTypes: [9] }] }];
  const diff = compareData([baseCategory], remote);
  assert.equal(diff.websitesModified.length, 1);
});

test('compareData detects index change', () => {
  const remote = [{ ...baseCategory, nav: [{ ...baseWebsite, index: 99 }] }];
  const diff = compareData([baseCategory], remote);
  assert.equal(diff.websitesModified.length, 1);
});

test('compareData reports no changes when identical', () => {
  const diff = compareData([baseCategory], [baseCategory]);
  assert.equal(diff.websitesModified.length, 0);
  assert.equal(diff.categoriesModified.length, 0);
});
