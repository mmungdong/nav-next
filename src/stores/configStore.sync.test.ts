import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SITE_CONFIG, useConfigStore } from '@/stores/configStore';
import { configPath } from '@/lib/config';
import { ISiteConfig } from '@/types';
import { DRAFT_PREFIX, TAB_DRAFT_ID_PREFIX, loadDraft } from '@/lib/draftStorage';
import {
  createDeferred,
  createMockGithubServer,
  installFetchMock,
  installMemoryStorage,
  MemoryStorage,
  MockGithubServer,
} from '@/test/mocks';

const initialState = useConfigStore.getState();
const resetStore = () => useConfigStore.setState(initialState, true);

const config = (name: string): ISiteConfig => ({
  ...DEFAULT_SITE_CONFIG,
  site: { ...DEFAULT_SITE_CONFIG.site, name },
});

let server: MockGithubServer;
let storage: { local: MemoryStorage; session: MemoryStorage };
let restoreFetch: (() => void) | null = null;

beforeEach(() => {
  storage = installMemoryStorage();
  resetStore();
});

afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
});

const startServer = (data: ISiteConfig) => {
  server = createMockGithubServer({ [configPath]: { sha: 'cfg-1', data } });
  restoreFetch = installFetchMock(server);
  return server;
};

test('config draft is restored after a reload', async () => {
  startServer(config('远程配置'));
  await useConfigStore.getState().initAdmin('token');
  assert.equal(useConfigStore.getState().siteConfig.site.name, '远程配置');

  useConfigStore.getState().saveConfig(config('本机配置'));
  assert.equal(useConfigStore.getState().dirty, true);

  resetStore();
  await useConfigStore.getState().initAdmin('token');

  const state = useConfigStore.getState();
  assert.equal(state.siteConfig.site.name, '本机配置');
  assert.equal(state.restoredDraft, true);
  assert.equal(state.baseSha, 'cfg-1');
});

test('config conflict keeps the local draft and locks push', async () => {
  startServer(config('远程'));
  await useConfigStore.getState().initAdmin('token');
  useConfigStore.getState().saveConfig(config('本机'));

  server.files[configPath] = { sha: 'cfg-2', data: config('其他设备') };
  const check = await useConfigStore.getState().checkRemote('token', { manual: true });
  assert.equal(check.result.status, 'conflict');

  const state = useConfigStore.getState();
  assert.equal(state.siteConfig.site.name, '本机');
  assert.equal(state.conflict?.remoteSha, 'cfg-2');

  const blocked = await useConfigStore.getState().pushToRemote('token');
  assert.equal(blocked.status, 'conflict');
  assert.equal(server.putCount, 0);

  const draft = loadDraft<ISiteConfig>(state.resourceKey, state.draftId, storage.local).draft;
  assert.ok(draft);
  assert.equal(draft?.draftData.site.name, '本机');
});

test('config push succeeds and moves the baseline to the returned SHA', async () => {
  startServer(config('远程'));
  await useConfigStore.getState().initAdmin('token');
  useConfigStore.getState().saveConfig(config('新配置'));

  const result = await useConfigStore.getState().pushToRemote('token');
  assert.equal(result.status, 'success');

  const state = useConfigStore.getState();
  assert.equal(state.dirty, false);
  assert.equal(state.baseSha, server.files[configPath].sha);
  assert.equal(
    (server.files[configPath].data as ISiteConfig).site.name,
    '新配置'
  );
});

