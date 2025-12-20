'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SiteSearchResults from './SiteSearchResults';

interface SearchEngine {
  id: string;
  name: string;
  icon: string;
  url: string;
  isInternal?: boolean;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('google');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 搜索引擎配置
  const searchEngines: SearchEngine[] = [
    {
      id: 'google',
      name: 'Google',
      icon: 'https://www.google.com/favicon.ico',
      url: 'https://www.google.com/search?q=',
    },
    {
      id: 'baidu',
      name: '百度',
      icon: 'https://www.baidu.com/favicon.ico',
      url: 'https://www.baidu.com/s?wd=',
    },
    {
      id: 'bing',
      name: 'Bing',
      icon: 'https://www.bing.com/favicon.ico',
      url: 'https://www.bing.com/search?q=',
    },
    {
      id: 'internal',
      name: '站内',
      icon: '🌐',
      url: '/search?q=',
      isInternal: true,
    },
  ];

  // 处理搜索
  const handleSearch = (engineId: string) => {
    const engine = searchEngines.find(e => e.id === engineId);
    if (engine && searchQuery.trim()) {
      if (engine.isInternal) {
        // 站内搜索
        window.location.href = `${engine.url}${encodeURIComponent(searchQuery)}`;
      } else {
        // 外部搜索
        window.open(`${engine.url}${encodeURIComponent(searchQuery)}`, '_blank');
      }
    }
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 阻止背景页面滚动
    const preventBackgroundScroll = (e: Event) => {
      if (isOpen) {
        e.preventDefault();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 阻止背景滚动
      document.body.style.overflow = 'hidden';
      document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
      // 自动聚焦到搜索框
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 恢复背景滚动
      document.body.style.overflow = '';
      document.removeEventListener('wheel', preventBackgroundScroll);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Modal内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl"
          >
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl rounded-2xl shadow-2xl overflow-visible border border-white/30 dark:border-gray-700/50 relative z-50">
              {/* 搜索框 */}
              <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(selectedEngine);
                      }
                    }}
                    placeholder="输入搜索关键词..."
                    className="w-full px-4 py-3 pl-12 bg-white/50 dark:bg-gray-700/50 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 shadow-inner"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 站内搜索结果 */}
              {selectedEngine === 'internal' && (
                <SiteSearchResults query={searchQuery} onClose={onClose} />
              )}

              {/* 搜索引擎选项 */}
              <div className="p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
                <div className="grid grid-cols-4 gap-3 pb-2">
                  {searchEngines.map((engine) => (
                    <motion.button
                      key={engine.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedEngine(engine.id);
                        // 对于非站内搜索，只切换选中状态，不立即搜索
                        // 对于站内搜索，不立即跳转，而是显示搜索结果
                      }}
                      className={`flex items-center p-3 rounded-xl border transition-all whitespace-nowrap ${
                        selectedEngine === engine.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {engine.id === 'internal' ? (
                        <span className="text-xl mr-3">{engine.icon}</span>
                      ) : (
                        <img
                          src={engine.icon}
                          alt={engine.name}
                          className="w-5 h-5 mr-3 rounded-full"
                          onError={(e) => {
                            // 如果图标加载失败，显示默认图标
                            e.currentTarget.onerror = null;
                            e.currentTarget.className = 'text-xl mr-3';
                            e.currentTarget.outerHTML = `<span class="text-xl mr-3">${engine.id === 'baidu' ? '🐻' : engine.id === 'bing' ? '🔎' : '🔍'}</span>`;
                          }}
                        />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{engine.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;