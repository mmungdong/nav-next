'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Folder } from 'lucide-react';
import { ICategory } from '@/types';
import { useState, useMemo } from 'react';
import { scrollToTop } from '@/lib/animations';
import { useSearch } from '@/components/SearchContext';

const DEFAULT_TITLE = '导航';

interface MobileNavProps {
  categories: ICategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const MobileNav = ({ categories, activeId, onSelect }: MobileNavProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openSearch } = useSearch();

  // 使用 useMemo 缓存当前激活的分类
  const activeCategory = useMemo(
    () => categories.find((c) => c.id.toString() === activeId),
    [categories, activeId]
  );

  return (
    <>
      {/* 底部导航栏 - 常驻显示 */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* 毛玻璃背景 */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 safe-area-pb">
          <div className="flex items-center justify-around px-2 py-2">
            {/* 当前激活的分类显示 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 flex items-center justify-center py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            >
              {activeCategory?.icon ? (
                <span className="text-lg mr-2">{activeCategory.icon}</span>
              ) : (
                <Folder className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm font-medium truncate max-w-[80px]">
                {activeCategory?.title || DEFAULT_TITLE}
              </span>
              <svg
                className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* 回到顶部 */}
            <button
              onClick={() => window.scrollTo(scrollToTop)}
              className="flex flex-col items-center justify-center py-2 px-4 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-xs mt-1">顶部</span>
            </button>

            {/* 搜索按钮 */}
            <button
              onClick={openSearch}
              className="flex flex-col items-center justify-center py-2 px-4 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs mt-1">搜索</span>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* 分类选择弹窗 */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsExpanded(false)}
            />

            {/* 底部弹窗 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden max-h-[70vh] overflow-hidden rounded-t-2xl"
            >
              <div className="bg-white dark:bg-gray-900 overflow-y-auto max-h-[70vh]">
                {/* 拖动手柄 */}
                <div className="flex justify-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>

                {/* 标题 */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    选择分类
                  </h3>
                </div>

                {/* 分类列表 */}
                <div className="p-4 space-y-2">
                  {categories.map((category) => {
                    const isActive = activeId === category.id.toString();
                    return (
                      <motion.button
                        key={category.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          onSelect(category.id.toString());
                          setIsExpanded(false);
                        }}
                        className={`
                          w-full flex items-center p-3 rounded-xl transition-all
                          ${isActive
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        {category.icon ? (
                          <span className="text-2xl mr-3">{category.icon}</span>
                        ) : (
                          <Folder className="w-6 h-6 mr-3" />
                        )}
                        <span className="flex-1 text-left font-medium">{category.title}</span>
                        <span className={`
                          text-xs px-2 py-1 rounded-full
                          ${isActive
                            ? 'bg-white/20'
                            : 'bg-gray-100 dark:bg-gray-800'
                          }
                        `}>
                          {category.nav.length}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;