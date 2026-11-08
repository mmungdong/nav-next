import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useNavStore } from '@/stores/navStore';
import { dbPath } from '@/lib/config';
import { ICategory } from '@/types';
import { loadDraft, DRAFT_PREFIX, TAB_DRAFT_ID_PREFIX, removeDraft } from '@/lib/draftStorage';
import {
  createDeferred,
  createMockGithubServer,
  installFetchMock,
  installMemoryStorage,
  MemoryStorage,
  MockGithubServer,
} from '@/test/mocks';

const initialState = useNavStore.getState();
const resetStore = () => useNavStore.setState(initialState, true);

const categories = (title: string, siteCount = 1): ICategory[] => [
  {
    id: 1,
    title,
    icon: '🧭',
    nav: Array.from({ length: siteCount }, (_, index) => ({
      id: index + 1,
      name: `${title}-站点${index + 1}`,
      desc: '描述',
      url: `https://example.com/${index + 1}`,
    })),
  },
];

let server: MockGithubServer;
let storage: { local: MemoryStorage; session: MemoryStorage };
let restoreFetch: (() => void) | null = null;

const startServer = (
  data: unknown = categories('远程'),
  publicFiles: Record<string, unknown> = {}
) => {
  server = createMockGithubServer(
    { [dbPath]: { sha: 'sha-1', data } },
    publicFiles
  );
  restoreFetch = installFetchMock(server);
  return server;
};

beforeEach(() => {
  storage = installMemoryStorage();
  resetStore();
});

afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
});

const currentDraft = () => {
  const state = useNavStore.getState();
  return loadDraft<ICategory[]>(state.resourceKey, state.draftId, storage.local).draft;
};

test('A02 draft survives a reload and is not overwritten by the remote', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  assert.equal(useNavStore.getState().categories[0].title, '远程');

  const edited = categories('本机草稿');
  assert.equal(useNavStore.getState().saveCategories(edited), true);
  assert.equal(useNavStore.getState().dirty, true);

  resetStore();
  await useNavStore.getState().initAdmin('token');

  const state = useNavStore.getState();
  assert.equal(state.categories[0].title, '本机草稿');
  assert.equal(state.dirty, true);
  assert.equal(state.restoredDraft, true);
  assert.equal(state.baseSha, 'sha-1');
  assert.equal(server.putCount, 0);
});

test('A03 another device commit produces a recoverable conflict, never a silent overwrite', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  useNavStore.getState().saveCategories(categories('手机草稿'));

  // Device A commits a new version while device B still edits.
  server.files[dbPath] = { sha: 'sha-2', data: categories('电脑提交') };

  const check = await useNavStore.getState().checkRemote('token', { manual: true });
  assert.equal(check.result.status, 'conflict');

  const conflicted = useNavStore.getState();
  assert.equal(conflicted.categories[0].title, '手机草稿');
  assert.equal(conflicted.dirty, true);
  assert.equal(conflicted.conflict?.remoteSha, 'sha-2');
  assert.ok(currentDraft(), 'draft is still on disk');

  // Push is locked while the conflict is unresolved.
  const blocked = await useNavStore.getState().pushToRemote('token');
  assert.equal(blocked.status, 'conflict');
  assert.equal(server.putCount, 0);

  // Even a stale push that reaches GitHub is rejected by the SHA check.
  useNavStore.setState({ conflict: null });
  const stale = await useNavStore.getState().pushToRemote('token');
  assert.equal(stale.status, 'conflict');
  assert.equal(server.putCount, 1);
  assert.equal(server.files[dbPath].sha, 'sha-2');
  assert.equal(useNavStore.getState().categories[0].title, '手机草稿');
  assert.equal(useNavStore.getState().conflict?.remoteSha, 'sha-2');
  assert.ok(currentDraft(), 'draft survives the rejected push');
});

