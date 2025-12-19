export interface IWebTag {
  id: number;
  name: string;
  color: string;
  desc: string;
  isInner: boolean;
  noOpen: boolean;
  sort: number;
}

export interface IWebsite {
  id: number;
  name: string;
  desc: string;
  url: string;
  icon: string;
  tags: IWebTag[];
  rate: number; // 0-5
  top: boolean;
  ownVisible: boolean;
  [key: string]: any; // 其他字段
}

export interface ICategory {
  id: number;
  title: string;
  icon: string;
  nav: IWebsite[];
}

export interface ISettings {
  [key: string]: any;
}