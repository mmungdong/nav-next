'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavStore } from '@/stores/navStore';
import { useAuthStore } from '@/stores/authStore';
import DefaultIcon, {
  isIconUrlFailed,
  markIconUrlAsFailed,
} from '@/components/DefaultIcon';
import OptimizedImage from '@/components/OptimizedImage';
import { animationConfig } from '@/lib/animations';

export default function Home() {
  const { categories, loading, fetchCategories } = useNavStore();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [userInitiatedNavigation, setUserInitiatedNavigation] = useState(false);
  const [navigationLockEndTime, setNavigationLockEndTime] = useState(0);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 过滤分类和网站
  const filteredCategories = categories.filter((category) => {
    // 检查分类标题是否匹配搜索查询
    if (category.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }

    // 检查分类下的网站是否匹配搜索查询
    return category.nav.some(
      (website) =>
        website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        website.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
            未找到结果
          </h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            没有找到与 &quot;{searchQuery}&quot; 相关的分类或网站。
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.id}
              id={category.id.toString()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: animationConfig.card.enter.duration / 1000,
                ease: animationConfig.easings.easeInOut,
                delay:
                  categoryIndex * animationConfig.card.enter.staggerDelay,
              }}
            >
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2 text-2xl">
                    {category.icon || '📁'}
                  </span>
                  {category.title}
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                  {category.nav.map((website, websiteIndex) => (
                    <motion.a
                      key={website.id}
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration:
                          animationConfig.card.enter.duration / 1000,
                        ease: animationConfig.easings.easeInOut,
                        delay:
                          (websiteIndex *
                            animationConfig.card.enter.staggerDelay) /
                          2,
                      }}
                      whileHover={{
                        y: animationConfig.card.hover.y,
                        transition: {
                          duration:
                            animationConfig.card.hover.duration / 1000,
                        },
                      }}
                    >
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md flex flex-col h-full max-h-[90px] overflow-hidden">
                        <div className="flex items-start">
                          <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                            <OptimizedImage
                              src={website.icon}
                              alt={website.name}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-lg object-cover"
                              fallbackClassName="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1">
                              {website.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {website.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}