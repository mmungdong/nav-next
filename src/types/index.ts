export interface IWebsite {
  id: number;
  name: string;
  desc: string;
  url: string;
  icon: string;
  rate?: number; // 0-5
  top?: boolean;
  ownVisible?: boolean;
  topTypes?: number[];
  [key: string]: string | number | boolean | number[] | undefined; // 更具体的类型
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
