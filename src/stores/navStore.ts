import { create } from 'zustand';
import { ICategory, ISettings, IWebsite } from '@/types';
import { getFileContent } from '@/lib/githubApi';

// 数据差异结果类型
export interface DataDiffResult {
  categoriesAdded: ICategory[]; // 新增的分类
  categoriesRemoved: ICategory[]; // 删除的分类
  categoriesModified: CategoryDiff[]; // 修改的分类
  websitesAdded: WebsiteDiff[]; // 新增的网站
  websitesRemoved: WebsiteDiff[]; // 删除的网站
  websitesModified: WebsiteChange[]; // 修改的网站
}

// 分类差异类型
export interface CategoryDiff {
  category: ICategory;
  changes: {
    title?: { from: string; to: string };
    icon?: { from: string; to: string };
  };
}

// 网站差异类型
export interface WebsiteDiff {
  categoryTitle: string;
  website: IWebsite;
}

// 网站变更类型
export interface WebsiteChange {
  categoryTitle: string;
  websiteId: number;
  changes: {
    name?: { from: string; to: string };
    desc?: { from: string; to: string };
    url?: { from: string; to: string };
    icon?: { from: string; to: string };
    rate?: { from: number; to: number };
    top?: { from: boolean; to: boolean };
    ownVisible?: { from: boolean; to: boolean };
  };
}

interface NavState {
  categories: ICategory[];
  settings: ISettings;
  loading: boolean;
  fetchCategories: () => Promise<void>;
  updateCategories: (categories: ICategory[]) => void;
  saveCategories: (categories: ICategory[]) => Promise<void>;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
  checkDataSync: (githubToken: string) => Promise<boolean>;
  fetchRemoteData: (githubToken: string) => Promise<ICategory[] | null>;
  hasDataChanged: (localData: ICategory[], remoteData: ICategory[]) => boolean;
  compareData: (
    localData: ICategory[],
    remoteData: ICategory[]
  ) => DataDiffResult;
}

// 存储键常量
const STORAGE_KEY = 'NAV_CATEGORIES';
const LAST_SYNC_KEY = 'NAV_LAST_SYNC';

// 从本地存储加载数据
const loadFromLocalStorage = (): ICategory[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
  return null;
};

