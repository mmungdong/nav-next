import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useConfigStore, DEFAULT_SITE_CONFIG } from './configStore.ts';

// localStorage polyfill for node test env
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

test('default site config has three engines', () => {
  assert.equal(DEFAULT_SITE_CONFIG.search.engines.length, 3);
  assert.equal(DEFAULT_SITE_CONFIG.site.theme, 'system');
});

test('saveConfig marks dirty and persists to localStorage', () => {
  // reset store singleton state
  useConfigStore.setState({ dirty: false, siteConfig: DEFAULT_SITE_CONFIG });
  const next = { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: 'New' } };
  useConfigStore.getState().saveConfig(next);
  assert.equal(useConfigStore.getState().dirty, true);
  assert.equal(useConfigStore.getState().siteConfig.site.name, 'New');
  assert.ok(store['SITE_CONFIG']);
});

test('discardLocal rolls back to remoteSnapshot and clears dirty', () => {
  useConfigStore.setState({ remoteSnapshot: DEFAULT_SITE_CONFIG, dirty: true, siteConfig: { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: 'Dirty' } } });
  useConfigStore.getState().discardLocal();
  assert.equal(useConfigStore.getState().dirty, false);
  assert.equal(useConfigStore.getState().siteConfig.site.name, 'Nav Next');
});