test('a corrupted config draft is preserved until explicitly discarded', async () => {
  startServer(config('远程配置'));
  const resourceKey = useConfigStore.getState().resourceKey;
  const corruptedId = 'corrupt-config';
  const raw = '{not-json';
  storage.session.setItem(`${TAB_DRAFT_ID_PREFIX}${resourceKey}`, corruptedId);
  const corruptedKey = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:${corruptedId}`;
  storage.local.setItem(corruptedKey, raw);

  await useConfigStore.getState().initAdmin('token');

  const state = useConfigStore.getState();
  assert.equal(state.siteConfig.site.name, '远程配置');
  assert.equal(storage.local.getItem(corruptedKey), raw, 'corrupted draft is not deleted');
  assert.equal(state.corruptedDrafts.length, 1);
  assert.equal(state.corruptedDrafts[0]?.raw, raw);
  assert.notEqual(state.draftId, corruptedId, 'this tab moved to a fresh slot');

  const exported = JSON.parse(state.exportCorruptedDraftsText() ?? '[]') as Array<{
    corrupted?: boolean;
    raw?: string;
  }>;
  assert.equal(exported[0]?.raw, raw);

  state.discardCorruptedDrafts();
  assert.equal(storage.local.getItem(corruptedKey), null);
});

test('public config reads the deployed file, not the admin draft', async () => {
  server = createMockGithubServer(
    { [configPath]: { sha: 'cfg-1', data: config('GitHub 配置') } },
    { '/data/site-config.json': config('已部署配置') }
  );
  restoreFetch = installFetchMock(server);

  await useConfigStore.getState().refreshPublic();
  assert.equal(useConfigStore.getState().siteConfig.site.name, '已部署配置');

  await useConfigStore.getState().initAdmin('token');
  assert.equal(useConfigStore.getState().siteConfig.site.name, 'GitHub 配置');

  useConfigStore.getState().saveConfig(config('后台草稿'));
  await useConfigStore.getState().refreshPublic();
  assert.equal(useConfigStore.getState().siteConfig.site.name, '已部署配置');
});

test('A05 config edits made during a push stay dirty against the new baseline', async () => {
  startServer(config('远程'));
  await useConfigStore.getState().initAdmin('token');
  useConfigStore.getState().saveConfig(config('第一次修改'));

  const gate = createDeferred();
  const started = createDeferred();
  server.putGate = gate.promise;
  server.onPutStart = started.resolve;

  const pushPromise = useConfigStore.getState().pushToRemote('token');
  await started.promise;

  useConfigStore.getState().saveConfig(config('推送期间的新编辑'));
  gate.resolve();
  const result = await pushPromise;

  assert.equal(result.status, 'success');
  assert.equal(
    (server.files[configPath].data as ISiteConfig).site.name,
    '第一次修改',
    'the submitted snapshot was committed'
  );
  const state = useConfigStore.getState();
  assert.equal(state.siteConfig.site.name, '推送期间的新编辑');
  assert.equal(state.dirty, true, 'new edits still need a push');
  assert.equal(state.baseSha, server.files[configPath].sha);

  const draft = loadDraft<ISiteConfig>(state.resourceKey, state.draftId, storage.local).draft;
  assert.ok(draft);
  assert.equal(draft?.draftData.site.name, '推送期间的新编辑');
  assert.equal(draft?.baseData.site.name, '第一次修改');
  assert.equal(draft?.baseSha, server.files[configPath].sha);
});

test('A06 a config timeout after the commit is verified instead of blindly retried', async () => {
  startServer(config('远程'));
  await useConfigStore.getState().initAdmin('token');
  useConfigStore.getState().saveConfig(config('一次提交'));

  server.networkErrorAfterPut = true;
  const result = await useConfigStore.getState().pushToRemote('token');

  assert.equal(result.status, 'success');
  assert.equal(result.status === 'success' && result.verifiedAfterFailure, true);
  assert.equal(server.putCount, 1, 'no blind second write');
  assert.equal(useConfigStore.getState().dirty, false);
  assert.equal(useConfigStore.getState().baseSha, server.files[configPath].sha);
});

test('A07 a config init response cannot overwrite an edit made while it was pending', async () => {
  startServer(config('远程'));
  const gate = createDeferred();
  const started = createDeferred();
  server.getGate = gate.promise;
  server.onGetStart = started.resolve;

  const initPromise = useConfigStore.getState().initAdmin('token');
  await started.promise;

  useConfigStore.getState().saveConfig(config('初始化期间编辑'));
  gate.resolve();
  await initPromise;

  const state = useConfigStore.getState();
  assert.equal(state.siteConfig.site.name, '初始化期间编辑');
  assert.equal(state.revision, 1);
  assert.equal(state.dirty, true);
});

test('A10 a config storage failure is reported and never claims the draft was saved', async () => {
  startServer(config('远程'));
  await useConfigStore.getState().initAdmin('token');
  storage.local.failWrites = true;

  const saved = useConfigStore.getState().saveConfig(config('无法落盘'));
  const state = useConfigStore.getState();

  assert.equal(saved, false);
  assert.equal(state.dirty, true);
  assert.ok(state.draftIssue?.includes('存储'));
  const draft = loadDraft<ISiteConfig>(state.resourceKey, state.draftId, storage.local).draft;
  assert.equal(draft, null);
});

test('the old SITE_CONFIG payload is backed up and migrated as a draft', async () => {
  startServer(config('远程'));
  storage.local.setItem('SITE_CONFIG', JSON.stringify(config('旧本机配置')));
  storage.local.setItem('SITE_CONFIG_LAST_SYNC', new Date().toISOString());

  await useConfigStore.getState().initAdmin('token');
  const state = useConfigStore.getState();

  assert.equal(state.siteConfig.site.name, '旧本机配置');
  assert.equal(state.dirty, true);
  assert.equal(state.baseSha, 'cfg-1');
  assert.equal(storage.local.getItem('SITE_CONFIG'), null);
  assert.ok(
    storage.local.keys().some((key) => key.startsWith('navnext:legacy-backup:')),
    'raw legacy payload is recoverable'
  );
  assert.ok(
    storage.local.keys().some((key) => key.startsWith(DRAFT_PREFIX)),
    'migrated data is stored as a v2 draft'
  );
});

test('invalid remote config JSON fails loudly instead of becoming the default config', async () => {
  server = createMockGithubServer({ [configPath]: { sha: 'cfg-1', data: 'not-json' } });
  restoreFetch = installFetchMock(server);

  await useConfigStore.getState().initAdmin('token');
  const state = useConfigStore.getState();
  assert.equal(state.baselineReady, false);
  assert.equal(state.syncStatus, 'error');
  assert.deepEqual(state.siteConfig, DEFAULT_SITE_CONFIG);
});
