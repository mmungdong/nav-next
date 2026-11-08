import { create } from 'zustand';
import { ICategory, ILegacyTag, IWebsite } from '@/types';
import { owner, repo, branch, dbPath } from '@/lib/config';
import { canonicalEqual } from '@/lib/codec';
import { normalizeCategories, validateCategories } from '@/lib/dataValidation';
import { buildResourceKey, RemoteCheckOutcome } from '@/lib/syncTypes';
import {
  createGithubFileAdapter,
  createSyncedResource,
  SyncedResource,
  SyncedResourceSpec,
} from '@/stores/syncedResource';

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

interface NavState extends SyncedResource<ICategory[]> {
  categories: ICategory[];
  fetchCategories: () => Promise<void>;
  saveCategories: (categories: ICategory[]) => boolean;
  compareData: (localData: ICategory[], remoteData: ICategory[]) => DataDiffResult;
}

const PUBLIC_CACHE_KEY = 'navnext:public:categories:v2';
const LAST_SYNC_KEY = 'navnext:lastSync:nav';
const LEGACY_KEYS = ['NAV_CATEGORIES', 'NAV_LAST_SYNC'];
const THROTTLE_MS = 60_000;

const RESOURCE_KEY = buildResourceKey({
  owner,
  repo,
  branch,
  path: dbPath,
  userId: owner,
});

const navSpec: SyncedResourceSpec<ICategory[], NavState> = {
  resourceKey: RESOURCE_KEY,
  legacyKeys: LEGACY_KEYS,
  lastSyncKey: LAST_SYNC_KEY,
  publicCacheKey: PUBLIC_CACHE_KEY,
  publicPath: '/data/db.json',
  throttleMs: THROTTLE_MS,
  emptyData: [],
  adapter: createGithubFileAdapter({
    path: dbPath,
    validate: validateCategories,
    invalidJsonMessage: '远程 db 文件不是合法 JSON，未覆盖本机基线',
  }),
  normalize: normalizeCategories,
  readData: (state) => state.categories,
  writeData: (data) => ({ categories: data }),
  messages: {
    conflict: '远程数据已被其他设备更新，本机草稿保留，请选择版本',
    remoteChanged: '远程已更新，本机有未推送的修改',
    peerSaved: '另一标签页保存了本资源的草稿；本页内容未被替换',
    peerCleared: '另一标签页已丢弃或提交了本资源的草稿',
    publicInvalid: '数据校验失败',
    pushCommit: (timestamp) => `Update data via Web Console: ${timestamp}`,
  },
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

export const useNavStore = create<NavState>((set, get) => {
  const synced = createSyncedResource<ICategory[], NavState>(set, get, navSpec);

  return {
    ...synced,
    categories: [],
    fetchCategories: synced.fetchPublicResource,
    saveCategories: synced.saveData,

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