// 保存到本地存储
const saveToLocalStorage = (categories: ICategory[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    // 保存最后同步时间戳
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

// 比较两个分类数组是否相同
const compareCategories = (
  local: ICategory[],
  remote: ICategory[]
): boolean => {
  // 比较长度
  if (local.length !== remote.length) {
    return false;
  }

  // 比较每个分类
  for (let i = 0; i < local.length; i++) {
    const localCat = local[i];
    const remoteCat = remote[i];

    // 比较基本属性
    if (
      localCat.id !== remoteCat.id ||
      localCat.title !== remoteCat.title ||
      localCat.icon !== remoteCat.icon
    ) {
      return false;
    }

    // 比较导航项数量
    if (localCat.nav.length !== remoteCat.nav.length) {
      return false;
    }

    // 比较每个导航项
    for (let j = 0; j < localCat.nav.length; j++) {
      const localNav = localCat.nav[j];
      const remoteNav = remoteCat.nav[j];

      if (
        localNav.id !== remoteNav.id ||
        localNav.name !== remoteNav.name ||
        localNav.desc !== remoteNav.desc ||
        localNav.url !== remoteNav.url ||
        localNav.icon !== remoteNav.icon ||
        localNav.rate !== remoteNav.rate ||
        localNav.top !== remoteNav.top ||
        localNav.ownVisible !== remoteNav.ownVisible
      ) {
        return false;
      }
    }
  }

  return true;
};

// 获取远程数据
const fetchRemoteData = async (
  githubToken: string
): Promise<ICategory[] | null> => {
  try {
    // 获取远程文件内容
    const owner = 'mmungdong'; // 替换为实际的仓库所有者
    const repo = 'nav-next'; // 替换为实际的仓库名
    const path = 'public/data/db.json';
    const branch = 'main';

    const fileInfo = await getFileContent(
      githubToken,
      owner,
      repo,
      path,
      branch
    );

    if (!fileInfo.content) {
      console.warn('远程文件不存在或内容为空');
      return null;
    }

    // 解码文件内容 - GitHub API返回的是base64编码的内容
    // 使用更安全的解码方式来处理中文字符
    let content;
    try {
      // 解码base64内容
      const binaryString = atob(fileInfo.content);
      // 将二进制字符串转换为正确的UTF-8字符串
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      content = new TextDecoder('utf-8').decode(bytes);
    } catch (decodeError) {
      console.error('Base64解码失败，尝试使用传统方法:', decodeError);
      // 如果解码失败，尝试传统的atob方法
      try {
        content = atob(fileInfo.content);
      } catch (fallbackError) {
        console.error('备用解码方法也失败:', fallbackError);
        // 如果两种方法都失败，直接使用内容
        content = fileInfo.content;
      }
    }

    // 解析JSON数据
    const remoteData: ICategory[] = JSON.parse(content);

    return remoteData;
  } catch (error) {
    console.error('获取远程数据失败:', error);
    return null;
  }
};

// 从本地文件加载数据
const fetchCategoriesData = async (): Promise<ICategory[]> => {
  // 首先尝试从本地存储加载
  const storedCategories = loadFromLocalStorage();
  if (storedCategories) {
    return storedCategories;
  }

  // 模拟 API 调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 返回模拟数据或从本地文件加载数据
  try {
    // 尝试从本地数据文件加载
    const response = await fetch('/data/db.json');
    if (response.ok) {
      const rawData = await response.json();

      // db.json现在已经是两层结构，直接返回
      const categories = rawData.map((category: ICategory) => ({
        id: category.id,
        title: category.title || '未知分类',
        icon: category.icon || '',
        nav: category.nav || [],
      }));

      // 保存到本地存储
      saveToLocalStorage(categories);
      return categories;
    }
  } catch (error) {
    console.warn('Failed to load local data, using mock data:', error);
  }

  // 如果无法加载本地数据，返回模拟数据
  const mockCategories = [
    {
      id: 1,
      title: '常用工具',
      icon: '🛠️',
      nav: [
        {
          id: 101,
          name: 'Google',
          desc: '全球最大的搜索引擎',
          url: 'https://www.google.com',
          icon: '',
          rate: 5,
          top: true,
          ownVisible: false,
        },
        {
          id: 102,
          name: 'GitHub',
          desc: '全球最大的代码托管平台',
          url: 'https://github.com',
          icon: '',
          rate: 5,
          top: true,
          ownVisible: false,
        },
      ],
    },
    {
      id: 2,
      title: '学习资源',
      icon: '📚',
      nav: [
        {
          id: 201,
          name: 'MDN Web Docs',
          desc: 'Web开发权威文档',
          url: 'https://developer.mozilla.org',
          icon: '',
          rate: 5,
          top: true,
          ownVisible: false,
        },
      ],
    },
  ];

  // 保存模拟数据到本地存储
  saveToLocalStorage(mockCategories);
  return mockCategories;
};

export const useNavStore = create<NavState>((set) => ({
  categories: [],
  settings: {},
  loading: true,
  fetchCategories: async () => {
    try {
      const categories = await fetchCategoriesData();
      set({ categories, loading: false });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      set({ loading: false });
    }
  },
  updateCategories: (categories) => set({ categories }),
  saveCategories: async (categories) => {
    // 保存到本地存储
    saveToLocalStorage(categories);

    // 更新状态
    set({ categories });

    // 触发重新获取数据（可选）
    // await get().fetchCategories();
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
    } catch (error) {
      console.warn('Failed to clear local data:', error);
    }
  },
  // 检查本地和远程数据是否同步
  checkDataSync: async (githubToken: string) => {
    try {
      // 获取远程数据
      const remoteData = await fetchRemoteData(githubToken);
      if (!remoteData) {
        console.warn('无法获取远程数据，跳过同步检查');
        return true; // 如果无法获取远程数据，返回true表示不需要同步
      }

      // 获取本地数据
      const localData = loadFromLocalStorage();
      if (!localData) {
        console.warn('本地数据为空');
        return false;
      }

      // 比较数据是否相同
      const isSame = compareCategories(localData, remoteData);
      return isSame;
    } catch (error) {
      console.error('检查数据同步失败:', error);
      return true; // 发生错误时，假定数据已同步以避免频繁检查
    }
  },
  // 获取远程数据 - 通过store暴露
  fetchRemoteData: async (githubToken: string): Promise<ICategory[] | null> => {
    return await fetchRemoteData(githubToken);
  },
  // 检查数据是否发生了变化
  hasDataChanged: (
    localData: ICategory[],
    remoteData: ICategory[]
  ): boolean => {
    return !compareCategories(localData, remoteData);
  },
  // 比较本地和远程数据的差异
  compareData: (
    localData: ICategory[],
    remoteData: ICategory[]
  ): DataDiffResult => {
    const result: DataDiffResult = {
      categoriesAdded: [], // 本地有但远程没有的分类 (新增)
      categoriesRemoved: [], // 本地没有但远程有的分类 (删除)
      categoriesModified: [], // 分类属性变化
      websitesAdded: [], // 本地有但远程没有的网站 (新增)
      websitesRemoved: [], // 本地没有但远程有的网站 (删除)
      websitesModified: [], // 网站属性变化
    };

    // 创建远程数据的映射以便快速查找
    const remoteCategoryMap = new Map(remoteData.map((cat) => [cat.id, cat]));
    const localCategoryMap = new Map(localData.map((cat) => [cat.id, cat]));

    // 检查哪些分类在本地但不在远程 (本地新增的分类)
    for (const localCategory of localData) {
      const remoteCategory = remoteCategoryMap.get(localCategory.id);

      if (!remoteCategory) {
        // 分类只在本地存在 (新增)
        result.categoriesAdded.push(localCategory);

        // 该分类中的所有网站也都是新增的
        for (const website of localCategory.nav) {
          result.websitesAdded.push({
            categoryTitle: localCategory.title,
            website: website,
          });
        }
      } else {
        // 分类在本地和远程都存在，检查具体差异
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
          result.categoriesModified.push({
            category: localCategory,
            changes: categoryChanges,
          });
        }

        // 检查分类中的网站差异
        const localWebsiteMap = new Map(
          localCategory.nav.map((website) => [website.id, website])
        );
        const remoteWebsiteMap = new Map(
          remoteCategory.nav.map((website) => [website.id, website])
        );

        // 检查哪些网站在本地但不在远程 (新增网站)
        for (const localWebsite of localCategory.nav) {
          if (!remoteWebsiteMap.has(localWebsite.id)) {
            result.websitesAdded.push({
              categoryTitle: localCategory.title,
              website: localWebsite,
            });
          }
        }

        // 检查哪些网站在远程但不在本地 (删除网站)
        for (const remoteWebsite of remoteCategory.nav) {
          if (!localWebsiteMap.has(remoteWebsite.id)) {
            result.websitesRemoved.push({
              categoryTitle: remoteCategory.title,
              website: remoteWebsite,
            });
          }
        }

        // 检查哪些网站在本地和远程都存在但内容不同 (修改网站)
        for (const localWebsite of localCategory.nav) {
          const remoteWebsite = remoteWebsiteMap.get(localWebsite.id);

          if (remoteWebsite) {
            // 网站在本地和远程都存在，检查是否有修改
            const websiteChanges: WebsiteChange['changes'] = {};

            if (localWebsite.name !== remoteWebsite.name) {
              websiteChanges.name = {
                from: remoteWebsite.name || '',
                to: localWebsite.name || '',
              };
            }
            if (localWebsite.desc !== remoteWebsite.desc) {
              websiteChanges.desc = {
                from: remoteWebsite.desc || '',
                to: localWebsite.desc || '',
              };
            }
            if (localWebsite.url !== remoteWebsite.url) {
              websiteChanges.url = {
                from: remoteWebsite.url || '',
                to: localWebsite.url || '',
              };
            }
            if (localWebsite.icon !== remoteWebsite.icon) {
              websiteChanges.icon = {
                from: remoteWebsite.icon || '',
                to: localWebsite.icon || '',
              };
            }
            if (localWebsite.rate !== remoteWebsite.rate) {
              websiteChanges.rate = {
                from: remoteWebsite.rate || 0,
                to: localWebsite.rate || 0,
              };
            }
            if (localWebsite.top !== remoteWebsite.top) {
              websiteChanges.top = {
                from: remoteWebsite.top || false,
                to: localWebsite.top || false,
              };
            }
            if (localWebsite.ownVisible !== remoteWebsite.ownVisible) {
              websiteChanges.ownVisible = {
                from: remoteWebsite.ownVisible || false,
                to: localWebsite.ownVisible || false,
              };
            }

            if (Object.keys(websiteChanges).length > 0) {
              result.websitesModified.push({
                categoryTitle: localCategory.title,
                websiteId: localWebsite.id,
                changes: websiteChanges,
              });
            }
          }
        }
      }
    }

    // 检查哪些分类在远程但不在本地 (删除的分类)
    for (const remoteCategory of remoteData) {
      if (!localCategoryMap.has(remoteCategory.id)) {
        result.categoriesRemoved.push(remoteCategory);

        // 该分类中的所有网站也都是删除的
        for (const website of remoteCategory.nav) {
          result.websitesRemoved.push({
            categoryTitle: remoteCategory.title,
            website: website,
          });
        }
      }
    }

    return result;
  },
}));
