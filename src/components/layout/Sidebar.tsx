'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
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

export default function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // 在桌面端默认不收起菜单栏
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [clickLocked, setClickLocked] = useState<boolean>(false);
  const [scrollFollowing, setScrollFollowing] = useState<boolean>(false);

  // 精确匹配当前路径
  const getActiveHref = useCallback((currentPath: string) => {
    // 精确匹配
    const exactMatch = menuItems.find(item => item.href === currentPath);
    if (exactMatch) return exactMatch.href;

    // 前缀匹配（处理子路径）
    const prefixMatch = menuItems.find(item => currentPath.startsWith(item.href));
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
  const isActive = useCallback((href: string) => {
    return activeHref === href;
  }, [activeHref]);

  // 判断是否加载中
  const isLoading = useCallback((href: string) => loadingHref === href, [loadingHref]);

  // 处理菜单点击
  const handleMenuClick = useCallback((href: string) => {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      // 设置点击锁定状态
      setClickLocked(true);
      setLoadingHref(href);

      // 跳转到新页面
      router.push(href);
    };
  }, [router]);

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

  return (
    <motion.div
      className="h-screen sticky top-0"
      animate={{
        width: isCollapsed ? 80 : 256
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
    >
      <div className="h-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-r-xl flex flex-col">
        {/* 头部区域 */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                管理系统
              </h1>
            )}
            <motion.button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              aria-label={isCollapsed ? "展开菜单" : "收起菜单"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.button>
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
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeInOut"
                  }}
                  whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
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
                    {/* 如果需要图标可以在这里添加 */}
                    {!isCollapsed && (
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
                    )}
                    {isCollapsed && (
                      <span className="flex items-center justify-center truncate">
                        <span>{item.name.charAt(0)}</span>
                        {isLoading(item.href) && (
                          <motion.span
                            className="ml-1 inline-block w-2 h-2 border-t-2 border-r-2 border-blue-500 rounded-full animate-spin"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </span>
                    )}
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </nav>

        {/* 底部操作区域 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col space-y-2">
            {!isCollapsed && (
              <>
                <motion.button
                  onClick={() => router.push('/')}
                  className="flex items-center justify-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 touch-manipulation"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  返回主页
                </motion.button>
                <motion.button
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                    }
                  }}
                  className="flex items-center justify-center px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors duration-200 touch-manipulation"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  退出登录
                </motion.button>
              </>
            )}
            {isCollapsed && (
              <>
                <motion.button
                  onClick={() => router.push('/')}
                  className="p-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 touch-manipulation flex items-center justify-center"
                  title="返回主页"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="返回主页"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </motion.button>
                <motion.button
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                    }
                  }}
                  className="p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors duration-200 touch-manipulation flex items-center justify-center"
                  title="退出登录"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="退出登录"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