test('A03 adopting the remote clears the local draft only after backing it up', () => {
  useNavStore.setState({
    baselineReady: true,
    baseSha: 'sha-1',
    baseline: categories('远程'),
    categories: categories('本机'),
    dirty: true,
    conflict: {
      remoteSha: 'sha-2',
      remoteData: categories('远程2'),
      detectedAt: new Date().toISOString(),
    },
  });

  useNavStore.getState().adoptRemote();
  const state = useNavStore.getState();
  assert.equal(state.categories[0].title, '远程2');
  assert.equal(state.baseSha, 'sha-2');
  assert.equal(state.dirty, false);
  assert.equal(state.conflict, null);
  assert.ok(
    storage.local.keys().some((key) => key.startsWith('navnext:backup:v2:')),
    'local version is kept as a backup'
  );
});

type DiscardResult = { ok: boolean; message: string | null };
type DiscardAction = (options?: { discardWithoutBackup?: boolean }) => DiscardResult;

/** Calls an action whose result may not be implemented yet, so the assertion fails cleanly. */
const callDiscard = (action: () => void, options?: { discardWithoutBackup?: boolean }) =>
  (action as unknown as DiscardAction)(options) as DiscardResult | undefined;

const conflictedState = (title: string, draftId: string) =>
  useNavStore.setState({
    draftId,
    baselineReady: true,
    baseSha: 'sha-1',
    baseline: categories('远程'),
    categories: categories(title),
    dirty: true,
    draftIssue: null,
    conflict: {
      remoteSha: 'sha-2',
      remoteData: categories('远程2'),
      detectedAt: new Date().toISOString(),
    },
  });

const draftKeyFor = (draftId: string) => {
  const { resourceKey } = useNavStore.getState();
  return `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:${draftId}`;
};

test('A03b adoptRemote keeps the draft and the conflict when the backup cannot be written', () => {
  conflictedState('本机未推送', 'tab-1');
  const draftKey = draftKeyFor('tab-1');
  storage.local.setItem(draftKey, '{"pending":true}');

  storage.local.failWrites = true;
  const result = callDiscard(useNavStore.getState().adoptRemote);
  storage.local.failWrites = false;

  assert.equal(result?.ok, false, 'adopting is refused when the backup fails');
  assert.ok(result?.message, 'the user gets the reason and the next step');
  assert.equal(useNavStore.getState().categories[0].title, '本机未推送');
  assert.ok(useNavStore.getState().conflict, 'conflict stays open');
  assert.equal(storage.local.getItem(draftKey), '{"pending":true}', 'draft is not deleted');
  assert.ok(useNavStore.getState().draftIssue, 'the storage problem is surfaced');
});

test('A03c adoptRemote drops the backup only after explicit confirmation', () => {
  conflictedState('本机未推送', 'tab-2');
  const draftKey = draftKeyFor('tab-2');
  storage.local.setItem(draftKey, '{"pending":true}');

  storage.local.failWrites = true;
  const result = callDiscard(useNavStore.getState().adoptRemote, { discardWithoutBackup: true });
  storage.local.failWrites = false;

  assert.equal(result?.ok, true);
  assert.equal(useNavStore.getState().categories[0].title, '远程2');
  assert.equal(useNavStore.getState().conflict, null);
  assert.equal(storage.local.getItem(draftKey), null);
});

test('A03d adoptRemote needs no backup when there are no local changes', () => {
  conflictedState('远程', 'tab-3');
  useNavStore.setState({ dirty: false });

  storage.local.failWrites = true;
  const result = callDiscard(useNavStore.getState().adoptRemote);
  storage.local.failWrites = false;

  assert.equal(result?.ok, true);
  assert.equal(useNavStore.getState().categories[0].title, '远程2');
});

test('A03e discardLocal keeps the dirty state when the backup cannot be written', () => {
  conflictedState('本机未推送', 'tab-4');
  useNavStore.setState({ conflict: null });
  const draftKey = draftKeyFor('tab-4');
  storage.local.setItem(draftKey, '{"pending":true}');

  storage.local.failWrites = true;
  const result = callDiscard(useNavStore.getState().discardLocal);
  storage.local.failWrites = false;

  assert.equal(result?.ok, false);
  assert.equal(useNavStore.getState().categories[0].title, '本机未推送');
  assert.equal(useNavStore.getState().dirty, true);
  assert.equal(storage.local.getItem(draftKey), '{"pending":true}');
});

