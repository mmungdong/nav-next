import { create } from 'zustand';
import { ICategory, ISettings } from '@/types';

interface NavState {
  categories: ICategory[];
  settings: ISettings;
  loading: boolean;
  fetchCategories: () => Promise<void>;
  updateCategories: (categories: ICategory[]) => void;
  saveCategories: (categories: ICategory[]) => Promise<void>;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
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
          tags: [
            {
              id: 1,
              name: '搜索',
              color: '#108ee9',
              desc: '',
              isInner: false,
              noOpen: false,
              sort: 1,
            },
          ],
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
          tags: [
            {
              id: 2,
              name: '开发',
              color: '#2db7f5',
              desc: '',
              isInner: false,
              noOpen: false,
              sort: 2,
            },
          ],
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
          tags: [
            {
              id: 3,
              name: '文档',
              color: '#87d068',
              desc: '',
              isInner: false,
              noOpen: false,
              sort: 3,
            },
          ],
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
}));
