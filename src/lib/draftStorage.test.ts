import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDraft,
} from '@/lib/syncEngine';
import {
  exportDraft,
  getOrCreateTabDraftId,
  listDrafts,
  loadDraft,
  parseImportedDraft,
  pruneBackups,
  pruneDrafts,
  removeDraft,
  saveBackup,
  saveDraft,
  StorageLike,
} from '@/lib/draftStorage';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  keys(): string[] {
    return Array.from(this.data.keys());
  }
}

const resourceKey = 'owner/repo@main:public/data/db.json#owner';
type Category = { id: number; title: string; nav: unknown[] };
const draft = (draftId: string, revision: number, name: string) =>
  buildDraft<Category[]>({
    resourceKey,
    draftId,
    baseSha: 'sha-1',
    baseData: [{ id: 1, title: 'base', nav: [] }],
    draftData: [{ id: 1, title: name, nav: [] }],
    revision,
  });

test('two tabs keep independent drafts for the same resource', () => {
  const storage = new MemoryStorage();
  saveDraft(draft('tab-a', 1, 'A'), storage);
  saveDraft(draft('tab-b', 2, 'B'), storage);

  const all = listDrafts<Category[]>(resourceKey, storage);
  assert.equal(all.length, 2);
  assert.equal(loadDraft<Category[]>(resourceKey, 'tab-a', storage).draft?.draftData[0].title, 'A');
  assert.equal(loadDraft<Category[]>(resourceKey, 'tab-b', storage).draft?.draftData[0].title, 'B');
});

test('draft ids are per tab and stable inside one session', () => {
  const session = new MemoryStorage();
  const first = getOrCreateTabDraftId(resourceKey, session);
  const second = getOrCreateTabDraftId(resourceKey, session);
  assert.equal(first, second);

  const otherSession = new MemoryStorage();
  const other = getOrCreateTabDraftId(resourceKey, otherSession);
  assert.notEqual(first, other);
});

test('a corrupted entry is reported and does not hide other drafts', () => {
  const storage = new MemoryStorage();
  saveDraft(draft('tab-a', 1, 'A'), storage);
  storage.setItem(
    `navnext:draft:v2:${encodeURIComponent(resourceKey)}:broken`,
    '{not json'
  );

  const loaded = loadDraft(resourceKey, 'broken', storage);
  assert.equal(loaded.draft, null);
  assert.equal(loaded.problem, 'corrupted');
  assert.equal(listDrafts(resourceKey, storage).length, 1);
});

test('quota or disabled storage returns a structured failure', () => {
  const failing: StorageLike = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => {
      const error = new Error('quota');
      error.name = 'QuotaExceededError';
      throw error;
    },
    removeItem: () => undefined,
  };

  const saved = saveDraft(draft('tab-a', 1, 'A'), failing);
  assert.equal(saved.ok, false);
  assert.equal(saved.problem, 'quota');
  assert.equal(saveDraft(draft('tab-a', 1, 'A'), null).problem, 'unavailable');
});

test('export/import round-trips without leaking credentials', () => {
  const original = draft('tab-a', 3, '导出内容');
  const raw = exportDraft(original);
  assert.equal(raw.includes('token'), false);

  const imported = parseImportedDraft<Category[]>(raw, resourceKey);
  assert.equal(imported.error, null);
  assert.equal(imported.draft?.draftData[0].title, '导出内容');
  assert.equal(imported.draft?.revision, 3);

  assert.ok(parseImportedDraft('not json', resourceKey).error);
  assert.ok(parseImportedDraft(raw, 'other/resource').error);
});

test('removeDraft only clears the requested tab', () => {
  const storage = new MemoryStorage();
  saveDraft(draft('tab-a', 1, 'A'), storage);
  saveDraft(draft('tab-b', 1, 'B'), storage);
  removeDraft(resourceKey, 'tab-a', storage);
  assert.equal(loadDraft(resourceKey, 'tab-a', storage).draft, null);
  assert.ok(loadDraft(resourceKey, 'tab-b', storage).draft);
});

