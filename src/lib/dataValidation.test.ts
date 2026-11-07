import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCategories,
  normalizeWebsite,
  validateCategories,
  validateSiteConfig,
} from '@/lib/dataValidation';

const site = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: '站点',
  desc: '描述',
  url: 'https://example.com',
  icon: '',
  tags: ['工具'],
  rate: 5,
  top: false,
  topTypes: [1, 2],
  index: 3,
  ...overrides,
});

test('A01 removal of ownVisible keeps every site, field and order', () => {
  const input = [
    { id: 10, title: '分类一', icon: '🧭', nav: [site({ id: 1, ownVisible: true }), site({ id: 2, ownVisible: false })] },
    { id: 20, title: '分类二', icon: '📚', nav: [site({ id: 3, ownVisible: true, name: '第三个' })] },
  ];

  const normalized = normalizeCategories(input);
  assert.equal(normalized.length, 2);
  assert.equal(normalized.reduce((sum, category) => sum + category.nav.length, 0), 3);
  assert.deepEqual(normalized.map((category) => category.id), [10, 20]);
  assert.deepEqual(normalized[0].nav.map((entry) => entry.id), [1, 2]);
  assert.equal(normalized[1].nav[0].name, '第三个');

  // Business fields survive normalization untouched.
  assert.deepEqual(normalized[0].nav[1].tags, ['工具']);
  assert.equal(normalized[0].nav[0].rate, 5);
  assert.deepEqual(normalized[0].nav[0].topTypes, [1, 2]);
  assert.equal(normalized[0].nav[0].index, 3);

  // Serialization no longer contains the retired flag.
  const serialized = JSON.stringify(normalized);
  assert.equal(serialized.includes('ownVisible'), false);
});

test('normalizeWebsite preserves unknown fields but drops ownVisible', () => {
  const normalized = normalizeWebsite({ id: 1, name: 'x', ownVisible: true, custom: 'keep' });
  assert.equal('ownVisible' in normalized, false);
  assert.equal((normalized as unknown as { custom: string }).custom, 'keep');
});

test('valid data passes and keeps inline data:image icons in use', () => {
  const result = validateCategories([
    {
      id: 1,
      title: '分类',
      icon: '🧭',
      nav: [site({ icon: 'data:image/png;base64,AAA' }), site({ id: 2, icon: '/icons/a.png' })],
    },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.value?.length, 1);
  assert.equal(result.value?.[0].nav.length, 2);
});

test('legacy null index and missing optional fields stay valid', () => {
  const result = validateCategories([
    {
      id: 1,
      title: '分类',
      nav: [site({ index: null, rate: undefined, top: undefined, topTypes: undefined })],
    },
  ]);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.value?.[0].nav[0].index, null);
});

test('legacy object tags from real data are accepted and preserved', () => {
  const legacyTag = { id: '-3', url: 'https://github.com/docker/compose' };
  const result = validateCategories([
    { id: 1, title: '分类', nav: [site({ tags: ['工具', legacyTag] })] },
  ]);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(result.value?.[0].nav[0].tags, ['工具', legacyTag]);
});

test('invalid websites are rejected with a location path', () => {
  const result = validateCategories([
    {
      id: 1,
      title: '分类',
      nav: [site({ id: 1, url: 'javascript:alert(1)' })],
    },
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === 'categories[0].nav[0].url'));
});

test('duplicate category ids and global website ids are rejected', () => {
  const duplicateCategories = validateCategories([
    { id: 1, title: 'A', nav: [] },
    { id: 1, title: 'B', nav: [] },
  ]);
  assert.equal(duplicateCategories.ok, false);

  const duplicateWebsites = validateCategories([
    { id: 1, title: 'A', nav: [site({ id: 7 })] },
    { id: 2, title: 'B', nav: [site({ id: 7 })] },
  ]);
  assert.equal(duplicateWebsites.ok, false);
  assert.ok(
    duplicateWebsites.issues.some((issue) => issue.message.includes('重复'))
  );
});

test('optional field types are validated without inventing defaults', () => {
  const result = validateCategories([
    { id: 1, title: 'A', nav: [site({ tags: [1], rate: '5', top: 'yes' })] },
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path.endsWith('.tags')));
  assert.ok(result.issues.some((issue) => issue.path.endsWith('.rate')));
  assert.ok(result.issues.some((issue) => issue.path.endsWith('.top')));
});

test('site config validation covers engine ids, URLs and theme', () => {
  const valid = validateSiteConfig({
    site: { name: 'n', description: 'd', theme: 'dark' },
    search: {
      engines: [
        { id: 'a', name: 'A', url: 'https://a.example/search?q=', icon: 'a' },
      ],
    },
  });
  assert.equal(valid.ok, true);

  const duplicateEngine = validateSiteConfig({
    site: { name: 'n', description: 'd', theme: 'dark' },
    search: {
      engines: [
        { id: 'a', name: 'A', url: 'https://a.example/?q=', icon: '' },
        { id: 'a', name: 'B', url: 'https://b.example/?q=', icon: '' },
      ],
    },
  });
  assert.equal(duplicateEngine.ok, false);

  const badTheme = validateSiteConfig({
    site: { name: 'n', description: 'd', theme: 'neon' },
    search: { engines: [] },
  });
  assert.equal(badTheme.ok, false);
});
