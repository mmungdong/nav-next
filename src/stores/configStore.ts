import { create } from 'zustand';
import { ISiteConfig } from '@/types';
import { owner, repo, branch, configPath } from '@/lib/config';
import { normalizeSiteConfig, validateSiteConfig } from '@/lib/dataValidation';
import { buildResourceKey, RemoteCheckOutcome } from '@/lib/syncTypes';
import {
  createGithubFileAdapter,
  createSyncedResource,
  SyncedResource,
  SyncedResourceSpec,
} from '@/stores/syncedResource';

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

export type { RemoteCheckOutcome };

interface ConfigState extends SyncedResource<ISiteConfig> {
  siteConfig: ISiteConfig;
  fetchConfig: () => Promise<void>;
  saveConfig: (config: ISiteConfig) => boolean;
}

const PUBLIC_CACHE_KEY = 'navnext:public:site-config:v2';
const LAST_SYNC_KEY = 'navnext:lastSync:config';
const LEGACY_KEYS = ['SITE_CONFIG', 'SITE_CONFIG_LAST_SYNC'];
const THROTTLE_MS = 60_000;

const RESOURCE_KEY = buildResourceKey({
  owner,
  repo,
  branch,
  path: configPath,
  userId: owner,
});

const configSpec: SyncedResourceSpec<ISiteConfig, ConfigState> = {
  resourceKey: RESOURCE_KEY,
  legacyKeys: LEGACY_KEYS,
  lastSyncKey: LAST_SYNC_KEY,
  publicCacheKey: PUBLIC_CACHE_KEY,
  publicPath: '/data/site-config.json',
  throttleMs: THROTTLE_MS,
  emptyData: DEFAULT_SITE_CONFIG,
  adapter: createGithubFileAdapter({
    path: configPath,
    validate: validateSiteConfig,
    invalidJsonMessage: '远程 site-config 文件不是合法 JSON，未覆盖本机基线',
  }),
  normalize: normalizeSiteConfig,
  readData: (state) => state.siteConfig,
  writeData: (data) => ({ siteConfig: data }),
  messages: {
    conflict: '远程配置已被其他设备更新，本机草稿保留，请选择版本',
    remoteChanged: '远程配置已更新，本机有未推送的修改',
    peerSaved: '另一标签页保存了站点配置草稿；本页内容未被替换',
    peerCleared: '另一标签页已丢弃或提交了站点配置草稿',
    publicInvalid: '配置校验失败',
    pushCommit: (timestamp) => `Update site-config via Web Console: ${timestamp}`,
  },
};

export const useConfigStore = create<ConfigState>((set, get) => {
  const synced = createSyncedResource<ISiteConfig, ConfigState>(set, get, configSpec);

  return {
    ...synced,
    siteConfig: DEFAULT_SITE_CONFIG,
    fetchConfig: synced.fetchPublicResource,
    saveConfig: synced.saveData,
  };
});
