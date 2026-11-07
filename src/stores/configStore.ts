import { create } from 'zustand';
import { ISiteConfig } from '@/types';
import { getFileContent, updateFileContent, GithubApiError } from '@/lib/githubApi';
import { owner, repo, branch, configPath } from '@/lib/config';
import { canonicalEqual } from '@/lib/codec';
import {
  formatIssues,
  normalizeSiteConfig,
  validateSiteConfig,
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

export const DEFAULT_SITE_CONFIG: ISiteConfig = {
  site: { name: 'Nav Next', description: '个人导航站', theme: 'system' },
  search: {
    engines: [
      { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: 'google' },
      { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'bing' },
      { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', icon: 'baidu' },
    ],
  },
};

interface ConfigState {
  siteConfig: ISiteConfig;
  loading: boolean;
  dirty: boolean;
  baseline: ISiteConfig;
  remoteSnapshot: ISiteConfig;
  baseSha: string | null;
  baselineReady: boolean;
  revision: number;
  draftId: string;
  resourceKey: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  conflict: SyncConflict<ISiteConfig> | null;
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

  fetchConfig: (isAdmin?: boolean) => Promise<void>;
  refreshPublic: () => Promise<void>;
  initAdmin: (githubToken: string) => Promise<void>;
  checkRemote: (githubToken: string, options?: { manual?: boolean }) => Promise<RemoteCheckOutcome>;
  saveConfig: (config: ISiteConfig) => boolean;
  pushToRemote: (githubToken: string) => Promise<SyncResult>;
  adoptRemote: () => void;
  overwriteRemote: (githubToken: string) => Promise<SyncResult>;
  discardLocal: () => void;
  exportDraftText: () => string | null;
  importDraftText: (raw: string) => { ok: boolean; error: string | null };
  dismissPeerNotice: () => void;
  restoreDraftById: (draftId: string) => boolean;
  hasRemoteChanged: (githubToken: string) => Promise<boolean>;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
}

const PUBLIC_CACHE_KEY = 'navnext:public:site-config:v2';
const LAST_SYNC_KEY = 'navnext:lastSync:config';
const LEGACY_KEYS = ['SITE_CONFIG', 'SITE_CONFIG_LAST_SYNC'];
const THROTTLE_MS = 60_000;

const RESOURCE_KEY = buildResourceKey({
  owner,
  repo,
  branch,
  path: configPath,
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

const readPublicCache = (): ISiteConfig | null => {
  const raw = safeGet(PUBLIC_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validation = validateSiteConfig(parsed);
    return validation.ok && validation.value ? validation.value : null;
  } catch {
    return null;
  }
};

const savePublicCache = (config: ISiteConfig): void => {
  safeSet(PUBLIC_CACHE_KEY, JSON.stringify(config));
  safeSet(`${PUBLIC_CACHE_KEY}:checkedAt`, new Date().toISOString());
};

const errorResult = (error: unknown): SyncFailure => {
  if (error instanceof GithubApiError) {
    return { status: error.code, message: error.message, httpStatus: error.httpStatus };
  }
  return { status: 'unknown_error', message: (error as Error)?.message ?? '未知错误' };
};

const adapter: ResourceAdapter<ISiteConfig> = {
  readRemote: async (token) => {
    try {
      const file = await getFileContent(token, owner, repo, configPath, branch);
      try {
        return { ok: true, file: { sha: file.sha, data: JSON.parse(file.content) } };
      } catch {
        return {
          ok: false,
          result: {
            status: 'invalid_data',
            message: '远程 site-config 文件不是合法 JSON，未覆盖本机基线',
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
        configPath,
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
  validate: validateSiteConfig,
};

const describeDraftProblem = (problem: string | null): string | null => {
  if (problem === 'quota') return '本机存储空间不足，改动仅在当前页面内，刷新会丢失';
  if (problem === 'unavailable') return '浏览器禁用了本机存储，改动仅在当前页面内，请导出草稿';
  if (problem === 'corrupted') return '本机草稿数据损坏，未自动覆盖远程；可导出或重新拉取';
  return null;
};

export const useConfigStore = create<ConfigState>((set, get) => {
  // Per-tab draft ids keep storage keys separate; peer writes only notify.
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
          ? '另一标签页保存了站点配置草稿；本页内容未被替换'
          : '另一标签页已丢弃或提交了站点配置草稿',
      });
    });
  };

  const persistCurrentDraft = (): boolean => {
    const state = get();
    if (!state.baselineReady || !state.baseSha) return false;
    if (!state.dirty) {
      removeDraft(state.resourceKey, state.draftId);
      return true;
    }
    const envelope = buildDraft({
      resourceKey: state.resourceKey,
      draftId: state.draftId,
      baseSha: state.baseSha,
      baseData: state.baseline,
      draftData: state.siteConfig,
      revision: state.revision,
    });
    const saved = saveDraft(envelope);
    set({ draftIssue: saved.ok ? null : describeDraftProblem(saved.problem) });
    return saved.ok;
  };

  const applyRemoteFile = (data: ISiteConfig, sha: string, revision: number): void => {
    const state = get();
    set({
      siteConfig: data,
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
    draft: DraftEnvelope<ISiteConfig>,
    extra: Partial<ConfigState> = {}
  ): void => {
    const data = normalizeSiteConfig(draft.draftData);
    const base = normalizeSiteConfig(draft.baseData);
    set({
      siteConfig: data,
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
    remoteData: ISiteConfig,
    remoteSha: string
  ): { draft: DraftEnvelope<ISiteConfig> | null; backupKey: string | null } => {
    const legacy = readLegacyValue(LEGACY_KEYS);
    if (!legacy) return { draft: null, backupKey: null };
    const backupKey = backupLegacyValue(legacy.sourceKey, legacy.raw);

    let legacyData: ISiteConfig | null = null;
    try {
      const validation = validateSiteConfig(JSON.parse(legacy.raw));
      if (validation.ok && validation.value) legacyData = validation.value;
    } catch {
      legacyData = null;
    }

    if (!legacyData || canonicalEqual(legacyData, remoteData)) {
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
      Date.now() - state.lastPublicCheckAt < THROTTLE_MS
    ) {
      return;
    }
    if (publicInFlight) return publicInFlight;

    const seq = (publicRequestSeq += 1);
    publicInFlight = (async () => {
      try {
        const response = await fetch('/data/site-config.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = (await response.json()) as unknown;
        const validation = validateSiteConfig(raw);
        if (!validation.ok || !validation.value) {
          throw new Error(`配置校验失败：${formatIssues(validation.issues)}`);
        }
        if (seq !== publicRequestSeq) return;
        savePublicCache(validation.value);
        set({
          siteConfig: validation.value,
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
    siteConfig: DEFAULT_SITE_CONFIG,
    loading: true,
    dirty: false,
    baseline: DEFAULT_SITE_CONFIG,
    remoteSnapshot: DEFAULT_SITE_CONFIG,
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

    fetchConfig: async (isAdmin = false) => {
      if (isAdmin) {
        if (get().baselineReady) return;
        const draftId = ensureDraftId();
        const loaded = loadDraft<ISiteConfig>(get().resourceKey, draftId);
        if (loaded.draft) applyDraft(loaded.draft);
        return;
      }
      const cached = readPublicCache();
      if (cached) set({ siteConfig: cached, loading: false });
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

      const loaded = loadDraft<ISiteConfig>(get().resourceKey, draftId);
      const draftProblem = describeDraftProblem(loaded.problem);
      let draft = loaded.draft;
      let legacyBackupKeys: string[] = [];

      // A new browser session gets a new tab draft id; keep older drafts listed.
      const siblings = listDrafts<ISiteConfig>(get().resourceKey)
        .filter((item) => item.draftId !== draftId)
        .map((item) => ({
          draftId: item.draftId,
          revision: item.revision,
          updatedAt: item.updatedAt,
        }));
      set({ recoverableDrafts: siblings });

      const remote = await readValidatedRemote(adapter, githubToken);

      if (get().initRequestId !== requestId) return;
      if (get().revision !== startedRevision) {
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
          if (!saved.ok) set({ draftIssue: describeDraftProblem(saved.problem) });
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
        syncError: '远程配置已被其他设备更新，本机草稿保留，请选择版本',
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
          result: { status: 'invalid_data', message: '尚未取得远程基线，无法检查更新' },
        };
      }
      if (
        !options.manual &&
        state.lastCheckedAt &&
        Date.now() - state.lastCheckedAt < THROTTLE_MS
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

        if (canonicalEqual(current.siteConfig, file.data)) {
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
          syncError: '远程配置已更新，本机有未推送的修改',
        });
        return {
          checked: true,
          remoteChanged: true,
          result: {
            status: 'conflict',
            message: '远程配置已更新，本机有未推送的修改',
            remoteSha: file.sha,
            remoteData: file.data,
          },
        };
      })().finally(() => {
        checkInFlight = null;
      });

      return checkInFlight;
    },

    saveConfig: (config) => {
      const state = get();
      const normalized = normalizeSiteConfig(config);
      const revision = state.revision + 1;
      const dirty = state.baselineReady ? isDirty(normalized, state.baseline) : true;

      if (!state.baselineReady || !state.baseSha) {
        set({
          siteConfig: normalized,
          revision,
          dirty,
          draftIssue: '尚未取得远程基线，改动只在当前页面内，不能推送',
        });
        return false;
      }

      if (!dirty) {
        removeDraft(state.resourceKey, state.draftId);
        set({ siteConfig: normalized, revision, dirty: false, draftIssue: null });
        return true;
      }

      const saved = saveDraft(
        buildDraft({
          resourceKey: state.resourceKey,
          draftId: state.draftId,
          baseSha: state.baseSha,
          baseData: state.baseline,
          draftData: normalized,
          revision,
        })
      );
      set({
        siteConfig: normalized,
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
        return { status: 'invalid_data', message: '没有已验证的远程基线，请重新拉取后再推送' };
      }

      const submittedData = state.siteConfig;
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
        message: `Update site-config via Web Console: ${new Date().toISOString()}`,
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

        const dirty = isDirty(current.siteConfig, newBase);
        const saved = dirty
          ? saveDraft(
              buildDraft({
                resourceKey,
                draftId,
                baseSha: newSha,
                baseData: newBase,
                draftData: current.siteConfig,
                revision: current.revision,
              })
            )
          : { ok: true, problem: null };
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
            : 'error',
      });
      return result;
    },

    adoptRemote: () => {
      const state = get();
      if (!state.conflict) return;
      saveBackup(state.resourceKey, 'local-draft', state.siteConfig);
      saveBackup(state.resourceKey, 'remote-snapshot', state.conflict.remoteData);
      removeDraft(state.resourceKey, state.draftId);
      set({
        siteConfig: state.conflict.remoteData,
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
      const dirty = isDirty(state.siteConfig, conflict.remoteData);
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
      saveBackup(state.resourceKey, 'local-draft', state.siteConfig);
      removeDraft(state.resourceKey, state.draftId);
      if (state.baselineReady) {
        set({
          siteConfig: state.baseline,
          remoteSnapshot: state.baseline,
          dirty: false,
          conflict: null,
          syncStatus: 'ready',
          syncError: null,
          draftIssue: null,
        });
      } else {
        set({
          siteConfig: DEFAULT_SITE_CONFIG,
          remoteSnapshot: DEFAULT_SITE_CONFIG,
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
        draftData: state.siteConfig,
        revision: state.revision,
      });
      return exportDraft(envelope);
    },

    importDraftText: (raw) => {
      const state = get();
      const imported = parseImportedDraft<ISiteConfig>(raw, state.resourceKey);
      if (!imported.draft) return { ok: false, error: imported.error };

      const draftData = validateSiteConfig(imported.draft.draftData);
      if (!draftData.ok || !draftData.value) {
        return { ok: false, error: `草稿数据校验失败：${formatIssues(draftData.issues)}` };
      }
      const baseData = validateSiteConfig(imported.draft.baseData);
      if (!baseData.ok || !baseData.value) {
        return { ok: false, error: `草稿基线校验失败：${formatIssues(baseData.issues)}` };
      }

      const draft: DraftEnvelope<ISiteConfig> = {
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
      const loaded = loadDraft<ISiteConfig>(state.resourceKey, draftId);
      if (!loaded.draft) {
        set({
          draftIssue: describeDraftProblem(loaded.problem) ?? '该草稿已不可读取',
          recoverableDrafts: state.recoverableDrafts.filter((d) => d.draftId !== draftId),
        });
        return false;
      }
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

    hasRemoteChanged: async (githubToken) => {
      const outcome = await get().checkRemote(githubToken, { manual: true });
      return outcome.remoteChanged;
    },

    getLastSyncTime: () => safeGet(LAST_SYNC_KEY),

    clearLocalData: () => {
      const state = get();
      removeDraft(state.resourceKey, state.draftId);
      set({
        siteConfig: DEFAULT_SITE_CONFIG,
        baseline: DEFAULT_SITE_CONFIG,
        remoteSnapshot: DEFAULT_SITE_CONFIG,
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
  };
});
