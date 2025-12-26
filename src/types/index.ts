export interface IWebsite {
  id: number;
  name: string;
  desc: string;
  url: string;
  icon?: string; // 使图标可选，因为不是所有网站都有图标
  rate?: number; // 0-5
  top?: boolean;
  ownVisible?: boolean;
  topTypes?: number[];
}

export interface ICategory {
  id: number;
  title: string;
  icon?: string;
  nav: IWebsite[];
}

export interface ISettings {
  [key: string]: string | number | boolean | object | null | undefined;
}

// 添加更具体的类型定义
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

// 网站配置类型
export interface IWebsiteConfig {
  showRatings: boolean;
  showTags: boolean;
  defaultIcon: string;
  enableSearch: boolean;
}
