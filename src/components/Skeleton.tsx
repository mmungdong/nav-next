'use client';

import { motion } from 'framer-motion';

// 骨架卡片组件
export const SkeletonCard = ({
  className = ''
}: {
  className?: string
}) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse ${className}`} />
);

// 骨架文本组件
export const SkeletonText = ({
  lines = 1,
  className = ''
}: {
  lines?: number;
  className?: string
}) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        } h-4`}
        style={{ animationDelay: `${i * 100}ms` }}
      />
    ))}
  </div>
);

// 搜索框骨架
export const SkeletonSearchBox = () => (
  <div className="relative mb-12 max-w-3xl mx-auto">
    <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
  </div>
);

// 侧边栏分类骨架
export const SkeletonCategoryNav = () => (
  <div className="space-y-2 p-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center px-4 py-3 rounded-xl"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mr-3" />
        <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-6 h-5 bg-gray-200 dark:bg-gray-700 rounded ml-2 animate-pulse" />
      </div>
    ))}
  </div>
);

// 分类区块骨架
export const SkeletonCategorySection = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-12">
    {Array.from({ length: count }).map((_, sectionIndex) => (
      <motion.div
        key={sectionIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: sectionIndex * 0.1 }}
      >
        {/* 分类标题 */}
        <div className="flex items-center mb-6 pl-1">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse mr-3" />
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* 网站卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, cardIndex) => (
            <SkeletonCard key={cardIndex} className="h-28" />
          ))}
        </div>
      </motion.div>
    ))}
  </div>
);

// 主页面骨架（全屏加载）
export const SkeletonLoader = () => (
  <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <SkeletonSearchBox />

    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* 左侧侧边栏骨架 */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-8">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700/50 p-2">
          <SkeletonCategoryNav />
        </div>
      </aside>

      {/* 右侧内容骨架 */}
      <main className="flex-1 min-w-0 w-full">
        <SkeletonCategorySection count={4} />
      </main>
    </div>
  </div>
);

// 网站卡片骨架（用于详情页）
export const SkeletonWebsiteCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="flex-1">
        <SkeletonText lines={2} />
      </div>
    </div>
  </div>
);