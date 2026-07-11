import { create } from 'zustand';
import { ISiteConfig } from '@/types';
import { getFileContent, updateFileContent, decodeContent } from '@/lib/githubApi';
import { owner, repo, branch, configPath } from '@/lib/config';

export const DEFAULT_SITE_CONFIG: ISiteConfig = {
  site: { name: 'Nav Next', description: '个人导航站', theme: 'system' },
  search: {
    engines: [
      { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: 'google' },
      { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'bing' },
      { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', icon: 'baidu' },
    ],
  },
};

const STORAGE_KEY = 'SITE_CONFIG';
const LAST_SYNC_KEY = 'SITE_CONFIG_LAST_SYNC';

interface ConfigState {
  siteConfig: ISiteConfig;
  loading: boolean;
  dirty: boolean;
  remoteSnapshot: ISiteConfig;
  fetchConfig: (isAdmin?: boolean) => Promise<void>;
  saveConfig: (config: ISiteConfig) => void;
  forcePull: (githubToken: string) => Promise<boolean>;
  pushToRemote: (githubToken: string) => Promise<boolean>;
  discardLocal: () => void;
  hasRemoteChanged: (githubToken: string) => Promise<boolean>;
  getLastSyncTime: () => string | null;
  clearLocalData: () => void;
}

const loadFromLocalStorage = (): ISiteConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as ISiteConfig;
  } catch (error) {
    console.warn('Failed to load site config from localStorage:', error);
  }
  return null;
};

const saveToLocalStorage = (config: ISiteConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('Failed to save site config to localStorage:', error);
  }
};

const fetchConfigData = async (isAdmin = false): Promise<ISiteConfig> => {
  if (isAdmin) {
    const stored = loadFromLocalStorage();
    if (stored) return stored;
  } else {
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY);
    const stored = loadFromLocalStorage();
    if (stored && lastSyncTime) {
      const syncTime = new Date(lastSyncTime).getTime();
      const currentTime = new Date().getTime();
      const CACHE_EXPIRE_TIME = 60 * 60 * 1000; // 1h
      if (currentTime - syncTime < CACHE_EXPIRE_TIME) return stored;
    }
  }

  try {
    const response = await fetch('/data/site-config.json');
    if (response.ok) {
      const config = (await response.json()) as ISiteConfig;
      saveToLocalStorage(config);
      return config;
    }
  } catch (error) {
    console.warn('Failed to load site-config.json, using default:', error);
  }
  return DEFAULT_SITE_CONFIG;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  siteConfig: DEFAULT_SITE_CONFIG,
  loading: true,
  dirty: false,
  remoteSnapshot: DEFAULT_SITE_CONFIG,
  fetchConfig: async (isAdmin = false) => {
    const config = await fetchConfigData(isAdmin);
    set({ siteConfig: config, loading: false });
  },
  saveConfig: (config) => {
    saveToLocalStorage(config);
    set({ siteConfig: config, dirty: true });
  },
  forcePull: async (githubToken: string) => {
    try {
      const fileInfo = await getFileContent(githubToken, owner, repo, configPath, branch);
      if (!fileInfo.content) return false;
      const config = JSON.parse(decodeContent(fileInfo.content)) as ISiteConfig;
      saveToLocalStorage(config);
      set({ siteConfig: config, remoteSnapshot: config, dirty: false, loading: false });
      return true;
    } catch (error) {
      console.error('拉取 site-config 失败:', error);
      return false;
    }
  },
  pushToRemote: async (githubToken: string) => {
    const { siteConfig } = get();
    try {
      const fileInfo = await getFileContent(githubToken, owner, repo, configPath, branch);
      const content = JSON.stringify(siteConfig, null, 2);
      const commitMessage = `Update site-config via Web Console: ${new Date().toLocaleString()}`;
      await updateFileContent(githubToken, owner, repo, configPath, content, commitMessage, branch, fileInfo.sha);
      saveToLocalStorage(siteConfig);
      set({ remoteSnapshot: siteConfig, dirty: false });
      return true;
    } catch (error) {
      console.error('推送 site-config 失败:', error);
      return false;
    }
  },
  discardLocal: () => {
    const { remoteSnapshot } = get();
    saveToLocalStorage(remoteSnapshot);
    set({ siteConfig: remoteSnapshot, dirty: false });
  },
  hasRemoteChanged: async (githubToken: string) => {
    try {
      const fileInfo = await getFileContent(githubToken, owner, repo, configPath, branch);
      if (!fileInfo.content) return false;
      const remote = JSON.parse(decodeContent(fileInfo.content)) as ISiteConfig;
      return JSON.stringify(remote) !== JSON.stringify(get().remoteSnapshot);
    } catch (error) {
      console.error('检查 site-config 远程变更失败:', error);
      return false;
    }
  },
  getLastSyncTime: (): string | null => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.warn('Failed to get last sync time:', error);
      return null;
    }
  },
  clearLocalData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      set({ siteConfig: DEFAULT_SITE_CONFIG, dirty: false, remoteSnapshot: DEFAULT_SITE_CONFIG });
    } catch (error) {
      console.warn('Failed to clear local data:', error);
    }
  },
}));
