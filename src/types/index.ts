export type ThemeMode = 'light' | 'dark' | 'system';

export interface ISiteSettings {
  name: string;
  description: string;
  theme: ThemeMode;
}

export interface ISearchEngine {
  id: string;
  name: string;
  url: string; // search URL template, query appended directly
  icon: string;
}

export interface ISiteConfig {
  site: ISiteSettings;
  search: { engines: ISearchEngine[] };
}

export interface IWebsite {
  id: number;
  name: string;
  desc: string;
  url: string;
  icon?: string;
  tags?: string[];
  rate?: number; // 0-5
  top?: boolean;
  ownVisible?: boolean;
  topTypes?: number[];
  index?: number;
}

export interface ICategory {
  id: number;
  title: string;
  icon?: string;
  nav: IWebsite[];
}

export interface IUserData {
  name: string;
  email: string;
  avatar?: string;
  permissions?: string[];
}

export interface ITag {
  id: number;
  name: string;
  color?: string;
}

// 搜索结果类型
export interface ISearchResult {
  id: number;
  title: string;
  description: string;
  url: string;
  type: 'website' | 'category' | 'tag';
  categoryTitle?: string;
}

// 网站评分类型
export interface IWebsiteRating {
  websiteId: number;
  rating: number;
  userId?: string;
  timestamp: number;
}

// 权限类型
export interface IPermission {
  resource: string;
  actions: string[];
}

// 保留：仍被 search 管理页引用，Task 9 清除引用后删除
export interface ISearchConfig {
  id: number;
  name: string;
  url: string;
  icon: string;
  sort: number;
  isActive: boolean;
}