test('A04 overwrite uses the reviewed remote SHA and conflicts again if remote moves', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  useNavStore.getState().saveCategories(categories('本机'));
  server.files[dbPath] = { sha: 'sha-2', data: categories('别人的修改') };
  await useNavStore.getState().checkRemote('token', { manual: true });
  assert.equal(useNavStore.getState().conflict?.remoteSha, 'sha-2');

  // Remote changes once more between the review and the overwrite.
  server.beforePut = () => {
    server.files[dbPath] = { sha: 'sha-3', data: categories('第三次修改') };
  };

  const result = await useNavStore.getState().overwriteRemote('token');
  assert.equal(result.status, 'conflict');
  assert.equal(server.files[dbPath].sha, 'sha-3');
  assert.equal(useNavStore.getState().conflict?.remoteSha, 'sha-3');
  assert.equal(useNavStore.getState().categories[0].title, '本机');
});

test('A05 edits made during a push stay dirty against the new baseline', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  useNavStore.getState().saveCategories(categories('第一次修改'));

  const gate = createDeferred();
  const started = createDeferred();
  server.putGate = gate.promise;
  server.onPutStart = started.resolve;

  const pushPromise = useNavStore.getState().pushToRemote('token');
  await started.promise;

  // The user keeps editing while the PUT is in flight.
  useNavStore.getState().saveCategories(categories('推送期间的新编辑'));
  gate.resolve();
  const result = await pushPromise;

  assert.equal(result.status, 'success');
  assert.equal(
    (server.files[dbPath].data as ICategory[])[0].title,
    '第一次修改',
    'the submitted snapshot was committed'
  );
  const state = useNavStore.getState();
  assert.equal(state.categories[0].title, '推送期间的新编辑');
  assert.equal(state.dirty, true, 'new edits still need a push');
  assert.equal(state.baseSha, server.files[dbPath].sha);

  const draft = currentDraft();
  assert.ok(draft);
  assert.equal(draft?.draftData[0].title, '推送期间的新编辑');
  assert.equal(draft?.baseData[0].title, '第一次修改');
  assert.equal(draft?.baseSha, server.files[dbPath].sha);
});

test('A06 a timeout after the commit is verified instead of blindly retried', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  useNavStore.getState().saveCategories(categories('一次提交'));

  server.networkErrorAfterPut = true;
  const result = await useNavStore.getState().pushToRemote('token');

  assert.equal(result.status, 'success');
  assert.equal(result.status === 'success' && result.verifiedAfterFailure, true);
  assert.equal(server.putCount, 1, 'no blind second write');
  assert.equal(useNavStore.getState().dirty, false);
  assert.equal(useNavStore.getState().baseSha, server.files[dbPath].sha);
});

test('A06b a timeout whose re-read shows a moved remote is reported as a conflict', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  useNavStore.getState().saveCategories(categories('本机草稿'));

  // The connection drops before the write lands, and another device committed
  // meanwhile. Retrying blindly would be wrong: the user must resolve it.
  server.beforePut = () => {
    server.files[dbPath] = { sha: 'sha-2', data: categories('另一台设备的提交') };
  };
  server.networkErrorBeforeWrite = true;

  const result = await useNavStore.getState().pushToRemote('token');
  const state = useNavStore.getState();

  assert.equal(result.status, 'conflict');
  assert.equal(state.syncStatus, 'conflict');
  assert.equal(state.conflict?.remoteSha, 'sha-2');
  assert.equal(state.conflict?.remoteData[0].title, '另一台设备的提交');
  assert.equal(state.categories[0].title, '本机草稿', 'local edits are untouched');
  assert.ok(currentDraft(), 'draft survives for conflict resolution');

  // The standard conflict actions now work on this state.
  await useNavStore.getState().overwriteRemote('token');
  assert.equal(server.files[dbPath].sha.startsWith('sha-'), true);
  assert.equal((server.files[dbPath].data as ICategory[])[0].title, '本机草稿');
});

