import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useConfigStore, DEFAULT_SITE_CONFIG } from './configStore.ts';
import { installMemoryStorage, MemoryStorage } from '@/test/mocks';
import { DRAFT_PREFIX } from '@/lib/draftStorage';

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

type DiscardResult = { ok: boolean; message: string | null };
type DiscardAction = (options?: { discardWithoutBackup?: boolean }) => DiscardResult;

/** Calls an action whose result may not be implemented yet, so the assertion fails cleanly. */
const callDiscard = (action: () => void, options?: { discardWithoutBackup?: boolean }) =>
  (action as unknown as DiscardAction)(options) as DiscardResult | undefined;

const conflictedConfig = (name: string, draftId: string) => {
  withBaseline();
  useConfigStore.setState({
    draftId,
    dirty: true,
    draftIssue: null,
    siteConfig: { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name } },
    conflict: {
      remoteSha: 'sha-2',
      remoteData: { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: '远程改' } },
      detectedAt: new Date().toISOString(),
    },
  });
};

test('adoptRemote keeps the draft and the conflict when the backup cannot be written', () => {
  conflictedConfig('本机改', 'tab-1');
  const { resourceKey } = useConfigStore.getState();
  const draftKey = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:tab-1`;
  storage.local.setItem(draftKey, '{"pending":true}');

  storage.local.failWrites = true;
  const result = callDiscard(useConfigStore.getState().adoptRemote);
  storage.local.failWrites = false;

  assert.equal(result?.ok, false, 'adopting is refused when the backup fails');
  assert.ok(result?.message, 'the user gets the reason and the next step');
  assert.equal(useConfigStore.getState().siteConfig.site.name, '本机改');
  assert.ok(useConfigStore.getState().conflict, 'conflict stays open');
  assert.equal(storage.local.getItem(draftKey), '{"pending":true}', 'draft is not deleted');
  assert.ok(useConfigStore.getState().draftIssue, 'the storage problem is surfaced');
});

test('adoptRemote drops the backup only after explicit confirmation', () => {
  conflictedConfig('本机改', 'tab-2');
  const { resourceKey } = useConfigStore.getState();
  const draftKey = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:tab-2`;
  storage.local.setItem(draftKey, '{"pending":true}');

  storage.local.failWrites = true;
  const result = callDiscard(useConfigStore.getState().adoptRemote, { discardWithoutBackup: true });
  storage.local.failWrites = false;

  assert.equal(result?.ok, true);
  assert.equal(useConfigStore.getState().siteConfig.site.name, '远程改');
  assert.equal(useConfigStore.getState().conflict, null);
  assert.equal(storage.local.getItem(draftKey), null);
});

test('discardLocal keeps the dirty state when the backup cannot be written', () => {
  withBaseline();
  useConfigStore.setState({
    draftId: 'tab-3',
    dirty: true,
    siteConfig: { ...DEFAULT_SITE_CONFIG, site: { ...DEFAULT_SITE_CONFIG.site, name: '本机改' } },
  });
  const { resourceKey } = useConfigStore.getState();
  const draftKey = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:tab-3`;
  storage.local.setItem(draftKey, '{"pending":true}');

  storage.local.failWrites = true;
  const result = callDiscard(useConfigStore.getState().discardLocal);
  storage.local.failWrites = false;

  assert.equal(result?.ok, false);
  assert.equal(useConfigStore.getState().siteConfig.site.name, '本机改');
  assert.equal(useConfigStore.getState().dirty, true);
  assert.equal(storage.local.getItem(draftKey), '{"pending":true}');
});
