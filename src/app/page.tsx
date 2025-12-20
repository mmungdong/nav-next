'use client';

import { useEffect, useState, useRef } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useAuthStore } from '@/stores/authStore';
import DefaultIcon, { isIconUrlFailed, markIconUrlAsFailed } from '@/components/DefaultIcon';
import SearchModal from '@/components/SearchModal';

export default function Home() {
  const { categories, loading, fetchCategories } = useNavStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

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
    let isUserNavigating = false;

    const handleScroll = () => {
      if (!ticking && !isUserNavigating) {
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

    // 当用户点击导航时，暂时禁用滚动监听
    const handleClickNavigation = () => {
      isUserNavigating = true;
      // 1秒后重新启用滚动监听
      setTimeout(() => {
        isUserNavigating = false;
      }, 1000);
    };

    // 延迟绑定滚动事件，确保DOM已经渲染完成
    const timer = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      // 监听自定义的导航点击事件
      window.addEventListener('click-navigation', handleClickNavigation);
      // 初始化时也触发一次，确保初始状态正确
      handleScroll();
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click-navigation', handleClickNavigation);
    };
  }, [categories, activeCategory]);

  // 当选中的分类改变时，自动滚动菜单到选中项
  useEffect(() => {
    if (activeCategory && menuRef.current) {
      const activeElement = menuRef.current.querySelector(`[href="#${activeCategory}"]`);
      if (activeElement) {
        // 平滑滚动到选中项，使其在菜单中可见
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [activeCategory]);

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
      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
      >
        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 左侧分类菜单 */}
      <div ref={menuRef} className={`fixed lg:sticky lg:top-0 z-10 w-64 bg-white dark:bg-gray-800 shadow-lg h-screen overflow-y-auto transition-transform duration-300 ease-in-out transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} custom-scrollbar`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2 text-xl">🌐</span>
              晨雾漫路
            </h1>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 分类导航列表 */}
          <nav className="mb-4">
            <ul className="space-y-1">
              {filteredCategories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      const element = document.getElementById(category.id.toString());
                      if (element) {
                        // 触发自定义事件，通知滚动监听器用户正在导航
                        window.dispatchEvent(new CustomEvent('click-navigation'));
                        // 直接设置激活的分类，避免逐个高亮
                        setActiveCategory(category.id.toString());
                        // 平滑滚动到目标元素
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-colors ${
                      activeCategory === category.id.toString()
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    onMouseEnter={(e) => {
                      // 鼠标悬停时改变图标为📂
                      const iconElement = e.currentTarget.querySelector('.category-icon');
                      if (iconElement) {
                        iconElement.textContent = '📂';
                      }
                    }}
                    onMouseLeave={(e) => {
                      // 鼠标离开时根据激活状态设置图标
                      const iconElement = e.currentTarget.querySelector('.category-icon');
                      if (iconElement) {
                        if (activeCategory === category.id.toString()) {
                          iconElement.textContent = '📂';
                        } else {
                          iconElement.textContent = '📁';
                        }
                      }
                    }}
                  >
                    <span className="mr-3 text-xl category-icon">{category.icon || (activeCategory === category.id.toString() ? '📂' : '📁')}</span>
                    <span className="truncate">{category.title}</span>
                    {activeCategory === category.id.toString() && (
                      <span className="ml-auto">
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
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            共 {filteredCategories.length} 个分类
          </div>
        </div>
      </div>

      {/* 遮罩层（移动端） */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-0"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}

      {/* 主内容区 */}
      <div className="flex-1">
        <div className="p-4 lg:p-6 lg:px-20 max-w-[2000px] mx-auto">
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
                <div key={category.id} id={category.id.toString()} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                      <span className="mr-2 text-2xl">{category.icon || '📁'}</span>
                      {category.title}
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
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

      {/* 右下角功能图标 */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {/* 置顶按钮 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
          aria-label="回到顶部"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* 搜索按钮 */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
          aria-label="搜索"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* 管理页面按钮 - 仅在用户已登录时显示 */}
        {isAuthenticated && (
          <button
            onClick={() => window.open('/system', '_blank')}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700"
            aria-label="前往管理页面"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索Modal */}
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </div>
  );
}