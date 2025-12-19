'use client';

import { useEffect, useState, useRef } from 'react';
import { useNavStore } from '@/stores/navStore';
import DefaultIcon, { isIconUrlFailed, markIconUrlAsFailed } from '@/components/DefaultIcon';

export default function Home() {
  const { categories, loading, fetchCategories } = useNavStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 滚动监听效果
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const categories = containerRef.current.querySelectorAll('[id]');
      let currentCategory = '';

      categories.forEach((category) => {
        const rect = category.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          currentCategory = category.getAttribute('id') || '';
        }
      });

      setActiveCategory(currentCategory);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* 移动端导航按钮 */}
      <button
        className="lg:hidden fixed top-24 left-4 z-20 p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        onClick={() => setIsNavOpen(!isNavOpen)}
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 左侧分类导航 */}
      <div className={`fixed lg:relative lg:block z-10 w-64 bg-gradient-to-b from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-xl h-full top-0 overflow-y-auto transition-all duration-300 ease-in-out transform ${isNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:shadow-none`}>
        <div className="p-5">
          {/* Logo 区域 */}
          <div className="flex items-center mb-6 pt-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">发现导航</h1>
          </div>

          {/* 导航标题 */}
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">分类导航</h2>

          {/* 关闭按钮（移动端） */}
          <button
            className="lg:hidden absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setIsNavOpen(false)}
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 分类导航列表 */}
          <nav className="mb-20">
            <ul className="space-y-2">
              {filteredCategories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    onClick={() => setIsNavOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300 ease-in-out transform group ${
                      activeCategory === category.id.toString()
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-[1.02]'
                        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 hover:scale-[1.01] hover:shadow-sm'
                    }`}
                  >
                    <span className="mr-3 text-lg flex-shrink-0">{category.icon}</span>
                    <span className="truncate font-medium">{category.title}</span>
                    {activeCategory === category.id.toString() && (
                      <span className="ml-auto flex-shrink-0">
                        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部信息 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>共 {filteredCategories.length} 个分类</span>
            </div>
          </div>
        </div>
      </div>

      {/* 遮罩层（移动端） */}
      {isNavOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-30 z-0 backdrop-blur-sm"
          onClick={() => setIsNavOpen(false)}
        ></div>
      )}

      {/* 主内容区 */}
      <div className="flex-1">
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

        <div ref={containerRef} className="max-w-7xl mx-auto px-4 py-8">
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
              <div key={category.id} id={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
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
    </div>
  );
}
