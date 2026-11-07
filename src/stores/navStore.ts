import { create } from 'zustand';
import { ICategory, ILegacyTag, IWebsite } from '@/types';
import { getFileContent, updateFileContent, GithubApiError } from '@/lib/githubApi';
import { owner, repo, branch, dbPath } from '@/lib/config';
import { canonicalEqual } from '@/lib/codec';
import {
  formatIssues,
  normalizeCategories,
  validateCategories,
} from '@/lib/dataValidation';
import {
  buildDraft,
  isDirty,
  pushResource,
  readValidatedRemote,
  ResourceAdapter,
} from '@/lib/syncEngine';
import {
  buildResourceKey,
  DraftEnvelope,
  DraftSummary,
  PushStatus,
  RemoteCheckOutcome,
  SyncConflict,
  SyncFailure,
  SyncResult,
  SyncStatus,
} from '@/lib/syncTypes';
import {
  backupLegacyValue,
  exportDraft,
  getOrCreateTabDraftId,
  listDrafts,
  loadDraft,
  parseDraftKey,
  parseImportedDraft,
  readLegacyValue,
  removeDraft,
  removeStorageKeys,
  saveBackup,
  saveDraft,
} from '@/lib/draftStorage';

// ---- diff types (kept public for the existing admin diff UI) ----

export interface CategoryDiff {
  category: ICategory;
  changes: {
    title?: { from: string; to: string };
    icon?: { from: string; to: string };
  };
}

export interface WebsiteDiff {
  categoryTitle: string;
  website: IWebsite;
}

export interface WebsiteChange {
  categoryTitle: string;
  websiteId: number;
  changes: {
    name?: { from: string; to: string };
    desc?: { from: string; to: string };
    url?: { from: string; to: string };
    icon?: { from: string; to: string };
    tags?: { from: Array<string | ILegacyTag>; to: Array<string | ILegacyTag> };
    rate?: { from: number; to: number };
    top?: { from: boolean; to: boolean };
    topTypes?: { from: number[]; to: number[] };
    index?: { from: number | null; to: number | null };
  };
}

export interface WebsiteOrderChange {
  categoryTitle: string;
  websiteIds: number[];
}

export interface DataDiffResult {
  categoriesAdded: ICategory[];
  categoriesRemoved: ICategory[];
  categoriesModified: CategoryDiff[];
  websitesAdded: WebsiteDiff[];
  websitesRemoved: WebsiteDiff[];
  websitesModified: WebsiteChange[];
  categoriesReordered: boolean;
  websitesMoved: WebsiteDiff[];
  websitesReordered: WebsiteOrderChange[];
}

export type { RemoteCheckOutcome };

interface NavState {
  categories: ICategory[];
  loading: boolean;
  dirty: boolean;
  baseline: ICategory[];
  /** Kept as an alias of baseline so existing admin components keep working. */
  remoteSnapshot: ICategory[];
  baseSha: string | null;
  baselineReady: boolean;
  revision: number;
  draftId: string;
  resourceKey: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  conflict: SyncConflict<ICategory[]> | null;
  pushStatus: PushStatus;
  lastResult: SyncResult | null;
  lastCheckedAt: number | null;
  lastSyncAt: string | null;
  draftIssue: string | null;
  restoredDraft: boolean;
  legacyBackupKeys: string[];
  peerNotice: string | null;
  recoverableDrafts: DraftSummary[];
  initRequestId: number;
  publicError: string | null;
  lastPublicCheckAt: number | null;

  fetchCategories: (isAdmin?: boolean) => Promise<void>;
  refreshPublic: () => Promise<void>;
  initAdmin: (githubToken: string) => Promise<void>;
  checkRemote: (githubToken: string, options?: { manual?: boolean }) => Promise<RemoteCheckOutcome>;
  saveCategories: (categories: ICategory[]) => boolean;
  pushToRemote: (githubToken: string) => Promise<SyncResult>;
  adoptRemote: () => void;
  overwriteRemote: (githubToken: string) => Promise<SyncResult>;
  discardLocal: () => void;
  exportDraftText: () => string | null;
  importDraftText: (raw: string) => { ok: boolean; error: string | null };
  dismissPeerNotice: () => void;
  restoreDraftById: (draftId: string) => boolean;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
  hasRemoteChanged: (githubToken: string) => Promise<boolean>;
  compareData: (localData: ICategory[], remoteData: ICategory[]) => DataDiffResult;
}

