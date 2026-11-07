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
