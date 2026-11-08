import { DraftEnvelope } from '@/lib/syncTypes';

/**
 * Drafts are per-resource and per-tab: the envelope key contains the draftId so
 * two tabs editing the same file never overwrite each other's storage slot.
 */

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageProblem = 'unavailable' | 'quota' | 'corrupted' | null;

export const DRAFT_PREFIX = 'navnext:draft:v2:';
export const BACKUP_PREFIX = 'navnext:backup:v2:';
export const LEGACY_BACKUP_PREFIX = 'navnext:legacy-backup:';
export const TAB_DRAFT_ID_PREFIX = 'navnext:tabDraftId:';

export type BackupKind = 'local-draft' | 'remote-snapshot' | 'legacy' | 'imported';

const draftKey = (resourceKey: string, draftId: string): string =>
  `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:${draftId}`;

/** Splits a storage key back into its resource and tab draft identity. */
export function parseDraftKey(key: string): { resourceKey: string; draftId: string } | null {
  if (!key.startsWith(DRAFT_PREFIX)) return null;
  const rest = key.slice(DRAFT_PREFIX.length);
  const separator = rest.indexOf(':');
  if (separator <= 0) return null;
  try {
    return {
      resourceKey: decodeURIComponent(rest.slice(0, separator)),
      draftId: rest.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function getLocalStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function getSessionStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

const classifyStorageError = (error: unknown): StorageProblem => {
  if (error && typeof error === 'object') {
    const name = (error as { name?: string }).name;
    const code = (error as { code?: number }).code;
    if (name === 'QuotaExceededError' || code === 22 || code === 1014) return 'quota';
  }
  return 'unavailable';
};

const createDraftId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to timestamp+random
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Keeps the tab id stable when sessionStorage is unavailable or disabled. */
const fallbackTabDraftIds = new WeakMap<StorageLike, Map<string, string>>();
const fallbackTabDraftIdsWithoutSession = new Map<string, string>();

const fallbackTabDraftIdsFor = (session: StorageLike | null): Map<string, string> => {
  if (!session) return fallbackTabDraftIdsWithoutSession;
  let map = fallbackTabDraftIds.get(session);
  if (!map) {
    map = new Map<string, string>();
    fallbackTabDraftIds.set(session, map);
  }
  return map;
};

/** Remembers this tab's draft id for the session; a new tab gets its own draft. */
export function getOrCreateTabDraftId(
  resourceKey: string,
  session: StorageLike | null = getSessionStorage()
): string {
  const key = `${TAB_DRAFT_ID_PREFIX}${resourceKey}`;
  if (session) {
    try {
      const existing = session.getItem(key);
      if (existing) return existing;
    } catch {
      // storage disabled: the in-memory fallback below keeps the id stable
    }
  }
  // Only a session that previously failed to persist has a fallback entry.
  const fallback = session
    ? fallbackTabDraftIds.get(session)?.get(resourceKey)
    : fallbackTabDraftIdsWithoutSession.get(resourceKey);
  if (fallback) return fallback;
  const id = createDraftId();
  if (session) {
    try {
      session.setItem(key, id);
      return id;
    } catch {
      // in-memory only
    }
  }
  fallbackTabDraftIdsFor(session).set(resourceKey, id);
  return id;
}

/** Replaces this tab's draft id so new saves cannot overwrite an existing key. */
export function rotateTabDraftId(
  resourceKey: string,
  session: StorageLike | null = getSessionStorage()
): string {
  const id = createDraftId();
  fallbackTabDraftIdsFor(session).set(resourceKey, id);
  if (session) {
    try {
      session.setItem(`${TAB_DRAFT_ID_PREFIX}${resourceKey}`, id);
    } catch {
      // in-memory only; the damaged key is still found by listCorruptedDrafts
    }
  }
  return id;
}

export function isValidDraftEnvelope<T>(value: unknown, resourceKey?: string): value is DraftEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === 2 &&
    typeof record.resourceKey === 'string' &&
    (resourceKey === undefined || record.resourceKey === resourceKey) &&
    typeof record.draftId === 'string' &&
    typeof record.baseSha === 'string' &&
    typeof record.revision === 'number' &&
    typeof record.updatedAt === 'string' &&
    'baseData' in record &&
    'draftData' in record
  );
}

export interface DraftLoadResult<T> {
  draft: DraftEnvelope<T> | null;
  problem: StorageProblem;
}

export function loadDraft<T>(
  resourceKey: string,
  draftId: string,
  storage: StorageLike | null = getLocalStorage()
): DraftLoadResult<T> {
  if (!storage) return { draft: null, problem: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(draftKey(resourceKey, draftId));
  } catch {
    return { draft: null, problem: 'unavailable' };
  }
  if (!raw) return { draft: null, problem: null };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidDraftEnvelope<T>(parsed, resourceKey)) {
      return { draft: null, problem: 'corrupted' };
    }
    return { draft: parsed, problem: null };
  } catch {
    return { draft: null, problem: 'corrupted' };
  }
}

export function saveDraft<T>(
  envelope: DraftEnvelope<T>,
  storage: StorageLike | null = getLocalStorage()
): { ok: boolean; problem: StorageProblem } {
  if (!storage) return { ok: false, problem: 'unavailable' };
  try {
    storage.setItem(
      draftKey(envelope.resourceKey, envelope.draftId),
      JSON.stringify(envelope)
    );
    return { ok: true, problem: null };
  } catch (error) {
    return { ok: false, problem: classifyStorageError(error) };
  }
}

