'use client';

import { useEffect } from 'react';
import { useNavStore } from '@/stores/navStore';

export default function SystemPage() {
  const { loading, fetchCategories } = useNavStore();

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

  const modules = [
    {
      name: '网站管理',
      description: '管理网站分类和网站信息',
      href: '/system/web',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      name: '搜索管理',
      description: '配置搜索功能',
      href: '/system/search',
      color: 'from-purple-500 to-violet-600',
    },
    {
      name: '系统设置',
      description: '配置系统参数',
      href: '/system/setting',
      color: 'from-yellow-500 to-amber-600',
    },
    {
      name: '组件管理',
      description: '管理系统组件',
      href: '/system/component',
      color: 'from-red-500 to-rose-600',
    },
    {
      name: '收录管理',
      description: '管理网站收录',
      href: '/system/collect',
      color: 'from-indigo-500 to-blue-600',
    },
    {
      name: '书签管理',
      description: '管理书签数据',
      href: '/system/bookmark',
      color: 'from-pink-500 to-rose-600',
    },
    {
      name: '系统信息',
      description: '查看系统信息',
      href: '/system/info',
      color: 'from-cyan-500 to-teal-600',
    },
    {
      name: '配置管理',
      description: '管理系统配置',
      href: '/system/config',
      color: 'from-orange-500 to-amber-600',
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        系统管理
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <a
            key={module.href}
            href={module.href}
            className="group block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${module.color} p-5`}>
              <h2 className="text-lg font-semibold text-white">
                {module.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {module.description}
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">
                <span className="text-sm font-medium">进入管理</span>
                <svg
                  className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
