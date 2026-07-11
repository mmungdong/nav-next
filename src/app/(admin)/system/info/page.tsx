'use client';

import { useMemo } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useConfigStore } from '@/stores/configStore';
import { appVersion } from '@/lib/config';

export default function InfoManagementPage() {
  const { categories, getLastSyncTime: getNavSyncTime } = useNavStore();
  const { getLastSyncTime: getConfigSyncTime } = useConfigStore();

  const stats = useMemo(() => {
    const totalWebsites = categories.reduce((sum, c) => sum + c.nav.length, 0);
    const totalCategories = categories.length;
    const tagSet = new Set<string>();
    categories.forEach((c) => c.nav.forEach((w) => (w.tags ?? []).forEach((t) => tagSet.add(t))));
    return { totalWebsites, totalCategories, totalTags: tagSet.size };
  }, [categories]);

  const navSyncTime = getNavSyncTime();
  const configSyncTime = getConfigSyncTime();

  const fmtTime = (t: string | null) => (t ? new Date(t).toLocaleString() : '—');

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">系统信息</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="版本" value={appVersion} color="blue" />
        <StatCard label="网站总数" value={String(stats.totalWebsites)} color="green" />
        <StatCard label="分类数" value={String(stats.totalCategories)} color="yellow" />
        <StatCard label="标签数" value={String(stats.totalTags)} color="purple" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">同步历史</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">网站数据最后同步</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{fmtTime(navSyncTime)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">站点配置最后同步</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{fmtTime(configSyncTime)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-gray-400">
          同步时间在拉取或推送成功后更新。
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'yellow' | 'purple' }) {
  const colorMap = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorMap[color]} mb-3`}>
        <span className="text-xl font-bold">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</h3>
    </div>
  );
}
