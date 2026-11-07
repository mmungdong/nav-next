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
  topTypes: [1, 2],
  index: 0,
};

const secondWebsite = {
  ...baseWebsite,
  id: 2,
  name: 'Bing',
  tags: ['search', 'cn'],
  index: 1,
};

const baseCategory = { id: 1, title: '常用', icon: '🛠️', nav: [baseWebsite, secondWebsite] };

test('compareData detects tags change', () => {
  const remote = [
    { ...baseCategory, nav: [{ ...baseWebsite, tags: ['changed'] }, secondWebsite] },
  ];
  const diff = compareData([baseCategory], remote);
  assert.equal(diff.websitesModified.length, 1);
});

test('compareData detects topTypes change', () => {
  const remote = [{ ...baseCategory, nav: [{ ...baseWebsite, topTypes: [9] }, secondWebsite] }];
  const diff = compareData([baseCategory], remote);
  assert.equal(diff.websitesModified.length, 1);
});

test('compareData detects index change', () => {
  const remote = [{ ...baseCategory, nav: [{ ...baseWebsite, index: 99 }, secondWebsite] }];
  const diff = compareData([baseCategory], remote);
  assert.equal(diff.websitesModified.length, 1);
});

test('compareData reports no changes when identical', () => {
  const diff = compareData([baseCategory], [baseCategory]);
  assert.equal(diff.websitesModified.length, 0);
  assert.equal(diff.categoriesModified.length, 0);
  assert.equal(diff.websitesReordered.length, 0);
  assert.equal(diff.categoriesReordered, false);
});

test('compareData detects website order changes inside a category', () => {
  const local = [{ ...baseCategory, nav: [secondWebsite, baseWebsite] }];
  const diff = compareData(local, [baseCategory]);
  assert.equal(diff.websitesReordered.length, 1);
  assert.deepEqual(diff.websitesReordered[0].websiteIds, [2, 1]);
  assert.equal(diff.websitesModified.length, 0, 'reordering is not a field change');
});

test('compareData detects category reordering', () => {
  const otherCategory = { id: 2, title: '其他', icon: '📚', nav: [] };
  const diff = compareData([otherCategory, baseCategory], [baseCategory, otherCategory]);
  assert.equal(diff.categoriesReordered, true);
});

test('compareData detects a website moved across categories', () => {
  const otherCategory = { id: 2, title: '其他', icon: '📚', nav: [] };
  const local = [
    { ...baseCategory, nav: [baseWebsite] },
    { ...otherCategory, nav: [secondWebsite] },
  ];
  const diff = compareData(local, [baseCategory, otherCategory]);
  assert.equal(diff.websitesMoved.length, 1);
  assert.equal(diff.websitesMoved[0].website.id, 2);
  assert.equal(diff.websitesModified.length, 0);
});

test('compareData ignores the retired ownVisible field at runtime', () => {
  const withLegacyFlag = { ...baseCategory, nav: [{ ...baseWebsite, ownVisible: true }, secondWebsite] };
  const diff = compareData([baseCategory], [withLegacyFlag]);
  assert.equal(diff.websitesModified.length, 0);
});
