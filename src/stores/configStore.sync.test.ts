import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SITE_CONFIG, useConfigStore } from '@/stores/configStore';
import { configPath } from '@/lib/config';
import { ISiteConfig } from '@/types';
import { loadDraft } from '@/lib/draftStorage';
import {
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