export function removeDraft(
  resourceKey: string,
  draftId: string,
  storage: StorageLike | null = getLocalStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(draftKey(resourceKey, draftId));
  } catch {
    // best effort; a stale draft is recoverable, a crash is not
  }
}

export function listDrafts<T>(
  resourceKey: string,
  storage: StorageLike | null = getLocalStorage()
): DraftEnvelope<T>[] {
  if (!storage) return [];
  const prefix = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:`;
  const drafts: DraftEnvelope<T>[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isValidDraftEnvelope<T>(parsed, resourceKey)) drafts.push(parsed);
      } catch {
        // ignore one corrupt entry so other drafts stay reachable
      }
    }
  } catch {
    return drafts;
  }
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface CorruptedDraft {
  draftId: string;
  raw: string;
}

/** Damaged drafts keep their raw text so the user can still export them. */
export function listCorruptedDrafts(
  resourceKey: string,
  storage: StorageLike | null = getLocalStorage()
): CorruptedDraft[] {
  if (!storage) return [];
  const prefix = `${DRAFT_PREFIX}${encodeURIComponent(resourceKey)}:`;
  const corrupted: CorruptedDraft[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = storage.getItem(key);
      if (raw === null) continue;
      let valid = false;
      try {
        valid = isValidDraftEnvelope(JSON.parse(raw) as unknown, resourceKey);
      } catch {
        valid = false;
      }
      if (!valid) corrupted.push({ draftId: key.slice(prefix.length), raw });
    }
  } catch {
    // storage unavailable: leave whatever is there untouched
  }
  return corrupted;
}

export const MAX_DRAFTS_PER_RESOURCE = 5;
export const MAX_BACKUPS_PER_RESOURCE = 5;

/**
 * Caps stale draft slots so a fresh tab per session cannot grow storage forever.
 * The active slot always survives; damaged drafts are untouched.
 */
export function pruneDrafts(
  resourceKey: string,
  keepDraftId: string | null,
  storage: StorageLike | null = getLocalStorage(),
  max = MAX_DRAFTS_PER_RESOURCE
): void {
  if (!storage) return;
  try {
    const keep = new Set<string>();
    if (keepDraftId) keep.add(keepDraftId);
    const drafts = listDrafts(resourceKey, storage);
    for (const draft of drafts) {
      if (keep.size >= max) break;
      keep.add(draft.draftId);
    }
    for (const draft of drafts) {
      if (!keep.has(draft.draftId)) removeDraft(resourceKey, draft.draftId, storage);
    }
  } catch {
    // best effort; stale drafts are recoverable, a crash is not
  }
}

/** Caps backups per resource, newest first. */
export function pruneBackups(
  resourceKey: string,
  storage: StorageLike | null = getLocalStorage(),
  max = MAX_BACKUPS_PER_RESOURCE
): void {
  if (!storage) return;
  try {
    const prefix = `${BACKUP_PREFIX}${encodeURIComponent(resourceKey)}:`;
    const entries: { key: string; stamp: number }[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const stamp = Number(key.slice(key.lastIndexOf(':') + 1));
      entries.push({ key, stamp: Number.isFinite(stamp) ? stamp : 0 });
    }
    entries.sort((a, b) => b.stamp - a.stamp);
    for (const entry of entries.slice(max)) storage.removeItem(entry.key);
  } catch {
    // best effort
  }
}

export function saveBackup(
  resourceKey: string,
  kind: BackupKind,
  data: unknown,
  storage: StorageLike | null = getLocalStorage()
): { ok: boolean; key: string | null; problem: StorageProblem } {
  if (!storage) return { ok: false, key: null, problem: 'unavailable' };
  const key = `${BACKUP_PREFIX}${encodeURIComponent(resourceKey)}:${kind}:${Date.now()}`;
  try {
    storage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
    pruneBackups(resourceKey, storage);
    return { ok: true, key, problem: null };
  } catch (error) {
    return { ok: false, key: null, problem: classifyStorageError(error) };
  }
}

export function exportDraft<T>(envelope: DraftEnvelope<T>): string {
  // Draft content only; the GitHub token lives in auth storage and never enters exports.
  return JSON.stringify(envelope, null, 2);
}

export interface ImportResult<T> {
  draft: DraftEnvelope<T> | null;
  error: string | null;
}

export function parseImportedDraft<T>(raw: string, resourceKey: string): ImportResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { draft: null, error: '文件不是合法 JSON' };
  }
  if (!isValidDraftEnvelope<T>(parsed, resourceKey)) {
    return { draft: null, error: '不是本资源的草稿快照（schemaVersion/resourceKey 不匹配）' };
  }
  return { draft: parsed, error: null };
}

/** Reads the pre-v2 keys once so they can be compared with remote before adoption. */
export function readLegacyValue(
  keys: string[],
  storage: StorageLike | null = getLocalStorage()
): { sourceKey: string; raw: string } | null {
  if (!storage) return null;
  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (raw) return { sourceKey: key, raw };
    } catch {
      return null;
    }
  }
  return null;
}

/** Keeps the raw legacy payload before the old key is removed. */
export function backupLegacyValue(
  sourceKey: string,
  raw: string,
  storage: StorageLike | null = getLocalStorage()
): string | null {
  if (!storage) return null;
  const key = `${LEGACY_BACKUP_PREFIX}${sourceKey}:${Date.now()}`;
  try {
    storage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

export function removeStorageKeys(
  keys: string[],
  storage: StorageLike | null = getLocalStorage()
): void {
  if (!storage) return;
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      // best effort
    }
  }
}
