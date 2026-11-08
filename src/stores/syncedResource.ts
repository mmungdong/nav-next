import type { StoreApi } from 'zustand';
import { canonicalEqual } from '@/lib/codec';
import { formatIssues } from '@/lib/dataValidation';
import { getFileContent, updateFileContent, GithubApiError } from '@/lib/githubApi';
import { owner, repo, branch } from '@/lib/config';
import {
  buildDraft,
  isDirty,
  pushResource,
  readValidatedRemote,
  ResourceAdapter,
} from '@/lib/syncEngine';
import {
  DiscardResult,
  DraftEnvelope,
  DraftSummary,
  PushStatus,
  RemoteCheckOutcome,
  SyncConflict,
  SyncFailure,
  SyncResult,
  SyncStatus,
  ValidationResult,
} from '@/lib/syncTypes';
import {
  backupLegacyValue,
  CorruptedDraft,
  exportDraft,
  getOrCreateTabDraftId,
  listCorruptedDrafts,
  listDrafts,
  loadDraft,
  parseDraftKey,
  parseImportedDraft,
  pruneDrafts,
  readLegacyValue,
  removeDraft,
  removeStorageKeys,
  rotateTabDraftId,
  saveBackup,
  saveDraft,
} from '@/lib/draftStorage';

/** State every synced resource shares; the store adds its own data field. */
export interface SyncedResourceState<T> {
  loading: boolean;
  dirty: boolean;
  baseline: T;
  remoteSnapshot: T;
  baseSha: string | null;
  baselineReady: boolean;
  revision: number;
  draftId: string;
  resourceKey: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  conflict: SyncConflict<T> | null;
  pushStatus: PushStatus;
  lastResult: SyncResult | null;
  lastCheckedAt: number | null;
  lastSyncAt: string | null;
  draftIssue: string | null;
  restoredDraft: boolean;
  legacyBackupKeys: string[];
  peerNotice: string | null;
  recoverableDrafts: DraftSummary[];
  /** Damaged drafts are listed but never cleaned up without explicit consent. */
  corruptedDrafts: CorruptedDraft[];
  initRequestId: number;
  publicError: string | null;
  lastPublicCheckAt: number | null;
}

export interface SyncedResourceActions<T> {
  fetchPublicResource: () => Promise<void>;
  refreshPublic: () => Promise<void>;
  initAdmin: (githubToken: string) => Promise<void>;
  checkRemote: (githubToken: string, options?: { manual?: boolean }) => Promise<RemoteCheckOutcome>;
  saveData: (next: T) => boolean;
  pushToRemote: (githubToken: string) => Promise<SyncResult>;
  adoptRemote: (options?: { discardWithoutBackup?: boolean }) => DiscardResult;
  overwriteRemote: (githubToken: string) => Promise<SyncResult>;
  discardLocal: (options?: { discardWithoutBackup?: boolean }) => DiscardResult;
  exportDraftText: () => string | null;
  exportCorruptedDraftsText: () => string | null;
  discardCorruptedDrafts: () => void;
  importDraftText: (raw: string) => { ok: boolean; error: string | null };
  dismissPeerNotice: () => void;
  restoreDraftById: (draftId: string) => boolean;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
  hasRemoteChanged: (githubToken: string) => Promise<boolean>;
}

export type SyncedResource<T> = SyncedResourceState<T> & SyncedResourceActions<T>;

export interface SyncedResourceMessages {
  /** initAdmin found a remote that moved past the draft base. */
  conflict: string;
  /** A background check found a moved remote while local edits exist. */
  remoteChanged: string;
  peerSaved: string;
  peerCleared: string;
  /** Prefix for a rejected deployed file, e.g. `数据校验失败`. */
  publicInvalid: string;
  pushCommit: (timestamp: string) => string;
}

export interface SyncedResourceSpec<T, S extends SyncedResource<T>> {
  resourceKey: string;
  /** Pre-draft localStorage keys, newest first. */
  legacyKeys: string[];
  lastSyncKey: string;
  publicCacheKey: string;
  publicPath: string;
  throttleMs: number;
  /** Data used when there is no verified baseline. */
  emptyData: T;
  adapter: ResourceAdapter<T>;
  normalize: (raw: unknown) => T;
  readData: (state: S) => T;
  writeData: (data: T) => Partial<S>;
  messages: SyncedResourceMessages;
}

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

