'use client';
import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import SearchModal from '@/components/SearchModal';
import FloatingControls from '@/components/FloatingControls';
import { SearchProvider } from '@/components/SearchContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { fetchCategories } = useNavStore();
  const { checkAuth } = useAuthStore();
  const { fetchConfig, siteConfig } = useConfigStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // 初始化全局数据
  useEffect(() => {
    fetchCategories();
    fetchConfig();
    checkAuth();
  }, [fetchCategories, fetchConfig, checkAuth]);

  // 全局快捷键 Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // apply site name / description from config
  useEffect(() => {
    document.title = siteConfig.site.name;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', siteConfig.site.description);
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = siteConfig.site.description;
      document.head.appendChild(m);
    }
  }, [siteConfig.site.name, siteConfig.site.description]);

  return (
    // Grid background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-grid-pattern text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">
      <SearchProvider openSearch={() => setIsSearchModalOpen(true)}>

        {/* 内容容器 */}
        <div className="w-full min-h-screen">
          {children}
        </div>

        {/* 全局悬浮组件 */}
        <FloatingControls onOpenSearch={() => setIsSearchModalOpen(true)} />

        {/* 全局搜索模态框 */}
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
        />
      </SearchProvider>
    </div>
  );
}