const PUBLIC_CACHE_KEY = 'navnext:public:categories:v2';
const LAST_SYNC_KEY = 'navnext:lastSync:nav';
const LEGACY_KEYS = ['NAV_CATEGORIES', 'NAV_LAST_SYNC'];
const PUBLIC_THROTTLE_MS = 60_000;

const RESOURCE_KEY = buildResourceKey({
  owner,
  repo,
  branch,
  path: dbPath,
  userId: owner,
});

let publicRequestSeq = 0;
let publicInFlight: Promise<void> | null = null;
let publicStarted = false;
let checkInFlight: Promise<RemoteCheckOutcome> | null = null;
let storageListenerInstalled = false;

const safeGet = (key: string): string | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): boolean => {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const readPublicCache = (): ICategory[] | null => {
  const raw = safeGet(PUBLIC_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? normalizeCategories(parsed) : null;
  } catch {
    return null;
  }
};

const savePublicCache = (data: ICategory[]): void => {
  safeSet(PUBLIC_CACHE_KEY, JSON.stringify(data));
  safeSet(`${PUBLIC_CACHE_KEY}:checkedAt`, new Date().toISOString());
};

const errorResult = (error: unknown): SyncFailure => {
  if (error instanceof GithubApiError) {
    return {
      status: error.code,
      message: error.message,
      httpStatus: error.httpStatus,
    };
  }
  return {
    status: 'unknown_error',
    message: (error as Error)?.message ?? '未知错误',
  };
};

const adapter: ResourceAdapter<ICategory[]> = {
  readRemote: async (token) => {
    try {
      const file = await getFileContent(token, owner, repo, dbPath, branch);
      try {
        return { ok: true, file: { sha: file.sha, data: JSON.parse(file.content) } };
      } catch {
        return {
          ok: false,
          result: {
            status: 'invalid_data',
            message: '远程 db 文件不是合法 JSON，未覆盖本机基线',
            remoteSha: file.sha,
          },
        };
      }
    } catch (error) {
      return { ok: false, result: errorResult(error) };
    }
  },
  writeRemote: async (token, data, baseSha, message) => {
    try {
      const result = await updateFileContent(
        token,
        owner,
        repo,
        dbPath,
        JSON.stringify(data, null, 2),
        message,
        branch,
        baseSha
      );
      return { ok: true, sha: result.sha };
    } catch (error) {
      return { ok: false, result: errorResult(error) };
    }
  },
  validate: validateCategories,
};

const arrEqual = (a?: string[] | number[], b?: string[] | number[]) => {
  const la = a ?? [];
  const lb = b ?? [];
  return la.length === lb.length && la.every((value, index) => value === lb[index]);
};

const orderedIds = (items: { id: number }[]): number[] => items.map((item) => item.id);

const commonOrderChanged = (a: number[], b: number[]): boolean => {
  const setB = new Set(b);
  const filteredA = a.filter((id) => setB.has(id));
  const setA = new Set(a);
  const filteredB = b.filter((id) => setA.has(id));
  return filteredA.join(',') !== filteredB.join(',');
};

const buildWebsiteChanges = (
  local: IWebsite,
  remote: IWebsite
): WebsiteChange['changes'] => {
  const changes: WebsiteChange['changes'] = {};
  if (local.name !== remote.name) changes.name = { from: remote.name, to: local.name };
  if (local.desc !== remote.desc) changes.desc = { from: remote.desc, to: local.desc };
  if (local.url !== remote.url) changes.url = { from: remote.url, to: local.url };
  if (local.icon !== remote.icon)
    changes.icon = { from: remote.icon ?? '', to: local.icon ?? '' };
  if (!canonicalEqual(local.tags ?? [], remote.tags ?? []))
    changes.tags = { from: remote.tags ?? [], to: local.tags ?? [] };
  if (local.rate !== remote.rate)
    changes.rate = { from: remote.rate ?? 0, to: local.rate ?? 0 };
  if (local.top !== remote.top)
    changes.top = { from: remote.top ?? false, to: local.top ?? false };
  if (!arrEqual(local.topTypes, remote.topTypes))
    changes.topTypes = { from: remote.topTypes ?? [], to: local.topTypes ?? [] };
  if ((local.index ?? null) !== (remote.index ?? null))
    changes.index = { from: remote.index ?? null, to: local.index ?? null };
  return changes;
};

const createDraftEnvelope = (
  state: NavState,
  draftData: ICategory[],
  revision: number,
  baseSha = state.baseSha,
  baseData = state.baseline
): DraftEnvelope<ICategory[]> | null =>
  buildDraft({
    resourceKey: state.resourceKey,
    draftId: state.draftId,
    baseSha: baseSha ?? '',
    baseData,
    draftData,
    revision,
  });

export const useNavStore = create<NavState>((set, get) => {
  const describeDraftProblem = (problem: string | null): string | null => {
    if (problem === 'quota') return '本机存储空间不足，改动仅在当前页面内，刷新会丢失';
    if (problem === 'unavailable') return '浏览器禁用了本机存储，改动仅在当前页面内，请导出草稿';
    if (problem === 'corrupted') return '本机草稿数据损坏，未自动覆盖远程；可导出或重新拉取';
    return null;
  };

  // Other tabs get their own draftId, so a storage event never replaces this
  // page's content; it only surfaces that a peer draft/sync result exists.
  const installStorageListener = (): void => {
    if (typeof window === 'undefined' || storageListenerInstalled) return;
    storageListenerInstalled = true;
    window.addEventListener('storage', (event) => {
      if (!event.key) return;
      const parsed = parseDraftKey(event.key);
      if (!parsed || parsed.resourceKey !== get().resourceKey) return;
      if (parsed.draftId === get().draftId) return;
      set({
        peerNotice: event.newValue
          ? '另一标签页保存了本资源的草稿；本页内容未被替换'
          : '另一标签页已丢弃或提交了本资源的草稿',
      });
    });
  };

  const persistCurrentDraft = (): boolean => {
    const state = get();
    if (!state.baselineReady || !state.baseSha) return false;
    const envelope = createDraftEnvelope(state, state.categories, state.revision);
    if (!envelope) return false;
    if (!state.dirty) {
      removeDraft(state.resourceKey, state.draftId);
      return true;
    }
    const saved = saveDraft(envelope);
    set({ draftIssue: saved.ok ? null : describeDraftProblem(saved.problem) });
    return saved.ok;
  };

  const applyRemoteFile = (
    data: ICategory[],
    sha: string,
    revision: number
  ): void => {
    const state = get();
    set({
      categories: data,
      baseline: data,
      remoteSnapshot: data,
      baseSha: sha,
      baselineReady: true,
      dirty: false,
      revision,
      conflict: null,
      syncStatus: 'ready',
      syncError: null,
      loading: false,
    });
    if (state.draftId) removeDraft(state.resourceKey, state.draftId);
  };

  const applyDraft = (
    draft: DraftEnvelope<ICategory[]>,
    extra: Partial<NavState> = {}
  ): void => {
    const data = normalizeCategories(draft.draftData);
    const base = normalizeCategories(draft.baseData);
    set({
      categories: data,
      baseline: base,
      remoteSnapshot: base,
      baseSha: draft.baseSha || null,
      baselineReady: Boolean(draft.baseSha),
      revision: draft.revision,
      dirty: isDirty(data, base),
      draftId: draft.draftId,
      loading: false,
      ...extra,
    });
  };

  const ensureDraftId = (): string => {
    const state = get();
    if (state.draftId) return state.draftId;
    const draftId = getOrCreateTabDraftId(state.resourceKey);
    set({ draftId });
    return draftId;
  };

  const migrateLegacy = (
    draftId: string,
    remoteData: ICategory[],
    remoteSha: string
  ): { draft: DraftEnvelope<ICategory[]> | null; backupKey: string | null } => {
    const legacy = readLegacyValue(LEGACY_KEYS);
    if (!legacy) return { draft: null, backupKey: null };

    const backupKey = backupLegacyValue(legacy.sourceKey, legacy.raw);
    let legacyData: ICategory[] | null = null;
    try {
      const validation = validateCategories(JSON.parse(legacy.raw));
      if (validation.ok && validation.value) legacyData = validation.value;
    } catch {
      legacyData = null;
    }

    if (!legacyData) {
      // Corrupt old payload: keep the raw backup, stop using the old key.
      removeStorageKeys(LEGACY_KEYS);
      return { draft: null, backupKey };
    }

    if (canonicalEqual(legacyData, remoteData)) {
      removeStorageKeys(LEGACY_KEYS);
      return { draft: null, backupKey };
    }

    const draft = buildDraft({
      resourceKey: RESOURCE_KEY,
      draftId,
      baseSha: remoteSha,
      baseData: remoteData,
      draftData: legacyData,
      revision: 1,
    });
    removeStorageKeys(LEGACY_KEYS);
    return { draft, backupKey };
  };

  const fetchPublic = async (force: boolean): Promise<void> => {
    const state = get();
    if (
      !force &&
      state.lastPublicCheckAt &&
      Date.now() - state.lastPublicCheckAt < PUBLIC_THROTTLE_MS
    ) {
      return;
    }
    if (publicInFlight) return publicInFlight;

    const seq = (publicRequestSeq += 1);
    publicInFlight = (async () => {
      try {
        const response = await fetch('/data/db.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = (await response.json()) as unknown;
        const validation = validateCategories(raw);
        if (!validation.ok || !validation.value) {
          throw new Error(`数据校验失败：${formatIssues(validation.issues)}`);
        }
        if (seq !== publicRequestSeq) return;
        savePublicCache(validation.value);
        set({
          categories: validation.value,
          loading: false,
          publicError: null,
          lastPublicCheckAt: Date.now(),
        });
      } catch (error) {
        if (seq !== publicRequestSeq) return;
        set({
          loading: false,
          publicError: (error as Error).message,
          lastPublicCheckAt: Date.now(),
        });
      } finally {
        publicInFlight = null;
      }
    })();
    return publicInFlight;
  };

  return {
    categories: [],
    loading: true,
    dirty: false,
    baseline: [],
    remoteSnapshot: [],
    baseSha: null,
    baselineReady: false,
    revision: 0,
    draftId: '',
    resourceKey: RESOURCE_KEY,
    syncStatus: 'idle',
    syncError: null,
    conflict: null,
    pushStatus: 'idle',
    lastResult: null,
    lastCheckedAt: null,
    lastSyncAt: null,
    draftIssue: null,
    restoredDraft: false,
    legacyBackupKeys: [],
    peerNotice: null,
    recoverableDrafts: [],
    initRequestId: 0,
    publicError: null,
    lastPublicCheckAt: null,

    fetchCategories: async (isAdmin = false) => {
      if (isAdmin) {
        if (get().baselineReady) return;
        const draftId = ensureDraftId();
        const loaded = loadDraft<ICategory[]>(get().resourceKey, draftId);
        if (loaded.draft) applyDraft(loaded.draft);
        return;
      }

      const cached = readPublicCache();
      if (cached) set({ categories: cached, loading: false });
      const force = !publicStarted;
      publicStarted = true;
      await fetchPublic(force);
    },

    refreshPublic: async () => {
      await fetchPublic(true);
    },

    initAdmin: async (githubToken: string) => {
      installStorageListener();
      const draftId = ensureDraftId();
      const requestId = get().initRequestId + 1;
      const startedRevision = get().revision;
      set({
        initRequestId: requestId,
        loading: true,
        syncStatus: 'loading',
        syncError: null,
        publicError: null,
      });

      const loaded = loadDraft<ICategory[]>(get().resourceKey, draftId);
      const draftProblem = describeDraftProblem(loaded.problem);
      let draft = loaded.draft;
      let legacyBackupKeys: string[] = [];

      // A fresh browser session gets a new tab draft id, so older drafts must
      // stay discoverable instead of being orphaned in localStorage.
      const siblings = listDrafts<ICategory[]>(get().resourceKey)
        .filter((item) => item.draftId !== draftId)
        .map((item) => ({
          draftId: item.draftId,
          revision: item.revision,
          updatedAt: item.updatedAt,
        }));
      set({ recoverableDrafts: siblings });

      const remote = await readValidatedRemote(adapter, githubToken);

      // Any newer init call, or a local edit made while the request was in
      // flight, wins over this response.
      if (get().initRequestId !== requestId) return;
      if (get().revision !== startedRevision) {
        // A local edit arrived while the request was in flight; keep it.
        set({ loading: false });
        return;
      }

      if (!remote.ok) {
        if (draft) {
          applyDraft(draft, {
            syncStatus: 'offline',
            syncError: remote.result.message,
            draftIssue: draftProblem,
            restoredDraft: true,
          });
          return;
        }
        set({
          loading: false,
          syncStatus:
            remote.result.status === 'network_error' || remote.result.status === 'timeout'
              ? 'offline'
              : 'error',
          syncError: remote.result.message,
        });
        return;
      }

      const remoteFile = remote.file;

      if (!draft) {
        const migrated = migrateLegacy(draftId, remoteFile.data, remoteFile.sha);
        if (migrated.draft) {
          draft = migrated.draft;
          const saved = saveDraft(migrated.draft);
          if (!saved.ok) {
            // Keep the data in memory even when storage refuses it.
            set({ draftIssue: describeDraftProblem(saved.problem) });
          }
        }
        if (migrated.backupKey) legacyBackupKeys = [migrated.backupKey];
      }

      if (!draft) {
        applyRemoteFile(remoteFile.data, remoteFile.sha, get().revision);
        set({
          syncStatus: 'ready',
          syncError: null,
          draftIssue: draftProblem,
          restoredDraft: false,
          legacyBackupKeys,
        });
        return;
      }

      if (draft.baseSha === remoteFile.sha) {
        applyDraft(draft, {
          syncStatus: 'ready',
          syncError: null,
          draftIssue: draftProblem,
          restoredDraft: true,
          legacyBackupKeys,
        });
        return;
      }

      if (canonicalEqual(draft.draftData, remoteFile.data)) {
        applyRemoteFile(remoteFile.data, remoteFile.sha, draft.revision);
        set({
          syncStatus: 'ready',
          syncError: null,
          draftIssue: draftProblem,
          restoredDraft: false,
          legacyBackupKeys,
        });
        return;
      }

      if (canonicalEqual(draft.baseData, remoteFile.data)) {
        // Content is identical to the old base; only the file hash differed.
        applyDraft(
          { ...draft, baseSha: remoteFile.sha, baseData: remoteFile.data },
          {
            syncStatus: 'ready',
            syncError: null,
            draftIssue: draftProblem,
            restoredDraft: true,
            legacyBackupKeys,
          }
        );
        return;
      }

      applyDraft(draft, {
        syncStatus: 'conflict',
        syncError: '远程数据已被其他设备更新，本机草稿保留，请选择版本',
        conflict: {
          remoteSha: remoteFile.sha,
          remoteData: remoteFile.data,
          detectedAt: new Date().toISOString(),
        },
        draftIssue: draftProblem,
        restoredDraft: true,
        legacyBackupKeys,
      });
    },

    checkRemote: async (githubToken, options = {}) => {
      const state = get();
      if (!state.baselineReady || !state.baseSha) {
        return {
          checked: false,
          remoteChanged: false,
          result: {
            status: 'invalid_data',
            message: '尚未取得远程基线，无法检查更新',
          },
        };
      }
      if (
        !options.manual &&
        state.lastCheckedAt &&
        Date.now() - state.lastCheckedAt < PUBLIC_THROTTLE_MS
      ) {
        return {
          checked: false,
          remoteChanged: false,
          result: { status: 'success', sha: state.baseSha },
        };
      }
      if (checkInFlight) return checkInFlight;

      checkInFlight = (async (): Promise<RemoteCheckOutcome> => {
        const remote = await readValidatedRemote(adapter, githubToken);
        const current = get();
        set({ lastCheckedAt: Date.now() });

        if (!remote.ok) {
          set({
            syncError: remote.result.message,
            syncStatus:
              remote.result.status === 'network_error' || remote.result.status === 'timeout'
                ? 'offline'
                : 'error',
          });
          return { checked: true, remoteChanged: false, result: remote.result };
        }

        const file = remote.file;
        if (file.sha === current.baseSha) {
          if (current.syncStatus === 'offline') set({ syncStatus: 'ready', syncError: null });
          return {
            checked: true,
            remoteChanged: false,
            result: { status: 'success', sha: file.sha },
          };
        }

        if (!current.dirty) {
          applyRemoteFile(file.data, file.sha, current.revision);
          return {
            checked: true,
            remoteChanged: true,
            result: { status: 'success', sha: file.sha },
          };
        }

        if (canonicalEqual(current.categories, file.data)) {
          set({
            baseline: file.data,
            remoteSnapshot: file.data,
            baseSha: file.sha,
            dirty: false,
            conflict: null,
            syncStatus: 'ready',
            syncError: null,
          });
          removeDraft(current.resourceKey, current.draftId);
          return {
            checked: true,
            remoteChanged: true,
            result: { status: 'success', sha: file.sha },
          };
        }

        set({
          conflict: {
            remoteSha: file.sha,
            remoteData: file.data,
            detectedAt: new Date().toISOString(),
          },
          syncStatus: 'conflict',
          syncError: '远程已更新，本机有未推送的修改',
        });
        return {
          checked: true,
          remoteChanged: true,
          result: {
            status: 'conflict',
            message: '远程已更新，本机有未推送的修改',
            remoteSha: file.sha,
            remoteData: file.data,
          },
        };
      })().finally(() => {
        checkInFlight = null;
      });

      return checkInFlight;
    },

    saveCategories: (categories) => {
      const state = get();
      const normalized = normalizeCategories(categories);
      const revision = state.revision + 1;
      const dirty = state.baselineReady ? isDirty(normalized, state.baseline) : true;

      if (!state.baselineReady || !state.baseSha) {
        set({
          categories: normalized,
          revision,
          dirty,
          draftIssue: '尚未取得远程基线，改动只在当前页面内，不能推送',
        });
        return false;
      }

      const envelope = createDraftEnvelope(state, normalized, revision);
      if (!envelope) return false;

      if (!dirty) {
        // Back to the committed content: the draft is complete.
        removeDraft(state.resourceKey, state.draftId);
        set({ categories: normalized, revision, dirty: false, draftIssue: null });
        return true;
      }

      const saved = saveDraft(envelope);
      set({
        categories: normalized,
        revision,
        dirty,
        draftIssue: saved.ok ? null : describeDraftProblem(saved.problem),
      });
      return saved.ok;
    },

    pushToRemote: async (githubToken) => {
      const state = get();
      if (state.pushStatus === 'pushing') {
        return { status: 'busy', message: '已有推送正在进行' };
      }
      if (state.conflict) {
        return { status: 'conflict', message: '存在冲突，请先选择“采用远程”或“用本机覆盖”' };
      }
      if (!state.baselineReady || !state.baseSha) {
        return {
          status: 'invalid_data',
          message: '没有已验证的远程基线，请重新拉取后再推送',
        };
      }

      const submittedData = state.categories;
      const submittedRevision = state.revision;
      const baseSha = state.baseSha;
      const resourceKey = state.resourceKey;
      const draftId = state.draftId;

      set({ pushStatus: 'pushing', syncError: null, lastResult: null });

      const outcome = await pushResource({
        adapter,
        token: githubToken,
        data: submittedData,
        baseSha,
        message: `Update data via Web Console: ${new Date().toISOString()}`,
      });
      const result = outcome.result;
      const current = get();

      if (result.status === 'success') {
        const newBase = outcome.submitted ?? submittedData;
        const newSha = result.sha;

        if (current.revision === submittedRevision) {
          removeDraft(resourceKey, draftId);
          set({
            baseline: newBase,
            remoteSnapshot: newBase,
            baseSha: newSha,
            dirty: false,
            conflict: null,
            pushStatus: 'idle',
            syncStatus: 'ready',
            syncError: null,
            lastResult: result,
            lastSyncAt: new Date().toISOString(),
            draftIssue: null,
          });
          safeSet(LAST_SYNC_KEY, new Date().toISOString());
          return result;
        }

        // Edits arrived while the request was in flight: keep them, move the
        // baseline to what was just committed.
        const dirty = isDirty(current.categories, newBase);
        const envelope = buildDraft({
          resourceKey,
          draftId,
          baseSha: newSha,
          baseData: newBase,
          draftData: current.categories,
          revision: current.revision,
        });
        const saved = dirty ? saveDraft(envelope) : { ok: true, problem: null };
        if (!dirty) removeDraft(resourceKey, draftId);
        set({
          baseline: newBase,
          remoteSnapshot: newBase,
          baseSha: newSha,
          dirty,
          conflict: null,
          pushStatus: 'idle',
          syncStatus: 'ready',
          syncError: null,
          lastResult: result,
          lastSyncAt: new Date().toISOString(),
          draftIssue: saved.ok ? null : describeDraftProblem(saved.problem),
        });
        safeSet(LAST_SYNC_KEY, new Date().toISOString());
        return result;
      }

      if (result.status === 'conflict') {
        const remote = outcome.remote;
        persistCurrentDraft();
        set({
          pushStatus: 'idle',
          lastResult: result,
          syncStatus: remote ? 'conflict' : 'error',
          syncError: result.message,
          conflict: remote
            ? {
                remoteSha: remote.sha,
                remoteData: remote.data,
                detectedAt: new Date().toISOString(),
              }
            : get().conflict,
        });
        return result;
      }

      persistCurrentDraft();
      set({
        pushStatus: 'idle',
        lastResult: result,
        syncError: result.message,
        syncStatus:
          result.status === 'network_error' || result.status === 'timeout'
            ? 'offline'
            : result.status === 'invalid_data'
              ? 'error'
              : 'error',
      });
      return result;
    },

    adoptRemote: () => {
      const state = get();
      if (!state.conflict) return;
      saveBackup(state.resourceKey, 'local-draft', state.categories);
      saveBackup(state.resourceKey, 'remote-snapshot', state.conflict.remoteData);
      removeDraft(state.resourceKey, state.draftId);
      set({
        categories: state.conflict.remoteData,
        baseline: state.conflict.remoteData,
        remoteSnapshot: state.conflict.remoteData,
        baseSha: state.conflict.remoteSha,
        baselineReady: true,
        dirty: false,
        conflict: null,
        syncStatus: 'ready',
        syncError: null,
        draftIssue: null,
      });
    },

    overwriteRemote: async (githubToken) => {
      const state = get();
      if (!state.conflict) {
        return { status: 'invalid_data', message: '没有待处理的冲突' };
      }
      const conflict = state.conflict;
      saveBackup(state.resourceKey, 'remote-snapshot', conflict.remoteData);
      const dirty = isDirty(state.categories, conflict.remoteData);
      set({
        baseline: conflict.remoteData,
        remoteSnapshot: conflict.remoteData,
        baseSha: conflict.remoteSha,
        baselineReady: true,
        dirty,
        conflict: null,
        syncStatus: 'ready',
        syncError: null,
      });
      persistCurrentDraft();
      return get().pushToRemote(githubToken);
    },

    discardLocal: () => {
      const state = get();
      saveBackup(state.resourceKey, 'local-draft', state.categories);
      removeDraft(state.resourceKey, state.draftId);
      if (state.baselineReady) {
        set({
          categories: state.baseline,
          remoteSnapshot: state.baseline,
          dirty: false,
          conflict: null,
          syncStatus: 'ready',
          syncError: null,
          draftIssue: null,
        });
      } else {
        set({
          categories: [],
          remoteSnapshot: [],
          dirty: false,
          conflict: null,
          syncStatus: 'idle',
          syncError: null,
        });
      }
    },

    exportDraftText: () => {
      const state = get();
      const envelope = buildDraft({
        resourceKey: state.resourceKey,
        draftId: state.draftId,
        baseSha: state.baseSha ?? '',
        baseData: state.baseline,
        draftData: state.categories,
        revision: state.revision,
      });
      return exportDraft(envelope);
    },

    importDraftText: (raw) => {
      const state = get();
      const imported = parseImportedDraft<ICategory[]>(raw, state.resourceKey);
      if (!imported.draft) return { ok: false, error: imported.error };

      const draftData = validateCategories(imported.draft.draftData);
      if (!draftData.ok || !draftData.value) {
        return { ok: false, error: `草稿数据校验失败：${formatIssues(draftData.issues)}` };
      }
      const baseData = validateCategories(imported.draft.baseData);
      if (!baseData.ok || !baseData.value) {
        return { ok: false, error: `草稿基线校验失败：${formatIssues(baseData.issues)}` };
      }

      const draft: DraftEnvelope<ICategory[]> = {
        ...imported.draft,
        draftData: draftData.value,
        baseData: baseData.value,
      };
      const saved = saveDraft(draft);
      applyDraft(draft, {
        syncStatus: 'ready',
        syncError: null,
        conflict: null,
        restoredDraft: true,
        draftIssue: saved.ok ? null : describeDraftProblem(saved.problem),
      });
      return {
        ok: saved.ok,
        error: saved.ok ? null : describeDraftProblem(saved.problem),
      };
    },

    dismissPeerNotice: () => set({ peerNotice: null }),

    restoreDraftById: (draftId) => {
      const state = get();
      const loaded = loadDraft<ICategory[]>(state.resourceKey, draftId);
      if (!loaded.draft) {
        set({
          draftIssue: describeDraftProblem(loaded.problem) ?? '该草稿已不可读取',
          recoverableDrafts: state.recoverableDrafts.filter((d) => d.draftId !== draftId),
        });
        return false;
      }
      // Adopt the recovered draft id for this tab so later edits keep updating
      // the same storage slot instead of creating a duplicate.
      applyDraft(loaded.draft, {
        draftId,
        restoredDraft: true,
        syncStatus: 'ready',
        syncError: null,
        conflict: null,
        draftIssue: null,
        recoverableDrafts: state.recoverableDrafts.filter((d) => d.draftId !== draftId),
      });
      saveDraft(loaded.draft);
      return true;
    },

    getLastSyncTime: () => safeGet(LAST_SYNC_KEY),

    clearLocalData: () => {
      const state = get();
      removeDraft(state.resourceKey, state.draftId);
      set({
        categories: [],
        baseline: [],
        remoteSnapshot: [],
        baseSha: null,
        baselineReady: false,
        dirty: false,
        revision: 0,
        conflict: null,
        syncStatus: 'idle',
        syncError: null,
        draftIssue: null,
      });
    },

    hasRemoteChanged: async (githubToken) => {
      const outcome = await get().checkRemote(githubToken, { manual: true });
      return outcome.remoteChanged;
    },

    compareData: (localData, remoteData): DataDiffResult => {
      const result: DataDiffResult = {
        categoriesAdded: [],
        categoriesRemoved: [],
        categoriesModified: [],
        websitesAdded: [],
        websitesRemoved: [],
        websitesModified: [],
        categoriesReordered: false,
        websitesMoved: [],
        websitesReordered: [],
      };

      const remoteCategoryMap = new Map(remoteData.map((category) => [category.id, category]));
      const localCategoryMap = new Map(localData.map((category) => [category.id, category]));
      const remoteWebsiteCategory = new Map<number, string>();
      remoteData.forEach((category) =>
        category.nav.forEach((website) =>
          remoteWebsiteCategory.set(website.id, category.title)
        )
      );

      for (const localCategory of localData) {
        const remoteCategory = remoteCategoryMap.get(localCategory.id);

        if (!remoteCategory) {
          result.categoriesAdded.push(localCategory);
          for (const website of localCategory.nav) {
            result.websitesAdded.push({ categoryTitle: localCategory.title, website });
          }
          continue;
        }

        const categoryChanges: CategoryDiff['changes'] = {};
        if (localCategory.title !== remoteCategory.title) {
          categoryChanges.title = {
            from: remoteCategory.title || '',
            to: localCategory.title || '',
          };
        }
        if (localCategory.icon !== remoteCategory.icon) {
          categoryChanges.icon = {
            from: remoteCategory.icon || '',
            to: localCategory.icon || '',
          };
        }
        if (Object.keys(categoryChanges).length > 0) {
          result.categoriesModified.push({ category: localCategory, changes: categoryChanges });
        }

        const localWebsiteMap = new Map(localCategory.nav.map((website) => [website.id, website]));
        const remoteWebsiteMap = new Map(
          remoteCategory.nav.map((website) => [website.id, website])
        );

        for (const localWebsite of localCategory.nav) {
          if (!remoteWebsiteMap.has(localWebsite.id)) {
            const previousTitle = remoteWebsiteCategory.get(localWebsite.id);
            if (previousTitle && previousTitle !== localCategory.title) {
              result.websitesMoved.push({
                categoryTitle: localCategory.title,
                website: localWebsite,
              });
            } else {
              result.websitesAdded.push({
                categoryTitle: localCategory.title,
                website: localWebsite,
              });
            }
          }
        }
        for (const remoteWebsite of remoteCategory.nav) {
          if (!localWebsiteMap.has(remoteWebsite.id)) {
            result.websitesRemoved.push({
              categoryTitle: remoteCategory.title,
              website: remoteWebsite,
            });
          }
        }
        for (const localWebsite of localCategory.nav) {
          const remoteWebsite = remoteWebsiteMap.get(localWebsite.id);
          if (!remoteWebsite) continue;
          const changes = buildWebsiteChanges(localWebsite, remoteWebsite);
          if (Object.keys(changes).length > 0) {
            result.websitesModified.push({
              categoryTitle: localCategory.title,
              websiteId: localWebsite.id,
              changes,
            });
          }
        }

        if (commonOrderChanged(orderedIds(localCategory.nav), orderedIds(remoteCategory.nav))) {
          result.websitesReordered.push({
            categoryTitle: localCategory.title,
            websiteIds: orderedIds(localCategory.nav),
          });
        }
      }

      for (const remoteCategory of remoteData) {
        if (!localCategoryMap.has(remoteCategory.id)) {
          result.categoriesRemoved.push(remoteCategory);
          for (const website of remoteCategory.nav) {
            result.websitesRemoved.push({ categoryTitle: remoteCategory.title, website });
          }
        }
      }

      result.categoriesReordered = commonOrderChanged(
        orderedIds(localData),
        orderedIds(remoteData)
      );

      return result;
    },
  };
});
