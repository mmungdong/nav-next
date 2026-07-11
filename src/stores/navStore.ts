import { create } from 'zustand';
import { ICategory, IWebsite } from '@/types';
import { getFileContent, updateFileContent, decodeContent } from '@/lib/githubApi';
import { owner, repo, branch, dbPath } from '@/lib/config';

// 数据差异结果类型
export interface DataDiffResult {
  categoriesAdded: ICategory[];
  categoriesRemoved: ICategory[];
  categoriesModified: CategoryDiff[];
  websitesAdded: WebsiteDiff[];
  websitesRemoved: WebsiteDiff[];
  websitesModified: WebsiteChange[];
}

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
    tags?: { from: string[]; to: string[] };
    rate?: { from: number; to: number };
    top?: { from: boolean; to: boolean };
    ownVisible?: { from: boolean; to: boolean };
    topTypes?: { from: number[]; to: number[] };
    index?: { from: number; to: number };
  };
}

interface NavState {
  categories: ICategory[];
  loading: boolean;
  dirty: boolean;
  remoteSnapshot: ICategory[];
  fetchCategories: (isAdmin?: boolean) => Promise<void>;
  updateCategories: (categories: ICategory[]) => void;
  saveCategories: (categories: ICategory[]) => Promise<void>;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
  forcePull: (githubToken: string) => Promise<boolean>;
  pushToRemote: (githubToken: string) => Promise<boolean>;
  discardLocal: () => void;
  hasRemoteChanged: (githubToken: string) => Promise<boolean>;
  compareData: (localData: ICategory[], remoteData: ICategory[]) => DataDiffResult;
}

const STORAGE_KEY = 'NAV_CATEGORIES';
const LAST_SYNC_KEY = 'NAV_LAST_SYNC';

// shallow array compare for tags/topTypes
const arrEqual = (a?: string[] | number[], b?: string[] | number[]) => {
  const la = a ?? [];
  const lb = b ?? [];
  return la.length === lb.length && la.every((v, i) => v === lb[i]);
};

const loadFromLocalStorage = (): ICategory[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
  return null;
};

