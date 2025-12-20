import { create } from 'zustand';
import { ICategory, ISettings } from '@/types';

interface NavState {
  categories: ICategory[];
  settings: ISettings;
  loading: boolean;
  fetchCategories: () => Promise<void>;
  updateCategories: (categories: ICategory[]) => void;
}

// 模拟数据获取函数
const fetchCategoriesData = async (): Promise<ICategory[]> => {
  // 模拟 API 调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 返回模拟数据或从本地文件加载数据
  try {
    // 尝试从本地数据文件加载
    const response = await fetch('/data/db.json');
    if (response.ok) {
      const rawData = await response.json();

      // db.json现在已经是两层结构，直接返回
      return rawData.map((category: ICategory) => ({
        id: category.id,
        title: category.title || category.name || '未知分类',
        icon: category.icon || '',
        nav: category.nav || [],
      }));
    }
  } catch (error) {
    console.warn('Failed to load local data, using mock data:', error);
  }

  // 如果无法加载本地数据，返回模拟数据
  return [
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
}));
