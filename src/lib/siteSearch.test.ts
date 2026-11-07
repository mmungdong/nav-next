import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countMatchedSites,
  filterCategories,
  isValidSiteUrl,
  normalizeSearch,
  siteDomain,
  sortForDisplay,
} from '@/lib/siteSearch';
import { moveSelection, nextSelection, previousSelection } from '@/lib/searchNavigation';
import { ICategory } from '@/types';

const categories: ICategory[] = [
  {
    id: 1,
    title: '开发工具',
    nav: [
      { id: 1, name: 'GitHub', desc: '代码托管', url: 'https://github.com' },
      { id: 2, name: 'V2EX', desc: '社区', url: 'https://v2ex.com', top: true },
    ],
  },
  {
    id: 2,
    title: '设计',
    nav: [
      { id: 3, name: 'Figma', desc: '设计工具', url: 'https://figma.com' },
      { id: 4, name: '开发文档', desc: 'docs', url: 'https://example.com/docs' },
    ],
  },
];

test('normalization trims, lowercases and folds full-width characters', () => {
  assert.equal(normalizeSearch('  ＧＩＴＨＵＢ  '), 'github');
  assert.equal(normalizeSearch(undefined), '');
});

test('category title hits expose every site in that category', () => {
  const matches = filterCategories(categories, '开发');
  assert.equal(matches.length, 2);
  const development = matches.find((match) => match.category.title === '开发工具');
  assert.equal(development?.sites.length, 2);
  // The site whose own description mentions 开发 is also matched in its category.
  assert.equal(countMatchedSites(matches), 2 + 1);
});

test('site name, description, URL and domain are all searchable', () => {
  assert.equal(filterCategories(categories, 'github').length, 1);
  assert.equal(filterCategories(categories, '社区').length, 1);
  assert.equal(filterCategories(categories, 'v2ex.com').length, 1);
  assert.equal(filterCategories(categories, 'EXAMPLE').length, 1);
});

test('empty query returns all categories with all sites', () => {
  const matches = filterCategories(categories, '   ');
  assert.equal(matches.length, 2);
  assert.equal(countMatchedSites(matches), 4);
});

test('invalid site URLs are rejected and never thrown from rendering helpers', () => {
  assert.equal(isValidSiteUrl('https://ok.example'), true);
  assert.equal(isValidSiteUrl('javascript:alert(1)'), false);
  assert.equal(isValidSiteUrl(undefined), false);
  assert.equal(siteDomain('not a url'), 'not a url');
  assert.equal(siteDomain('https://www.example.com/path'), 'example.com');
});

test('top sites render first inside their category without changing stored order', () => {
  const sites = categories[0].nav;
  const display = sortForDisplay(sites);
  assert.deepEqual(display.map((site) => site.id), [2, 1]);
  assert.deepEqual(sites.map((site) => site.id), [1, 2], 'source order untouched');
});

test('keyboard selection starts at the first/last item and wraps', () => {
  assert.equal(nextSelection(-1, 3), 0);
  assert.equal(previousSelection(-1, 3), 2);
  assert.equal(nextSelection(2, 3), 0);
  assert.equal(previousSelection(0, 3), 2);
  assert.equal(moveSelection(1, 1, 3), 2);
  assert.equal(moveSelection(1, 1, 0), -1);
  // A stale index beyond the current result count is clamped into the list.
  assert.equal(nextSelection(9, 3), 0);
});
