'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import DefaultIcon, { isIconUrlFailed, markIconUrlAsFailed } from '@/components/DefaultIcon';
import UnifiedLayout from '@/components/UnifiedLayout';

export default function Home() {
  const { categories, loading, fetchCategories } = useNavStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        <div className="flex justify-center items-center h-screen w-full">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // 获取第一个分类（假设只有一个分类）
  const category = categories.length > 0 ? categories[0] : null;

  // 过滤网站
  const filteredWebsites = category?.nav.filter(website =>
    website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    website.desc.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
      >
        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 左侧分类菜单 */}
      <div className={`fixed lg:sticky lg:top-0 z-10 w-64 bg-white dark:bg-gray-800 shadow-lg h-screen overflow-y-auto transition-transform duration-300 ease-in-out transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2 text-xl">{category?.icon || '🌐'}</span>
              发现导航
            </h1>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 搜索框 */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索网站..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute right-2 top-2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* 分类信息 */}
          {category && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <span className="mr-2">{category.icon}</span>
                {category.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                共 {category.nav.length} 个网站
              </p>
            </div>
          )}

          {/* 网站统计 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            搜索结果: {filteredWebsites.length} 个网站
          </div>
        </div>
      </div>

      {/* 遮罩层（移动端） */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-0"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-6">
          {!category ? (
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
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">暂无数据</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">当前没有可用的网站分类。</p>
            </div>
          ) : (
            <div>
              {filteredWebsites.length === 0 ? (
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
                  <p className="mt-1 text-gray-500 dark:text-gray-400">没有找到与 "{searchQuery}" 相关的网站。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredWebsites.map((website) => (
                    <a
                      key={website.id}
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md flex flex-col h-full">
                        <div className="flex items-start">
                          <>
                            {website.icon && !isIconUrlFailed(website.icon) ? (
                              <img
                                src={website.icon}
                                alt={website.name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                                onError={(e) => {
                                  // 如果图标加载失败，标记为失败并显示默认图标
                                  markIconUrlAsFailed(website.icon);
                                  // 隐藏失败的图标
                                  e.currentTarget.style.display = 'none';
                                  // 显示默认图标
                                  const defaultIconElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (defaultIconElement) {
                                    defaultIconElement.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3"
                              style={{ display: (website.icon && !isIconUrlFailed(website.icon)) ? 'none' : 'flex' }}
                            >
                              <DefaultIcon />
                            </div>
                          </>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {website.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 grow">
                              {website.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}