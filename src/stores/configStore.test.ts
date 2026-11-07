import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useConfigStore, DEFAULT_SITE_CONFIG } from './configStore.ts';
import { installMemoryStorage, MemoryStorage } from '@/test/mocks';

let storage: { local: MemoryStorage; session: MemoryStorage };

const withBaseline = () => {
  useConfigStore.setState({
    dirty: false,
    baselineReady: true,
    baseSha: 'sha-1',
    baseline: DEFAULT_SITE_CONFIG,
    remoteSnapshot: DEFAULT_SITE_CONFIG,
    siteConfig: DEFAULT_SITE_CONFIG,
    revision: 0,
    draftId: 'test-draft',
    resourceKey: 'owner/repo@main:path#owner',
  });
};

beforeEach(() => {
  storage = installMemoryStorage();
  useConfigStore.setState({
    dirty: false,
    baselineReady: false,
    baseSha: null,
    baseline: DEFAULT_SITE_CONFIG,
    remoteSnapshot: DEFAULT_SITE_CONFIG,
    siteConfig: DEFAULT_SITE_CONFIG,
    revision: 0,
    draftId: '',
    draftIssue: null,
    conflict: null,
  });
});

test('default site config has three engines', () => {
  assert.equal(DEFAULT_SITE_CONFIG.search.engines.length, 3);
  assert.equal(DEFAULT_SITE_CONFIG.site.theme, 'system');
});

test('saveConfig marks dirty and persists a v2 draft', () => {
  withBaseline();
  const next = { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: 'New' } };
  const saved = useConfigStore.getState().saveConfig(next);

  assert.equal(saved, true);
  assert.equal(useConfigStore.getState().dirty, true);
  assert.equal(useConfigStore.getState().siteConfig.site.name, 'New');
  assert.ok(storage.local.keys().some((key) => key.startsWith('navnext:draft:v2:')));
});

test('saveConfig without a verified baseline does not claim a local save', () => {
  const next = { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: 'New' } };
  const saved = useConfigStore.getState().saveConfig(next);
  assert.equal(saved, false);
  assert.equal(useConfigStore.getState().siteConfig.site.name, 'New');
  assert.ok(useConfigStore.getState().draftIssue);
});

test('discardLocal rolls back to the baseline and clears dirty', () => {
  withBaseline();
  useConfigStore.setState({
    dirty: true,
    siteConfig: { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: 'Dirty' } },
  });
  useConfigStore.getState().discardLocal();
  assert.equal(useConfigStore.getState().dirty, false);
  assert.equal(useConfigStore.getState().siteConfig.site.name, 'Nav Next');
});
