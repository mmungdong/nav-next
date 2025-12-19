import { create } from 'zustand';
import { ICategory, IWebsite, ISettings } from '@/types';

interface NavState {
  categories: ICategory[];
  settings: ISettings;
  loading: boolean;
  fetchCategories: () => Promise<void>;
  updateCategories: (categories: ICategory[]) => void;
}

// 转换原始的四层嵌套数据结构为两层结构
const transformCategories = (rawData: any[]): ICategory[] => {
  return rawData.map(category => {
    // 第一层分类
    const websites: IWebsite[] = [];

    // 遍历第二层分类
    if (category.nav && Array.isArray(category.nav)) {
      category.nav.forEach((subCategory: any) => {
        // 遍历第三层分类
        if (subCategory.nav && Array.isArray(subCategory.nav)) {
          subCategory.nav.forEach((subSubCategory: any) => {
            // 获取第四层网站数据
            if (subSubCategory.nav && Array.isArray(subSubCategory.nav)) {
              subSubCategory.nav.forEach((website: any) => {
                websites.push({
                  id: website.id,
                  name: website.name || website.title || '未知网站',
                  desc: website.desc || '',
                  url: website.url || '',
                  icon: website.icon || '',
                  tags: website.tags || [],
                  rate: website.rate || 0,
                  top: website.top || false,
                  ownVisible: website.ownVisible || false,
                  ...website // 保留其他字段
                });
              });
            }
          });
        }
      });
    }

    return {
      id: category.id,
      title: category.title || category.name || '未知分类',
      icon: category.icon || '',
      nav: websites
    };
  });
};

// 模拟数据获取函数
const fetchCategoriesData = async (): Promise<ICategory[]> => {
  // 模拟 API 调用延迟
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 返回模拟数据或从本地文件加载数据
  try {
    // 尝试从本地数据文件加载
    const response = await fetch('/data/simple_db.json');
    if (response.ok) {
      const rawData = await response.json();
      // 转换数据结构
      return transformCategories(rawData);
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
          tags: [{ id: 1, name: '搜索', color: '#108ee9', desc: '', isInner: false, noOpen: false, sort: 1 }],
          rate: 5,
          top: true,
          ownVisible: false
        },
        {
          id: 102,
          name: 'GitHub',
          desc: '全球最大的代码托管平台',
          url: 'https://github.com',
          icon: '',
          tags: [{ id: 2, name: '开发', color: '#2db7f5', desc: '', isInner: false, noOpen: false, sort: 2 }],
          rate: 5,
          top: true,
          ownVisible: false
        }
      ]
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
          tags: [{ id: 3, name: '文档', color: '#87d068', desc: '', isInner: false, noOpen: false, sort: 3 }],
          rate: 5,
          top: true,
          ownVisible: false
        }
      ]
    }
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
  updateCategories: (categories) => set({ categories })
}));