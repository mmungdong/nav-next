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
import SearchModal from '@/components/SearchModal';
import { animationConfig } from '@/lib/animations';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { categories, loading, fetchCategories } = useNavStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [searchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [userInitiatedNavigation, setUserInitiatedNavigation] = useState(false);
  const [navigationLockEndTime, setNavigationLockEndTime] = useState(0);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // 移动端检测
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile); // 移动端默认关闭侧边栏

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 监听页面的滚动事件，自动更新左侧菜单的选中项
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      // 检查是否仍在锁定期内
      if (userInitiatedNavigation && Date.now() < navigationLockEndTime) {
        return; // 锁定期内不更新
      }

      // 检查是否启用了自动同步
      if (!autoSyncEnabled) {
        return; // 未启用自动同步时不更新
      }

      if (!ticking) {
        requestAnimationFrame(() => {
          if (categories.length === 0) return;

          const scrollPosition = window.scrollY + 200; // 添加偏移量，使切换更早发生
          let currentCategoryId = '';

          // 从上往下遍历分类，找到第一个即将进入视窗或已经在视窗中的分类
          for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const element = document.getElementById(category.id.toString());

            if (element) {
              const elementTop = element.offsetTop;

              // 如果当前分类顶部进入视窗或接近视窗，则标记为当前分类
              if (elementTop <= scrollPosition) {
                currentCategoryId = category.id.toString();
              }

              // 如果当前分类底部已经离开视窗，则跳出循环
              if (elementTop > scrollPosition + 500) {
                break;
              }
            }
          }

          if (currentCategoryId !== activeCategory) {
            setActiveCategory(currentCategoryId);
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    // 延迟绑定滚动事件，确保DOM已经渲染完成
    const timer = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      // 初始化时也触发一次，确保初始状态正确
      handleScroll();
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [
    categories,
    activeCategory,
    userInitiatedNavigation,
    navigationLockEndTime,
    autoSyncEnabled,
  ]);

  // 检测用户手动滚动，及时恢复自动同步
  useEffect(() => {
    const handleUserScroll = () => {
      const now = Date.now();

      // 如果是用户主动滚动且在锁定期内
      if (userInitiatedNavigation && now < navigationLockEndTime) {
        // 立即解锁
        setUserInitiatedNavigation(false);
        setAutoSyncEnabled(true);
        setNavigationLockEndTime(0);
      }
    };

    window.addEventListener('wheel', handleUserScroll);
    window.addEventListener('touchmove', handleUserScroll);

    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
    };
  }, [userInitiatedNavigation, navigationLockEndTime]);

  // 自动解锁定时器，防止锁定状态持续太久
  useEffect(() => {
    if (userInitiatedNavigation && navigationLockEndTime > 0) {
      const timer = setTimeout(() => {
        setUserInitiatedNavigation(false);
        setAutoSyncEnabled(true);
        setNavigationLockEndTime(0);
      }, 2000); // 2秒后自动解锁

      return () => clearTimeout(timer);
    }
  }, [userInitiatedNavigation, navigationLockEndTime]);

  // 当选中的分类改变时，自动滚动菜单到选中项
  useEffect(() => {
    if (activeCategory && menuRef.current) {
      const activeElement = menuRef.current.querySelector(
        `[href="#${activeCategory}"]`
      );
      if (activeElement) {
        // 平滑滚动到选中项，使其在菜单中可见
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        <div className="flex justify-center items-center h-screen w-full">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* 移动端汉堡菜单按钮 */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
            aria-label={sidebarOpen ? "关闭菜单" : "打开菜单"}
          >
            <svg
              className="w-6 h-6 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      )}

      {/* 左侧分类菜单 - 移动端可折叠 */}
      <div
        ref={menuRef}
        className={`
          ${isMobile ? (sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full') : 'w-[180px] sm:w-[200px] md:w-[230px]'}
          fixed md:sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-lg h-screen overflow-y-auto custom-scrollbar
          transition-transform duration-300 ease-in-out
          ${isMobile ? 'md:translate-x-0' : ''}
          flex-shrink-0
        `}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2 text-xl">🌐</span>
              Guidebook
            </h1>
          </div>

          {/* 分类导航列表 */}
          <nav className="mb-4">
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(
                        category.id.toString()
                      );
                      if (element) {
                        // 立即选中菜单项
                        setActiveCategory(category.id.toString());

                        // 设置导航锁定状态
                        setUserInitiatedNavigation(true);
                        setNavigationLockEndTime(Date.now() + 2000); // 2秒锁定
                        setAutoSyncEnabled(false);

                        // 平滑滚动到目标元素
                        element.scrollIntoView({ behavior: 'smooth' });

                        // 移动端点击后关闭侧边栏
                        if (isMobile) {
                          setSidebarOpen(false);
                        }
                      }
                    }}
                    className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-colors ${
                      activeCategory === category.id.toString()
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onMouseEnter={(e) => {
                      // 鼠标悬停时改变图标为📂
                      const iconElement =
                        e.currentTarget.querySelector('.category-icon');
                      if (iconElement) {
                        iconElement.textContent = '📂';
                      }
                    }}
                    onMouseLeave={(e) => {
                      // 鼠标离开时根据激活状态设置图标
                      const iconElement =
                        e.currentTarget.querySelector('.category-icon');
                      if (iconElement) {
                        if (activeCategory === category.id.toString()) {
                          iconElement.textContent = '📂';
                        } else {
                          iconElement.textContent = '📁';
                        }
                      }
                    }}
                  >
                    <span className="mr-3 text-xl category-icon">
                      {category.icon ||
                        (activeCategory === category.id.toString()
                          ? '📂'
                          : '📁')}
                    </span>
                    <span className="truncate">{category.title}</span>
                    {activeCategory === category.id.toString() && (
                      <span className="ml-auto">
                        <svg
                          className="w-4 h-4 animate-pulse"
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
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部信息 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            共 {categories.length} 个分类
          </div>
        </div>

        {/* 移动端关闭按钮 */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="关闭菜单"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 遮罩层 - 移动端显示 */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <div className={`flex-1 min-w-0 ${isMobile ? 'pt-16 md:pt-0' : ''}`}>
        <div className="p-4 lg:p-6 lg:px-20 mx-auto">
          {children}
        </div>
      </div>

      {/* 右下角功能图标 */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {/* 置顶按钮 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
          aria-label="回到顶部"
        >
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        {/* 搜索按钮 */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
          aria-label="搜索"
        >
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* 管理页面按钮 - 仅在用户已登录时显示 */}
        {isAuthenticated && (
          <button
            onClick={() => window.open('/system', '_blank')}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
            aria-label="前往管理页面"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}