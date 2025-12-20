'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import DefaultIcon, {
  isIconUrlFailed,
} from '@/components/DefaultIcon';
import Image from 'next/image';

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

  // 过滤分类
  const filteredCategories = categories.filter(
    (category) =>
      category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.nav.some(
        (website) =>
          website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          website.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

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

      {/* 分类列表 */}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
