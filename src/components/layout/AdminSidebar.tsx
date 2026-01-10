'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animationConfig } from '@/lib/animations';

interface AdminSidebarProps {
  onLogout?: () => void;
}

const menuItems = [
  { name: '网站管理', href: '/system/web' },
  { name: '搜索管理', href: '/system/search' },
  { name: '系统设置', href: '/system/setting' },
  { name: '组件管理', href: '/system/component' },
  { name: '收录管理', href: '/system/collect' },
  { name: '书签管理', href: '/system/bookmark' },
  { name: '系统信息', href: '/system/info' },
  { name: '配置管理', href: '/system/config' },
];

export default function AdminSidebar({ onLogout }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [clickLocked, setClickLocked] = useState<boolean>(false);
  const [scrollFollowing, setScrollFollowing] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // 精确匹配当前路径
  const getActiveHref = useCallback((currentPath: string) => {
    // 精确匹配
    const exactMatch = menuItems.find((item) => item.href === currentPath);
    if (exactMatch) return exactMatch.href;

    // 前缀匹配（处理子路径）
    const prefixMatch = menuItems.find((item) =>
      currentPath.startsWith(item.href)
    );
    return prefixMatch ? prefixMatch.href : '';
  }, []);

  // 获取当前应该激活的链接
  const getActualActiveHref = useCallback(() => {
    // 如果处于点击锁定状态，则根据路径计算（但不跟随滚动）
    if (clickLocked) {
      return getActiveHref(pathname);
    }
    // 如果启用了滚动跟随，则根据路径计算
    if (scrollFollowing) {
      return getActiveHref(pathname);
    }
    // 默认情况下根据路径计算
    return getActiveHref(pathname);
  }, [pathname, clickLocked, scrollFollowing, getActiveHref]);

  // 获取当前激活的链接
  const activeHref = getActualActiveHref();

  // 判断是否激活
  const isActive = useCallback(
    (href: string) => {
      return activeHref === href;
    },
    [activeHref]
  );

  // 判断是否加载中
  const isLoading = useCallback(
    (href: string) => loadingHref === href,
    [loadingHref]
  );

  // 处理菜单点击
  const handleMenuClick = useCallback(
    (href: string) => {
      return (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        // 设置点击锁定状态
        setClickLocked(true);
        setLoadingHref(href);

        // 跳转到新页面
        router.push(href);
      };
    },
    [router]
  );

  // 当 pathname 变化时，设置点击锁定状态
  useEffect(() => {
    let ignore = false;

    const updateState = () => {
      if (!ignore) {
        setClickLocked(true);

        // 延迟解锁，允许用户滚动时重新激活跟随功能
        const timer = setTimeout(() => {
          if (!ignore) {
            setClickLocked(false);
            setLoadingHref(null);
          }
        }, 1000); // 1秒后解锁

        return () => clearTimeout(timer);
      }
    };

    const cleanup = updateState();

    return () => {
      ignore = true;
      if (cleanup) cleanup();
    };
  }, [pathname]);

  // 监听滚动事件，当用户开始滚动时启用跟随功能
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // 当用户开始滚动时，启用滚动跟随
      setScrollFollowing(true);

      // 清除之前的定时器
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }

      // 设置定时器，在停止滚动一段时间后禁用滚动跟随
      scrollTimer = setTimeout(() => {
        setScrollFollowing(false);
      }, 2000); // 2秒无滚动后禁用跟随
    };

    // 添加滚动事件监听器
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, []);

  // 组件卸载时清除状态
  useEffect(() => {
    return () => {
      setClickLocked(false);
      setLoadingHref(null);
      setScrollFollowing(false);
    };
  }, []);

  // 退出登录确认处理
  const handleLogoutConfirm = () => {
    if (onLogout) {
      onLogout();
    }
    setShowLogoutConfirm(false);
  };

  return (
    <div className="h-screen sticky top-0 w-[200px] lg:w-[250px]">
      <div className="h-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-r-xl flex flex-col">
        {/* 头部区域 */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              管理系统
            </h1>
          </div>
        </div>

        {/* 菜单区域 */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2">
            <AnimatePresence>
              {menuItems.map((item, index) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration:
                      animationConfig.sidebar.menuItem.enter.duration / 1000,
                    delay:
                      index *
                      animationConfig.sidebar.menuItem.enter.staggerDelay,
                    ease: animationConfig.sidebar.menuItem.enter.ease,
                  }}
                  whileHover={{
                    scale: animationConfig.sidebar.menuItem.hover.scale,
                    transition: {
                      duration:
                        animationConfig.sidebar.menuItem.hover.duration / 1000,
                    },
                  }}
                  whileTap={{
                    scale: animationConfig.sidebar.menuItem.tap.scale,
                    transition: {
                      duration:
                        animationConfig.sidebar.menuItem.tap.duration / 1000,
                    },
                  }}
                >
                  <a
                    href={item.href}
                    onClick={handleMenuClick(item.href)}
                    className={`flex items-center px-5 py-3 text-sm rounded-lg transition-all duration-200 ease-in-out transform ${
                      isActive(item.href)
                        ? 'text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-l-4 border-blue-500 dark:border-blue-400 font-medium shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:shadow-sm'
                    }`}
                  >
                    <span className="flex items-center truncate">
                      <span>{item.name}</span>
                      {isLoading(item.href) && (
                        <motion.span
                          className="ml-2 inline-block w-3 h-3 border-t-2 border-r-2 border-blue-500 rounded-full animate-spin"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </span>
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </nav>

        {/* 底部操作区域 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col space-y-2">
            <motion.button
              onClick={() => router.push('/')}
              className="flex items-center justify-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 touch-manipulation"
              whileHover={{
                scale: animationConfig.sidebar.menuItem.hover.scale,
                transition: {
                  duration:
                    animationConfig.sidebar.menuItem.hover.duration / 1000,
                },
              }}
              whileTap={{
                scale: animationConfig.sidebar.menuItem.tap.scale,
                transition: {
                  duration:
                    animationConfig.sidebar.menuItem.tap.duration / 1000,
                },
              }}
            >
              返回主页
            </motion.button>
            <motion.button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center justify-center px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors duration-200 touch-manipulation"
              whileHover={{
                scale: animationConfig.sidebar.menuItem.hover.scale,
                transition: {
                  duration:
                    animationConfig.sidebar.menuItem.hover.duration / 1000,
                },
              }}
              whileTap={{
                scale: animationConfig.sidebar.menuItem.tap.scale,
                transition: {
                  duration:
                    animationConfig.sidebar.menuItem.tap.duration / 1000,
                },
              }}
            >
              退出登录
            </motion.button>
          </div>
        </div>

        {/* 退出登录确认对话框 */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <div
              className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm pointer-events-auto"
              onClick={() => setShowLogoutConfirm(false)}
            ></div>
            <div
              className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto border border-white/30 dark:border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  确认退出
                </h3>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-red-600 dark:text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      确认退出登录
                    </h4>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 ml-14">
                  确定要退出登录吗？您需要重新登录才能访问管理功能。
                </p>
              </div>

              <div className="px-6 py-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm flex justify-end space-x-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-600/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-xl hover:bg-white/70 dark:hover:bg-gray-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleLogoutConfirm}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600/90 backdrop-blur-sm hover:bg-red-700/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}