'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import { ThemeMode } from '@/types';

export default function SettingManagementPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { siteConfig, saveConfig, pushToRemote, dirty } = useConfigStore();
  const { githubToken } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // siteConfig.site is the single source of truth — no local form shadow.
  const update = (patch: Partial<typeof siteConfig.site>) => {
    saveConfig({ ...siteConfig, site: { ...siteConfig.site, ...patch } });
  };

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value);
    update({ theme: value });
  };

  const handleSave = async () => {
    if (!githubToken) {
      setMessage({ type: 'error', text: '未配置 GitHub Token' });
      return;
    }
    setSaving(true);
    const ok = await pushToRemote(githubToken);
    setSaving(false);
    setMessage(
      ok
        ? { type: 'success', text: '已保存并推送到远程' }
        : { type: 'error', text: '推送失败，请重试' }
    );
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        系统设置
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 max-w-2xl space-y-6">
        <div>
          <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            网站名称
          </label>
          <input
            type="text"
            id="siteName"
            value={siteConfig.site.name}
            onChange={(e) => update({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            网站描述
          </label>
          <textarea
            id="siteDescription"
            value={siteConfig.site.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            主题
          </label>
          <select
            id="theme"
            value={mounted ? (theme as ThemeMode) : 'system'}
            disabled={!mounted}
            onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus-ring dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="light">浅色主题</option>
            <option value="dark">深色主题</option>
            <option value="system">跟随系统</option>
          </select>
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className={`text-sm ${dirty ? 'text-amber-600' : 'text-gray-400'}`}>
            {dirty ? '● 有未保存的改动' : '○ 已同步'}
          </span>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {saving ? '保存中…' : '保存并推送'}
          </button>
        </div>
      </div>
    </div>
  );
}
