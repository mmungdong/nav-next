'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';

export default function SystemPage() {
  const { categories, loading, fetchCategories } = useNavStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">系统管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">网站管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">管理网站分类和网站信息</p>
          <a
            href="/system/web"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">标签管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">管理网站标签</p>
          <a
            href="/system/tag"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">搜索管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">配置搜索功能</p>
          <a
            href="/system/search"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">系统设置</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">配置系统参数</p>
          <a
            href="/system/setting"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">组件管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">管理系统组件</p>
          <a
            href="/system/component"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">收录管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">管理网站收录</p>
          <a
            href="/system/collect"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">书签管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">管理书签数据</p>
          <a
            href="/system/bookmark"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">系统信息</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">查看系统信息</p>
          <a
            href="/system/info"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">配置管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">管理系统配置</p>
          <a
            href="/system/config"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            进入管理
          </a>
        </div>
      </div>
    </div>
  );
}