test('A07 an init response cannot overwrite an edit made while it was pending', async () => {
  startServer(categories('远程'));
  const gate = createDeferred();
  const started = createDeferred();
  server.getGate = gate.promise;
  server.onGetStart = started.resolve;

  const initPromise = useNavStore.getState().initAdmin('token');
  await started.promise;

  useNavStore.getState().saveCategories(categories('初始化期间编辑'));
  gate.resolve();
  await initPromise;

  const state = useNavStore.getState();
  assert.equal(state.categories[0].title, '初始化期间编辑');
  assert.equal(state.revision, 1);
  assert.equal(state.dirty, true);
  assert.equal(state.loading, false);
  assert.notEqual(state.syncStatus, 'loading', 'the race path must not leave the admin loading');
});

test('A10 storage failure is reported and never claims the draft was saved', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  storage.local.failWrites = true;

  const saved = useNavStore.getState().saveCategories(categories('无法落盘'));
  const state = useNavStore.getState();

  assert.equal(saved, false);
  assert.equal(state.dirty, true);
  assert.ok(state.draftIssue?.includes('存储'));
  assert.equal(currentDraft(), null);
});

test('A10b a corrupted draft is preserved, exported and only removed on explicit discard', async () => {
  startServer(categories('远程'));
  const resourceKey = useNavStore.getState().resourceKey;
  const corruptedId = 'corrupt-tab';
  const raw = '{"schemaVersion":2,"resourceKey":"broken';
  storage.session.setItem(`${TAB_DRAFT_ID_PREFIX}${resourceKey}`, corruptedId);
  const corruptedKey = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:${corruptedId}`;
  storage.local.setItem(corruptedKey, raw);

  await useNavStore.getState().initAdmin('token');

  const state = useNavStore.getState();
  assert.equal(state.categories[0].title, '远程');
  assert.equal(storage.local.getItem(corruptedKey), raw, 'corrupted draft is not deleted');
  assert.equal(state.corruptedDrafts.length, 1);
  assert.equal(state.corruptedDrafts[0]?.raw, raw);
  assert.notEqual(state.draftId, corruptedId, 'this tab moved to a fresh slot');
  assert.match(state.draftIssue ?? '', /已保留/);

  const exported = JSON.parse(state.exportCorruptedDraftsText() ?? '[]') as Array<{
    corrupted?: boolean;
    raw?: string;
  }>;
  assert.equal(exported[0]?.raw, raw);
  assert.equal(exported[0]?.corrupted, true);

  // A later edit must not overwrite the damaged key.
  state.saveCategories(categories('新改动'));
  assert.equal(storage.local.getItem(corruptedKey), raw);

  state.discardCorruptedDrafts();
  assert.equal(storage.local.getItem(corruptedKey), null);
  assert.equal(useNavStore.getState().corruptedDrafts.length, 0);
});

test('A01 ownVisible is removed while every site and field is preserved', async () => {
  const remoteWithPrivate = [
    {
      id: 1,
      title: '分类',
      icon: 'x',
      nav: [
        { id: 1, name: '公开', desc: '', url: 'https://a.example', ownVisible: false, tags: ['t'] },
        { id: 2, name: '旧私有', desc: '', url: 'https://b.example', ownVisible: true, rate: 4 },
      ],
    },
  ];
  startServer(remoteWithPrivate);
  await useNavStore.getState().initAdmin('token');

  const state = useNavStore.getState();
  assert.equal(state.categories[0].nav.length, 2);
  assert.equal('ownVisible' in state.categories[0].nav[0], false);
  assert.deepEqual(state.categories[0].nav[1].tags, undefined);
  assert.equal(state.categories[0].nav[1].rate, 4);

  useNavStore.getState().saveCategories([
    { ...state.categories[0], nav: [...state.categories[0].nav] },
  ]);
  const result = useNavStore.getState().pushToRemote('token');
  assert.equal((await result).status, 'success');
  const committed = JSON.stringify(server.files[dbPath].data);
  assert.equal(committed.includes('ownVisible'), false);
  assert.equal((server.files[dbPath].data as typeof remoteWithPrivate)[0].nav.length, 2);
});

test('A16/A15 public reads use the deployed file and never the admin draft', async () => {
  startServer(categories('GitHub 最新'), {
    '/data/db.json': categories('已部署快照'),
  });

  await useNavStore.getState().refreshPublic();
  assert.equal(useNavStore.getState().categories[0].title, '已部署快照');

  await useNavStore.getState().initAdmin('token');
  assert.equal(useNavStore.getState().categories[0].title, 'GitHub 最新');

  useNavStore.getState().saveCategories(categories('后台草稿'));
  await useNavStore.getState().refreshPublic();
  assert.equal(useNavStore.getState().categories[0].title, '已部署快照');
});

test('invalid remote JSON fails loudly instead of becoming an empty baseline', async () => {
  server = createMockGithubServer({ [dbPath]: { sha: 'sha-1', data: 'not-json' } });
  restoreFetch = installFetchMock(server);

  await useNavStore.getState().initAdmin('token');
  const state = useNavStore.getState();
  assert.equal(state.baselineReady, false);
  assert.equal(state.syncStatus, 'error');
  assert.equal(state.categories.length, 0);
});

test('invalid local data is rejected before any write', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');

  useNavStore.setState({
    categories: [
      {
        id: 1,
        title: '分类',
        nav: [{ id: 1, name: '', desc: '', url: 'javascript:alert(1)' }],
      },
    ] as ICategory[],
  });
  const result = await useNavStore.getState().pushToRemote('token');
  assert.equal(result.status, 'invalid_data');
  assert.equal(server.putCount, 0);
  assert.equal(server.files[dbPath].sha, 'sha-1');
});

test('the old NAV_CATEGORIES payload is backed up and migrated as a draft', async () => {
  startServer(categories('远程'));
  storage.local.setItem('NAV_CATEGORIES', JSON.stringify(categories('旧本机')));
  storage.local.setItem('NAV_LAST_SYNC', new Date().toISOString());

  await useNavStore.getState().initAdmin('token');
  const state = useNavStore.getState();

  assert.equal(state.categories[0].title, '旧本机');
  assert.equal(state.dirty, true);
  assert.equal(state.baseSha, 'sha-1');
  assert.equal(storage.local.getItem('NAV_CATEGORIES'), null);
  assert.ok(
    storage.local.keys().some((key) => key.startsWith('navnext:legacy-backup:')),
    'raw legacy payload is recoverable'
  );
  assert.ok(
    storage.local.keys().some((key) => key.startsWith(DRAFT_PREFIX)),
    'migrated data is stored as a v2 draft'
  );
});

test('A10 an exported draft can be re-imported locally without touching the remote', async () => {
  startServer(categories('远程'));
  await useNavStore.getState().initAdmin('token');
  useNavStore.getState().saveCategories(categories('导出后的草稿'));

  const exported = useNavStore.getState().exportDraftText();
  assert.ok(exported);
  assert.equal(exported?.includes('token'), false, 'exports never include credentials');

  // Simulate a fresh tab with no local draft, then restore from the file.
  const before = useNavStore.getState();
  removeDraft(before.resourceKey, before.draftId, storage.local);
  resetStore();
  await useNavStore.getState().initAdmin('token');
  assert.equal(useNavStore.getState().categories[0].title, '远程');

  const imported = useNavStore.getState().importDraftText(exported as string);
  assert.equal(imported.ok, true);
  const state = useNavStore.getState();
  assert.equal(state.categories[0].title, '导出后的草稿');
  assert.equal(state.dirty, true);
  assert.equal(state.baseSha, 'sha-1');
  assert.equal(server.putCount, 0, 'import never pushes on its own');

  const wrongResource = useNavStore.getState().importDraftText(
    JSON.stringify({ ...JSON.parse(exported as string), resourceKey: 'someone/else@main:x#y' })
  );
  assert.equal(wrongResource.ok, false);
});