test('backups are written with their own keys', () => {
  const storage = new MemoryStorage();
  const result = saveBackup(resourceKey, 'local-draft', { any: 'thing' }, storage);
  assert.equal(result.ok, true);
  assert.ok(result.key);
  assert.ok(storage.keys().some((key) => key.startsWith('navnext:backup:v2:')));
});

test('the tab draft id stays stable when session storage is unavailable', () => {
  // A disabled sessionStorage keeps returning a new id, piling up draft slots.
  const first = getOrCreateTabDraftId(`${resourceKey}-no-session`, null);
  const second = getOrCreateTabDraftId(`${resourceKey}-no-session`, null);
  assert.equal(first, second);

  const failingSession: StorageLike = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => {
      throw new Error('disabled');
    },
    removeItem: () => undefined,
  };
  const third = getOrCreateTabDraftId(`${resourceKey}-failing`, failingSession);
  const fourth = getOrCreateTabDraftId(`${resourceKey}-failing`, failingSession);
  assert.equal(third, fourth);
});

const agedDraft = (draftId: string, day: number) => ({
  ...draft(draftId, day, draftId),
  updatedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
});

test('pruneDrafts keeps the active draft plus the newest ones', () => {
  const storage = new MemoryStorage();
  for (let day = 1; day <= 7; day += 1) {
    saveDraft(agedDraft(`tab-${day}`, day), storage);
  }
  // The active slot is the oldest, so it must not be dropped by recency alone.
  pruneDrafts(resourceKey, 'tab-1', storage);

  const remaining = listDrafts(resourceKey, storage).map((item) => item.draftId);
  assert.equal(remaining.length, 5);
  assert.ok(remaining.includes('tab-1'), 'the active draft survives');
  assert.deepEqual(remaining.sort(), ['tab-1', 'tab-4', 'tab-5', 'tab-6', 'tab-7']);
  assert.equal(loadDraft(resourceKey, 'tab-2', storage).draft, null);
});

test('pruneBackups keeps only the newest backups and preserves corrupted drafts', () => {
  const storage = new MemoryStorage();
  const prefix = `navnext:backup:v2:${encodeURIComponent(resourceKey)}:`;
  for (let stamp = 1; stamp <= 7; stamp += 1) {
    storage.setItem(`${prefix}local-draft:${stamp}`, '{}');
  }
  pruneBackups(resourceKey, storage);

  const remaining = storage
    .keys()
    .filter((key) => key.startsWith(prefix))
    .sort();
  assert.deepEqual(remaining, [
    `${prefix}local-draft:3`,
    `${prefix}local-draft:4`,
    `${prefix}local-draft:5`,
    `${prefix}local-draft:6`,
    `${prefix}local-draft:7`,
  ]);

  const corruptedKey = `navnext:draft:v2:${encodeURIComponent(resourceKey)}:broken`;
  storage.setItem(corruptedKey, '{not json');
  pruneDrafts(resourceKey, 'tab-x', storage);
  assert.equal(storage.getItem(corruptedKey), '{not json');
});

test('saveBackup prunes old backups of the same resource', () => {
  const storage = new MemoryStorage();
  const prefix = `navnext:backup:v2:${encodeURIComponent(resourceKey)}:`;
  for (let stamp = 1; stamp <= 6; stamp += 1) {
    storage.setItem(`${prefix}remote-snapshot:${stamp}`, '{}');
  }
  const saved = saveBackup(resourceKey, 'local-draft', { fresh: true }, storage);
  assert.equal(saved.ok, true);

  const backups = storage.keys().filter((key) => key.startsWith(prefix));
  assert.equal(backups.length, 5);
  assert.ok(saved.key && backups.includes(saved.key));
  assert.equal(backups.includes(`${prefix}remote-snapshot:1`), false);
});
