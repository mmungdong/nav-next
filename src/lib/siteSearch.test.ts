import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countAllSites,
  countMatchedSites,
  filterCategories,
  normalizeSearch,
  siteDomain,
  isValidSiteUrl,
} from './siteSearch.ts';
import type { ICategory } from '@/types';

const categories: ICategory[] = [
  {
    id: 1,
    title: 'AI',
    nav: [
      { id: 11, name: 'ChatGPT', desc: '对话助手', url: 'https://chatgpt.com' },
      { id: 12, name: 'Kimi', desc: '', url: 'https://www.kimi.com/chat' },
    ],
  },
  {
    id: 2,
    title: '开发工具',
    nav: [
      { id: 21, name: 'GitHub', desc: '代码托管', url: 'https://github.com' },
      { id: 22, name: 'MDN', desc: 'Web 文档', url: 'https://developer.mozilla.org' },
    ],
  },
  {
    id: 3,
    title: '空分类',
    nav: [],
  },
];

test('empty query returns every category in source order with all sites', () => {
  const matches = filterCategories(categories, '   ');
  assert.deepEqual(
    matches.map((m) => m.category.id),
    [1, 2, 3]
  );
  assert.equal(countMatchedSites(matches), 4);
  assert.equal(countAllSites(categories), 4);
});

test('site name and description matches are case-insensitive and trimmed', () => {
  const byName = filterCategories(categories, '  GITHUB  ');
  assert.equal(byName.length, 1);
  assert.deepEqual(
    byName[0].sites.map((s) => s.name),
    ['GitHub']
  );

  const byDesc = filterCategories(categories, '代码托管');
  assert.deepEqual(
    byDesc[0].sites.map((s) => s.name),
    ['GitHub']
  );
});

test('domain and full URL are searchable, with www stripped for display', () => {
  const byDomain = filterCategories(categories, 'kimi.com');
  assert.deepEqual(
    byDomain[0].sites.map((s) => s.name),
    ['Kimi']
  );
  assert.equal(siteDomain('https://www.kimi.com/chat'), 'kimi.com');
});

test('a category-name hit exposes all sites in that category', () => {
  const matches = filterCategories(categories, 'ai');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].category.id, 1);
  // Both sites are returned even though only one name/desc contains "ai".
  assert.equal(matches[0].sites.length, 2);
});

test('a site-only hit lists just the matching sites', () => {
  const matches = filterCategories(categories, 'mdn');
  assert.equal(matches.length, 1);
  assert.deepEqual(
    matches[0].sites.map((s) => s.name),
    ['MDN']
  );
});

test('no match returns an empty list and zero count', () => {
  const matches = filterCategories(categories, '绝对不存在的关键词');
  assert.deepEqual(matches, []);
  assert.equal(countMatchedSites(matches), 0);
});

test('invalid urls do not throw and keep a displayable fallback', () => {
  assert.equal(isValidSiteUrl('not-a-url'), false);
  assert.equal(isValidSiteUrl('javascript:alert(1)'), false);
  assert.equal(isValidSiteUrl('https://example.com'), true);
  assert.equal(siteDomain('not-a-url'), 'not-a-url');
  assert.equal(siteDomain(undefined), '');

  const malformed: ICategory[] = [
    { id: 9, title: '坏数据', nav: [{ id: 90, name: 'Bad', desc: '', url: 'not-a-url' }] },
  ];
  const matches = filterCategories(malformed, 'bad');
  assert.equal(matches[0].sites.length, 1);
  assert.equal(matches[0].sites[0].desc, '');
});

test('normalizeSearch handles full-width characters and whitespace', () => {
  assert.equal(normalizeSearch('  ＡＩ   站点 '), 'ai 站点');
});
