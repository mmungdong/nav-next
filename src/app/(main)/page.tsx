'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavStore } from '@/stores/navStore';
import { animationConfig } from '@/lib/animations';
import { ICategory } from '@/types';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { WebsiteCard } from '@/components/WebsiteCard';
import { CategoryNav } from '@/components/CategoryNav';

// 1. 定义统一的文件夹图标组件 (与侧边栏保持一致)
const FolderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

export default function Home() {
  const { categories, loading, fetchCategories } = useNavStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 1. 过滤逻辑 Memoization
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories
      .map((category) => {
        const categoryMatch = category.title.toLowerCase().includes(query);
        const filteredNav = category.nav.filter(
          (website) =>
            website.name.toLowerCase().includes(query) ||
            website.desc.toLowerCase().includes(query)
        );
        if (categoryMatch || filteredNav.length > 0) {
          return {
            ...category,
            nav: filteredNav.length > 0 ? filteredNav : category.nav,
          };
        }
        return null;
      })
      .filter((cat): cat is ICategory => cat !== null);
  }, [categories, searchQuery]);

  // 2. ScrollSpy ID 提取
  const categoryIds = useMemo(
    () => filteredCategories.map((c) => c.id.toString()),
    [filteredCategories]
  );

  // 3. 滚动监听 Hook
  const { activeId, scrollToSection } = useScrollSpy(categoryIds);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* 顶部 Hero 搜索区 */}
      <div className="relative mb-12 max-w-3xl mx-auto text-center pt-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 dark:bg-blue-500/20 blur-[80px] rounded-full -z-10 pointer-events-none" />

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4
              bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl
              border border-gray-200 dark:border-gray-700
              rounded-2xl shadow-lg shadow-blue-500/5
              text-gray-900 dark:text-white placeholder-gray-400
              focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
              transition-all duration-300 text-base"
            placeholder="搜索你感兴趣的工具、文档..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center h-6 px-2 text-xs font-sans font-medium text-gray-400 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900">
              ⌘ K
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative">

        {/* 左侧：粘性侧边栏 */}
        {filteredCategories.length > 0 && (
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700/50 p-2">
              <CategoryNav
                categories={filteredCategories}
                activeId={activeId}
                onSelect={scrollToSection}
              />
            </div>
          </aside>
        )}

        {/* 右侧：主要内容区域 */}
        <main className="flex-1 min-w-0 w-full space-y-12 pb-20">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">未找到相关结果</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                没有找到与 &quot;{searchQuery}&quot; 相关的分类或网站。
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-blue-600 hover:text-blue-500 font-medium text-sm"
              >
                清除搜索
              </button>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                id={category.id.toString()}
                className="scroll-mt-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: animationConfig.card.enter.duration / 1000,
                  ease: animationConfig.easings.easeInOut,
                }}
              >
                {/* 2. 这里的标题区也进行了逻辑替换 */}
                <div className="flex items-center mb-6 pl-1">
                  <span className="mr-3 flex items-center justify-center">
                    {category.icon ? (
                      <span className="text-3xl filter drop-shadow-sm leading-none">{category.icon}</span>
                    ) : (
                      <FolderIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    )}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {category.title}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {category.nav.map((website, index) => (
                    <WebsiteCard
                      key={website.id}
                      website={website}
                      index={index}
                    />
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