const saveToLocalStorage = (categories: ICategory[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const fetchRemoteData = async (githubToken: string): Promise<ICategory[] | null> => {
  try {
    const fileInfo = await getFileContent(githubToken, owner, repo, dbPath, branch);
    if (!fileInfo.content) {
      console.warn('远程文件不存在或内容为空');
      return null;
    }
    return JSON.parse(decodeContent(fileInfo.content)) as ICategory[];
  } catch (error) {
    console.error('获取远程数据失败:', error);
    return null;
  }
};

const fetchCategoriesData = async (isAdmin = false): Promise<ICategory[]> => {
  if (isAdmin) {
    const stored = loadFromLocalStorage();
    if (stored) return stored;
    console.warn('管理后台: localStorage 为空，从文件加载数据');
  } else {
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY);
    const stored = loadFromLocalStorage();
    if (stored && lastSyncTime) {
      const syncTime = new Date(lastSyncTime).getTime();
      const currentTime = new Date().getTime();
      const CACHE_EXPIRE_TIME = 60 * 60 * 1000; // 1h
      if (currentTime - syncTime < CACHE_EXPIRE_TIME) return stored;
      console.log('缓存已过期，重新加载数据');
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const response = await fetch('/data/db.json');
    if (response.ok) {
      const rawData = await response.json();
      const categories = rawData.map((category: ICategory) => ({
        id: category.id,
        title: category.title || '未知分类',
        icon: category.icon,
        nav: category.nav || [],
      }));
      saveToLocalStorage(categories);
      return categories;
    }
  } catch (error) {
    console.warn('Failed to load local data, using mock data:', error);
  }

  const mockCategories: ICategory[] = [
    { id: 1, title: '常用工具', icon: '🛠️', nav: [] },
    { id: 2, title: '学习资源', icon: '📚', nav: [] },
  ];
  saveToLocalStorage(mockCategories);
  return mockCategories;
};

// compare a single website field, accumulate into changes
const buildWebsiteChanges = (
  local: IWebsite,
  remote: IWebsite
): WebsiteChange['changes'] => {
  const changes: WebsiteChange['changes'] = {};
  if (local.name !== remote.name)
    changes.name = { from: remote.name, to: local.name };
  if (local.desc !== remote.desc)
    changes.desc = { from: remote.desc, to: local.desc };
  if (local.url !== remote.url) changes.url = { from: remote.url, to: local.url };
  if (local.icon !== remote.icon)
    changes.icon = { from: remote.icon ?? '', to: local.icon ?? '' };
  if (!arrEqual(local.tags, remote.tags))
    changes.tags = { from: remote.tags ?? [], to: local.tags ?? [] };
  if (local.rate !== remote.rate)
    changes.rate = { from: remote.rate ?? 0, to: local.rate ?? 0 };
  if (local.top !== remote.top)
    changes.top = { from: remote.top ?? false, to: local.top ?? false };
  if (local.ownVisible !== remote.ownVisible)
    changes.ownVisible = { from: remote.ownVisible ?? false, to: local.ownVisible ?? false };
  if (!arrEqual(local.topTypes, remote.topTypes))
    changes.topTypes = { from: remote.topTypes ?? [], to: local.topTypes ?? [] };
  if (local.index !== remote.index)
    changes.index = { from: remote.index ?? 0, to: local.index ?? 0 };
  return changes;
};

export const useNavStore = create<NavState>((set, get) => ({
  categories: [],
  loading: true,
  dirty: false,
  remoteSnapshot: [],
  fetchCategories: async (isAdmin = false) => {
    try {
      const categories = await fetchCategoriesData(isAdmin);
      set({ categories, loading: false });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      set({ loading: false });
    }
  },
  updateCategories: (categories) => set({ categories }),
  saveCategories: async (categories) => {
    saveToLocalStorage(categories);
    set({ categories, dirty: true });
  },
  getLastSyncTime: (): string | null => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.warn('Failed to get last sync time:', error);
      return null;
    }
  },
  clearLocalData: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      set({ categories: [], dirty: false, remoteSnapshot: [] });
    } catch (error) {
      console.warn('Failed to clear local data:', error);
    }
  },
  forcePull: async (githubToken: string) => {
    const remote = await fetchRemoteData(githubToken);
    if (!remote) return false;
    saveToLocalStorage(remote);
    set({ categories: remote, remoteSnapshot: remote, dirty: false, loading: false });
    return true;
  },
  pushToRemote: async (githubToken: string) => {
    const { categories } = get();
    try {
      const fileInfo = await getFileContent(githubToken, owner, repo, dbPath, branch);
      const content = JSON.stringify(categories, null, 2);
      const commitMessage = `Update data via Web Console: ${new Date().toLocaleString()}`;
      await updateFileContent(githubToken, owner, repo, dbPath, content, commitMessage, branch, fileInfo.sha);
      saveToLocalStorage(categories);
      set({ remoteSnapshot: categories, dirty: false });
      return true;
    } catch (error) {
      console.error('推送失败:', error);
      return false;
    }
  },
  discardLocal: () => {
    const { remoteSnapshot } = get();
    saveToLocalStorage(remoteSnapshot);
    set({ categories: remoteSnapshot, dirty: false });
  },
  hasRemoteChanged: async (githubToken: string) => {
    const remote = await fetchRemoteData(githubToken);
    if (!remote) return false;
    const { remoteSnapshot } = get();
    // remote differs from snapshot taken on enter
    const snapshotJson = JSON.stringify(remoteSnapshot);
    return JSON.stringify(remote) !== snapshotJson;
  },
  compareData: (localData: ICategory[], remoteData: ICategory[]): DataDiffResult => {
    const result: DataDiffResult = {
      categoriesAdded: [],
      categoriesRemoved: [],
      categoriesModified: [],
      websitesAdded: [],
      websitesRemoved: [],
      websitesModified: [],
    };

    const remoteCategoryMap = new Map(remoteData.map((cat) => [cat.id, cat]));
    const localCategoryMap = new Map(localData.map((cat) => [cat.id, cat]));

    for (const localCategory of localData) {
      const remoteCategory = remoteCategoryMap.get(localCategory.id);

      if (!remoteCategory) {
        result.categoriesAdded.push(localCategory);
        for (const website of localCategory.nav) {
          result.websitesAdded.push({ categoryTitle: localCategory.title, website });
        }
      } else {
        const categoryChanges: CategoryDiff['changes'] = {};
        if (localCategory.title !== remoteCategory.title)
          categoryChanges.title = { from: remoteCategory.title || '', to: localCategory.title || '' };
        if (localCategory.icon !== remoteCategory.icon)
          categoryChanges.icon = { from: remoteCategory.icon || '', to: localCategory.icon || '' };
        if (Object.keys(categoryChanges).length > 0)
          result.categoriesModified.push({ category: localCategory, changes: categoryChanges });

        const localWebsiteMap = new Map(localCategory.nav.map((w) => [w.id, w]));
        const remoteWebsiteMap = new Map(remoteCategory.nav.map((w) => [w.id, w]));

        for (const localWebsite of localCategory.nav) {
          if (!remoteWebsiteMap.has(localWebsite.id))
            result.websitesAdded.push({ categoryTitle: localCategory.title, website: localWebsite });
        }
        for (const remoteWebsite of remoteCategory.nav) {
          if (!localWebsiteMap.has(remoteWebsite.id))
            result.websitesRemoved.push({ categoryTitle: remoteCategory.title, website: remoteWebsite });
        }
        for (const localWebsite of localCategory.nav) {
          const remoteWebsite = remoteWebsiteMap.get(localWebsite.id);
          if (remoteWebsite) {
            const changes = buildWebsiteChanges(localWebsite, remoteWebsite);
            if (Object.keys(changes).length > 0)
              result.websitesModified.push({
                categoryTitle: localCategory.title,
                websiteId: localWebsite.id,
                changes,
              });
          }
        }
      }
    }

    for (const remoteCategory of remoteData) {
      if (!localCategoryMap.has(remoteCategory.id)) {
        result.categoriesRemoved.push(remoteCategory);
        for (const website of remoteCategory.nav)
          result.websitesRemoved.push({ categoryTitle: remoteCategory.title, website });
      }
    }

    return result;
  },
}));