const errorResult = (error: unknown): SyncFailure => {
  if (error instanceof GithubApiError) {
    return { status: error.code, message: error.message, httpStatus: error.httpStatus };
  }
  return { status: 'unknown_error', message: (error as Error)?.message ?? '未知错误' };
};

/** Transport over a single JSON file in the GitHub repo. */
export function createGithubFileAdapter<T>(args: {
  path: string;
  validate: (raw: unknown) => ValidationResult<T>;
  invalidJsonMessage: string;
}): ResourceAdapter<T> {
  return {
    readRemote: async (token) => {
      try {
        const file = await getFileContent(token, owner, repo, args.path, branch);
        try {
          return { ok: true, file: { sha: file.sha, data: JSON.parse(file.content) } };
        } catch {
          return {
            ok: false,
            result: {
              status: 'invalid_data',
              message: args.invalidJsonMessage,
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
          args.path,
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
    validate: args.validate,
  };
}

const describeDraftProblem = (problem: string | null): string | null => {
  if (problem === 'quota') return '本机存储空间不足，改动仅在当前页面内，刷新会丢失';
  if (problem === 'unavailable') return '浏览器禁用了本机存储，改动仅在当前页面内，请导出草稿';
  if (problem === 'corrupted')
    return '本机草稿数据损坏，原始内容已保留，可导出后手动恢复或明确丢弃；未自动覆盖远程';
  return null;
};

const describeBackupFailure = (problem: string | null): string => {
  if (problem === 'quota') return '本机存储空间不足';
  if (problem === 'unavailable') return '浏览器禁用了本机存储';
  return '写入本机恢复副本失败';
};

/**
 * Sync, draft and conflict machinery shared by every GitHub-backed resource.
 * The store only describes its data field and copy; every safety rule
 * (draft before discard, SHA baseline, conflict, timeout re-read) lives here.
 */
export function createSyncedResource<T, S extends SyncedResource<T>>(
  set: StoreApi<S>['setState'],
  get: () => S,
  spec: SyncedResourceSpec<T, S>
): SyncedResource<T> {
  let publicRequestSeq = 0;
  let publicInFlight: Promise<void> | null = null;
  let publicStarted = false;
  let checkInFlight: Promise<RemoteCheckOutcome> | null = null;
  let storageListenerInstalled = false;

  // Shared patches are typed against the shared state; the store's own fields
  // only arrive through spec.writeData.
  const setShared = (patch: Partial<SyncedResourceState<T>>): void => {
    set(patch as Partial<S>);
  };

  const readPublicCache = (): T | null => {
    const raw = safeGet(spec.publicCacheKey);
    if (!raw) return null;
    try {
      const validation = spec.adapter.validate(JSON.parse(raw) as unknown);
      return validation.ok && validation.value !== undefined ? validation.value : null;
    } catch {
      return null;
    }
  };

  const savePublicCache = (data: T): void => {
    safeSet(spec.publicCacheKey, JSON.stringify(data));
    safeSet(`${spec.publicCacheKey}:checkedAt`, new Date().toISOString());
  };

  // Destroying local edits is only safe after the recovery copy is on disk.
  const guardBackupBeforeDiscard = (
    resourceKey: string,
    dirty: boolean,
    data: T,
    options?: { discardWithoutBackup?: boolean }
  ): DiscardResult => {
    if (options?.discardWithoutBackup || !dirty) return { ok: true, message: null };
    const saved = saveBackup(resourceKey, 'local-draft', data);
    if (saved.ok) return { ok: true, message: null };
    set({ draftIssue: describeDraftProblem(saved.problem) } as Partial<S>);
    return {
      ok: false,
      message: `${describeBackupFailure(saved.problem)}，未能保存恢复副本，已保留草稿。请先「导出草稿」；清理本机存储空间后可重试。`,
    };
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
        peerNotice: event.newValue ? spec.messages.peerSaved : spec.messages.peerCleared,
      } as Partial<S>);
    });
  };

  const applyRemoteFile = (data: T, sha: string, revision: number): void => {
    const state = get();
    set({
      ...spec.writeData(data),
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
    } as Partial<S>);
    if (state.draftId) removeDraft(state.resourceKey, state.draftId);
  };

  const applyDraft = (
    draft: DraftEnvelope<T>,
    extra: Partial<SyncedResourceState<T>> = {}
  ): void => {
    const data = spec.normalize(draft.draftData);
    const base = spec.normalize(draft.baseData);
    set({
      ...spec.writeData(data),
      baseline: base,
      remoteSnapshot: base,
      baseSha: draft.baseSha || null,
      baselineReady: Boolean(draft.baseSha),
      revision: draft.revision,
      dirty: isDirty(data, base),
      draftId: draft.draftId,
      loading: false,
      ...extra,
    } as Partial<S>);
  };

  const ensureDraftId = (): string => {
    const state = get();
    if (state.draftId) return state.draftId;
    const draftId = getOrCreateTabDraftId(state.resourceKey);
    set({ draftId } as Partial<S>);
    return draftId;
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
      draftData: spec.readData(state),
      revision: state.revision,
    });
    const saved = saveDraft(envelope);
    set({ draftIssue: saved.ok ? null : describeDraftProblem(saved.problem) } as Partial<S>);
    return saved.ok;
  };

  const migrateLegacy = (
    draftId: string,
    remoteData: T,
    remoteSha: string
  ): { draft: DraftEnvelope<T> | null; backupKey: string | null } => {
    const legacy = readLegacyValue(spec.legacyKeys);
    if (!legacy) return { draft: null, backupKey: null };

    const backupKey = backupLegacyValue(legacy.sourceKey, legacy.raw);
    let legacyData: T | null = null;
    try {
      const validation = spec.adapter.validate(JSON.parse(legacy.raw));
      if (validation.ok && validation.value !== undefined) legacyData = validation.value;
    } catch {
      legacyData = null;
    }

    if (!legacyData) {
      // Corrupt old payload: keep the raw backup, stop using the old key.
      removeStorageKeys(spec.legacyKeys);
      return { draft: null, backupKey };
    }

    if (canonicalEqual(legacyData, remoteData)) {
      removeStorageKeys(spec.legacyKeys);
      return { draft: null, backupKey };
    }

    const draft = buildDraft({
      resourceKey: spec.resourceKey,
      draftId,
      baseSha: remoteSha,
      baseData: remoteData,
      draftData: legacyData,
      revision: 1,
    });
    removeStorageKeys(spec.legacyKeys);
    return { draft, backupKey };
  };

  const fetchPublicRemote = async (force: boolean): Promise<void> => {
    const state = get();
    if (
      !force &&
      state.lastPublicCheckAt &&
      Date.now() - state.lastPublicCheckAt < spec.throttleMs
    ) {
      return;
    }
    if (publicInFlight) return publicInFlight;

    const seq = (publicRequestSeq += 1);
    publicInFlight = (async () => {
      try {
        const response = await fetch(spec.publicPath, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = (await response.json()) as unknown;
        const validation = spec.adapter.validate(raw);
        if (!validation.ok || validation.value === undefined) {
          throw new Error(`${spec.messages.publicInvalid}：${formatIssues(validation.issues)}`);
        }
        if (seq !== publicRequestSeq) return;
        savePublicCache(validation.value);
        set({
          ...spec.writeData(validation.value),
          loading: false,
          publicError: null,
          lastPublicCheckAt: Date.now(),
        } as Partial<S>);
      } catch (error) {
        if (seq !== publicRequestSeq) return;
        set({
          loading: false,
          publicError: (error as Error).message,
          lastPublicCheckAt: Date.now(),
        } as Partial<S>);
      } finally {
        publicInFlight = null;
      }
    })();
    return publicInFlight;
  };

  return {
    loading: true,
    dirty: false,
    baseline: spec.emptyData,
    remoteSnapshot: spec.emptyData,
    baseSha: null,
    baselineReady: false,
    revision: 0,
    draftId: '',
    resourceKey: spec.resourceKey,
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
    corruptedDrafts: [],
    initRequestId: 0,
    publicError: null,
    lastPublicCheckAt: null,

    fetchPublicResource: async () => {
      const cached = readPublicCache();
      if (cached) set({ ...spec.writeData(cached), loading: false } as Partial<S>);
      const force = !publicStarted;
      publicStarted = true;
      await fetchPublicRemote(force);
    },

    refreshPublic: async () => {
      await fetchPublicRemote(true);
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
      } as Partial<S>);

      const loaded = loadDraft<T>(get().resourceKey, draftId);
      const draftProblem = describeDraftProblem(loaded.problem);
      let draft = loaded.draft;
      let legacyBackupKeys: string[] = [];

      // A damaged draft must survive: this tab moves to a fresh slot so later
      // saves cannot overwrite the only copy of its raw text.
      let activeDraftId = draftId;
      if (loaded.problem === 'corrupted') {
        activeDraftId = rotateTabDraftId(get().resourceKey);
        set({ draftId: activeDraftId } as Partial<S>);
      }
      const corruptedDrafts = listCorruptedDrafts(get().resourceKey);

      // A fresh browser session gets a new tab draft id, so older drafts must
      // stay discoverable instead of being orphaned in localStorage. Old ones
      // beyond the cap are dropped so storage cannot grow without bound.
      pruneDrafts(get().resourceKey, activeDraftId);
      const siblings = listDrafts<T>(get().resourceKey)
        .filter((item) => item.draftId !== activeDraftId)
        .map((item) => ({
          draftId: item.draftId,
          revision: item.revision,
          updatedAt: item.updatedAt,
        }));
      set({ recoverableDrafts: siblings, corruptedDrafts } as Partial<S>);

      const remote = await readValidatedRemote(spec.adapter, githubToken);

      // Any newer init call, or a local edit made while the request was in
      // flight, wins over this response.
      if (get().initRequestId !== requestId) return;
      if (get().revision !== startedRevision) {
        // A local edit arrived while the request was in flight; keep it.
        const current = get();
        set({
          loading: false,
          syncStatus: current.baselineReady ? 'ready' : 'idle',
        } as Partial<S>);
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
        } as Partial<S>);
        return;
      }

      const remoteFile = remote.file;

      if (!draft) {
        const migrated = migrateLegacy(activeDraftId, remoteFile.data, remoteFile.sha);
        if (migrated.draft) {
          draft = migrated.draft;
          const saved = saveDraft(migrated.draft);
          if (!saved.ok) {
            // Keep the data in memory even when storage refuses it.
            set({ draftIssue: describeDraftProblem(saved.problem) } as Partial<S>);
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
        } as Partial<S>);
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
        } as Partial<S>);
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
        syncError: spec.messages.conflict,
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
        Date.now() - state.lastCheckedAt < spec.throttleMs
      ) {
        return {
          checked: false,
          remoteChanged: false,
          result: { status: 'success', sha: state.baseSha },
        };
      }
      if (checkInFlight) return checkInFlight;

      checkInFlight = (async (): Promise<RemoteCheckOutcome> => {
        const remote = await readValidatedRemote(spec.adapter, githubToken);
        const current = get();
        set({ lastCheckedAt: Date.now() } as Partial<S>);

        if (!remote.ok) {
          set({
            syncError: remote.result.message,
            syncStatus:
              remote.result.status === 'network_error' || remote.result.status === 'timeout'
                ? 'offline'
                : 'error',
          } as Partial<S>);
          return { checked: true, remoteChanged: false, result: remote.result };
        }

        const file = remote.file;
        if (file.sha === current.baseSha) {
          if (current.syncStatus === 'offline')
            set({ syncStatus: 'ready', syncError: null } as Partial<S>);
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

        if (canonicalEqual(spec.readData(current), file.data)) {
          set({
            baseline: file.data,
            remoteSnapshot: file.data,
            baseSha: file.sha,
            dirty: false,
            conflict: null,
            syncStatus: 'ready',
            syncError: null,
          } as Partial<S>);
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
          syncError: spec.messages.remoteChanged,
        } as Partial<S>);
        return {
          checked: true,
          remoteChanged: true,
          result: {
            status: 'conflict',
            message: spec.messages.remoteChanged,
            remoteSha: file.sha,
            remoteData: file.data,
          },
        };
      })().finally(() => {
        checkInFlight = null;
      });

      return checkInFlight;
    },

    saveData: (next) => {
      const state = get();
      const normalized = spec.normalize(next);
      const revision = state.revision + 1;
      const dirty = state.baselineReady ? isDirty(normalized, state.baseline) : true;

      if (!state.baselineReady || !state.baseSha) {
        set({
          ...spec.writeData(normalized),
          revision,
          dirty,
          draftIssue: '尚未取得远程基线，改动只在当前页面内，不能推送',
        } as Partial<S>);
        return false;
      }

      if (!dirty) {
        // Back to the committed content: the draft is complete.
        removeDraft(state.resourceKey, state.draftId);
        set({
          ...spec.writeData(normalized),
          revision,
          dirty: false,
          draftIssue: null,
        } as Partial<S>);
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
        ...spec.writeData(normalized),
        revision,
        dirty,
        draftIssue: saved.ok ? null : describeDraftProblem(saved.problem),
      } as Partial<S>);
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

      const submittedData = spec.readData(state);
      const submittedRevision = state.revision;
      const baseSha = state.baseSha;
      const resourceKey = state.resourceKey;
      const draftId = state.draftId;

      set({ pushStatus: 'pushing', syncError: null, lastResult: null } as Partial<S>);

      const outcome = await pushResource({
        adapter: spec.adapter,
        token: githubToken,
        data: submittedData,
        baseSha,
        message: spec.messages.pushCommit(new Date().toISOString()),
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
          } as Partial<S>);
          safeSet(spec.lastSyncKey, new Date().toISOString());
          return result;
        }

        // Edits arrived while the request was in flight: keep them, move the
        // baseline to what was just committed.
        const dirty = isDirty(spec.readData(current), newBase);
        const saved = dirty
          ? saveDraft(
              buildDraft({
                resourceKey,
                draftId,
                baseSha: newSha,
                baseData: newBase,
                draftData: spec.readData(current),
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
        } as Partial<S>);
        safeSet(spec.lastSyncKey, new Date().toISOString());
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
        } as Partial<S>);
        return result;
      }

      // A failed write whose verification re-read shows a different SHA means
      // the remote moved too. That is a conflict, not a retryable network error.
      const remoteAfterFailure = outcome.remote;
      if (remoteAfterFailure && remoteAfterFailure.sha !== baseSha) {
        const conflictResult: SyncFailure = {
          ...result,
          status: 'conflict',
          message: spec.messages.conflict,
          remoteSha: remoteAfterFailure.sha,
          remoteData: remoteAfterFailure.data,
        };
        persistCurrentDraft();
        set({
          pushStatus: 'idle',
          lastResult: conflictResult,
          syncStatus: 'conflict',
          syncError: spec.messages.conflict,
          conflict: {
            remoteSha: remoteAfterFailure.sha,
            remoteData: remoteAfterFailure.data,
            detectedAt: new Date().toISOString(),
          },
        } as Partial<S>);
        return conflictResult;
      }

      persistCurrentDraft();
      set({
        pushStatus: 'idle',
        lastResult: result,
        syncError: result.message,
        syncStatus:
          result.status === 'network_error' || result.status === 'timeout' ? 'offline' : 'error',
      } as Partial<S>);
      return result;
    },

    adoptRemote: (options) => {
      const state = get();
      if (!state.conflict) return { ok: false, message: '没有待处理的冲突' };
      const guard = guardBackupBeforeDiscard(
        state.resourceKey,
        state.dirty,
        spec.readData(state),
        options
      );
      if (!guard.ok) return guard;
      // The remote snapshot stays in GitHub history; this copy is extra insurance.
      saveBackup(state.resourceKey, 'remote-snapshot', state.conflict.remoteData);
      removeDraft(state.resourceKey, state.draftId);
      set({
        ...spec.writeData(state.conflict.remoteData),
        baseline: state.conflict.remoteData,
        remoteSnapshot: state.conflict.remoteData,
        baseSha: state.conflict.remoteSha,
        baselineReady: true,
        dirty: false,
        conflict: null,
        syncStatus: 'ready',
        syncError: null,
        draftIssue: null,
      } as Partial<S>);
      return { ok: true, message: null };
    },

    overwriteRemote: async (githubToken) => {
      const state = get();
      if (!state.conflict) {
        return { status: 'invalid_data', message: '没有待处理的冲突' };
      }
      const conflict = state.conflict;
      saveBackup(state.resourceKey, 'remote-snapshot', conflict.remoteData);
      const dirty = isDirty(spec.readData(state), conflict.remoteData);
      set({
        baseline: conflict.remoteData,
        remoteSnapshot: conflict.remoteData,
        baseSha: conflict.remoteSha,
        baselineReady: true,
        dirty,
        conflict: null,
        syncStatus: 'ready',
        syncError: null,
      } as Partial<S>);
      persistCurrentDraft();
      return get().pushToRemote(githubToken);
    },

    discardLocal: (options) => {
      const state = get();
      const guard = guardBackupBeforeDiscard(
        state.resourceKey,
        state.dirty,
        spec.readData(state),
        options
      );
      if (!guard.ok) return guard;
      removeDraft(state.resourceKey, state.draftId);
      if (state.baselineReady) {
        set({
          ...spec.writeData(state.baseline),
          remoteSnapshot: state.baseline,
          dirty: false,
          conflict: null,
          syncStatus: 'ready',
          syncError: null,
          draftIssue: null,
        } as Partial<S>);
      } else {
        set({
          ...spec.writeData(spec.emptyData),
          baseline: spec.emptyData,
          remoteSnapshot: spec.emptyData,
          dirty: false,
          conflict: null,
          syncStatus: 'idle',
          syncError: null,
        } as Partial<S>);
      }
      return { ok: true, message: null };
    },

    exportDraftText: () => {
      const state = get();
      const envelope = buildDraft({
        resourceKey: state.resourceKey,
        draftId: state.draftId,
        baseSha: state.baseSha ?? '',
        baseData: state.baseline,
        draftData: spec.readData(state),
        revision: state.revision,
      });
      return exportDraft(envelope);
    },

    exportCorruptedDraftsText: () => {
      const state = get();
      if (state.corruptedDrafts.length === 0) return null;
      return JSON.stringify(
        state.corruptedDrafts.map((item) => ({
          resourceKey: state.resourceKey,
          draftId: item.draftId,
          corrupted: true,
          raw: item.raw,
        })),
        null,
        2
      );
    },

    discardCorruptedDrafts: () => {
      const state = get();
      for (const item of state.corruptedDrafts) {
        removeDraft(state.resourceKey, item.draftId);
      }
      setShared({
        corruptedDrafts: [],
        // Keep an unrelated storage warning (quota/unavailable) intact.
        draftIssue:
          state.draftIssue === describeDraftProblem('corrupted') ? null : state.draftIssue,
      });
    },

    importDraftText: (raw) => {
      const state = get();
      const imported = parseImportedDraft<T>(raw, state.resourceKey);
      if (!imported.draft) return { ok: false, error: imported.error };

      const draftData = spec.adapter.validate(imported.draft.draftData);
      if (!draftData.ok || draftData.value === undefined) {
        return { ok: false, error: `草稿数据校验失败：${formatIssues(draftData.issues)}` };
      }
      const baseData = spec.adapter.validate(imported.draft.baseData);
      if (!baseData.ok || baseData.value === undefined) {
        return { ok: false, error: `草稿基线校验失败：${formatIssues(baseData.issues)}` };
      }

      const draft: DraftEnvelope<T> = {
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

    dismissPeerNotice: () => set({ peerNotice: null } as Partial<S>),

    restoreDraftById: (draftId) => {
      const state = get();
      const loaded = loadDraft<T>(state.resourceKey, draftId);
      if (!loaded.draft) {
        set({
          draftIssue: describeDraftProblem(loaded.problem) ?? '该草稿已不可读取',
          recoverableDrafts: state.recoverableDrafts.filter((d) => d.draftId !== draftId),
        } as Partial<S>);
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

    getLastSyncTime: () => safeGet(spec.lastSyncKey),

    clearLocalData: () => {
      const state = get();
      removeDraft(state.resourceKey, state.draftId);
      set({
        ...spec.writeData(spec.emptyData),
        baseline: spec.emptyData,
        remoteSnapshot: spec.emptyData,
        baseSha: null,
        baselineReady: false,
        dirty: false,
        revision: 0,
        conflict: null,
        syncStatus: 'idle',
        syncError: null,
        draftIssue: null,
      } as Partial<S>);
    },

    hasRemoteChanged: async (githubToken) => {
      const outcome = await get().checkRemote(githubToken, { manual: true });
      return outcome.remoteChanged;
    },
  };
}
