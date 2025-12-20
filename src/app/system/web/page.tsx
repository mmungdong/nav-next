'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import DefaultIcon, { isIconUrlFailed } from '@/components/DefaultIcon';
import Image from 'next/image';
import { ICategory, IWebsite } from '@/types';

export default function WebManagementPage() {
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

  // 站内搜索逻辑 - 分类和网站分开显示
  const { filteredCategories, filteredWebsites } = searchQuery.trim()
    ? (() => {
        // 分别筛选匹配的分类和网站
        const matchedCategories: ICategory[] = [];
        const matchedWebsites: { category: ICategory; website: IWebsite }[] =
          [];

        categories.forEach((category) => {
          // 检查分类标题是否匹配（用于分类搜索）
          if (
            category.title.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            matchedCategories.push(category);
          }

          // 检查该分类下的网站是否匹配（用于网站搜索）
          category.nav.forEach((website) => {
            if (
              website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              website.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
              website.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (website.tags &&
                website.tags.some(
                  (tag) =>
                    tag.name &&
                    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
                ))
            ) {
              matchedWebsites.push({ category, website });
            }
          });
        });

        return {
          filteredCategories: matchedCategories,
          filteredWebsites: matchedWebsites,
        };
      })()
    : { filteredCategories: categories, filteredWebsites: [] };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          网站管理
        </h1>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
          添加分类
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索分类或网站..."
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
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* 搜索结果 */}
      {searchQuery.trim() ? (
        <div className="space-y-6">
          {/* 分类搜索结果 */}
          {filteredCategories.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                匹配的分类
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      // 滚动到对应分类位置的逻辑可以在这里实现
                      console.log(`跳转到分类: ${category.title}`);
                    }}
                  >
                    <span className="text-2xl mr-3">{category.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.nav.length} 个网站
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 网站搜索结果 */}
          {filteredWebsites.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                匹配的网站
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredWebsites.map(({ category, website }) => (
                  <div
                    key={website.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 flex flex-col h-full transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start">
                      <>
                        {website.icon && !isIconUrlFailed(website.icon) ? (
                          <Image
                            src={website.icon}
                            alt={website.name}
                            width={40}
                            height={40}
                            className="rounded-lg object-cover mr-3"
                          />
                        ) : null}
                        <div
                          className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3"
                          style={{
                            display:
                              website.icon && !isIconUrlFailed(website.icon)
                                ? 'none'
                                : 'flex',
                          }}
                        >
                          <DefaultIcon />
                        </div>
                      </>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {website.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 grow">
                          {website.desc}
                        </p>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {category.title}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end space-x-2">
                      <button className="text-blue-500 hover:text-blue-700 text-sm">
                        编辑
                      </button>
                      <button className="text-red-500 hover:text-red-700 text-sm">
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无结果 */}
          {filteredCategories.length === 0 && filteredWebsites.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.1-5.7-2.828-1.409 1.728-3.36 2.828-5.7 2.828a7.962 7.962 0 015.7-5.7c0-.34.034-.674.1-.992H3a1 1 0 00-1 1v9a1 1 0 001 1h18a1 1 0 001-1v-9a1 1 0 00-1-1h-3.1c.066.318.1.652.1.992a7.96 7.96 0 01-5.7 5.7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                未找到匹配的结果
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                没有找到与 &quot;{searchQuery}&quot; 相关的分类或网站
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 默认分类列表 */
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">{category.icon}</span>
                  {category.title}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    ({category.nav.length})
                  </span>
                </h2>
                <div className="flex space-x-2">
                  <button className="text-blue-500 hover:text-blue-700">
                    编辑
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    删除
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    网站列表
                  </h3>
                  <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors">
                    添加网站
                  </button>
                </div>

                {category.nav.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    该分类下没有网站
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {category.nav.map((website) => (
                      <div
                        key={website.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 flex flex-col h-full transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-start">
                          <>
                            {website.icon && !isIconUrlFailed(website.icon) ? (
                              <Image
                                src={website.icon}
                                alt={website.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover mr-3"
                              />
                            ) : null}
                            <div
                              className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3"
                              style={{
                                display:
                                  website.icon && !isIconUrlFailed(website.icon)
                                    ? 'none'
                                    : 'flex',
                              }}
                            >
                              <DefaultIcon />
                            </div>
                          </>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {website.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 grow">
                              {website.desc}
                            </p>
                          </div>
                        </div>

                        {/* 标签显示已移除 */}

                        <div className="mt-3 flex justify-end space-x-2">
                          <button className="text-blue-500 hover:text-blue-700 text-sm">
                            编辑
                          </button>
                          <button className="text-red-500 hover:text-red-700 text-sm">
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
