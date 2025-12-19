'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import DefaultIcon, { isIconUrlFailed, markIconUrlAsFailed } from '@/components/DefaultIcon';

export default function Home() {
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

  // 过滤分类和网站
  const filteredCategories = categories.filter(category => {
    // 检查分类标题是否匹配搜索查询
    if (category.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }

    // 检查分类下的网站是否匹配搜索查询
    return category.nav.some(website =>
      website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      website.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部搜索栏 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">发现导航</h1>
            <div className="relative w-96">
              <input
                type="text"
                placeholder="搜索网站或分类..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">未找到结果</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">没有找到与 "{searchQuery}" 相关的分类或网站。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    {category.title}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {category.nav.map((website) => (
                      <a
                        key={website.id}
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md flex flex-col h-full">
                          <div className="flex items-start">
                            {website.icon && !isIconUrlFailed(website.icon) ? (
                              <img
                                src={website.icon}
                                alt={website.name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                                onError={(e) => {
                                  // 如果图标加载失败，标记为失败并显示默认图标
                                  markIconUrlAsFailed(website.icon);
                                  // 移除原来的图片元素
                                  e.currentTarget.remove();
                                  // 创建默认图标容器
                                  const defaultIconContainer = document.createElement('div');
                                  defaultIconContainer.className = 'w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3';
                                  defaultIconContainer.innerHTML = `
                                    <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <defs>
                                        <linearGradient id="defaultIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor="#4F46E5" />
                                          <stop offset="100%" stopColor="#7C3AED" />
                                        </linearGradient>
                                      </defs>
                                      <rect width="40" height="40" rx="10" fill="url(#defaultIconGradient)" />
                                      <circle cx="20" cy="18" r="5" fill="white" opacity="0.9" />
                                      <rect x="12" y="25" width="16" height="3" rx="1.5" fill="white" opacity="0.9" />
                                    </svg>
                                  `;
                                  // 插入到原来的位置
                                  e.currentTarget.parentNode?.insertBefore(defaultIconContainer, e.currentTarget.nextSibling);
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                <DefaultIcon />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {website.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 grow">
                                {website.desc}
                              </p>
                            </div>
                          </div>
                          {/* 标签显示已移除 */}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
