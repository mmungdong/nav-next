'use client';
import { useCallback, useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import SearchModal from '@/components/SearchModal';
import FloatingControls from '@/components/FloatingControls';
import TopBar from '@/components/home/TopBar';
import { SearchProvider } from '@/components/SearchContext';
import '@/components/home/home.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { fetchCategories } = useNavStore();
  const { checkAuth } = useAuthStore();
  const { fetchConfig, siteConfig } = useConfigStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Single initialization point for the public site; pages read the stores.
  useEffect(() => {
    fetchCategories();
    fetchConfig();
    checkAuth();
  }, [fetchCategories, fetchConfig, checkAuth]);

  // Re-validate the deployed JSON when the tab becomes active again. The stores
  // throttle to one request per 60s and keep the cached copy on failure.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchCategories();
      void fetchConfig();
    };
    window.addEventListener('focus', revalidate);
    window.addEventListener('online', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('online', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [fetchCategories, fetchConfig]);

  // The home search field filters the page itself; the shortcut only opens the
  // global modal so the two entries never fight over focus.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Next re-applies its static metadata title once hydration finishes, so keep
  // the configured title in sync until the layout unmounts.
  useEffect(() => {
    const title = siteConfig.site.name;
    const applyTitle = () => {
      if (document.title !== title) document.title = title;
    };
    applyTitle();
    const observer = new MutationObserver(applyTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [siteConfig.site.name]);

  useEffect(() => {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', siteConfig.site.description);
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = siteConfig.site.description;
      document.head.appendChild(m);
    }
  }, [siteConfig.site.description]);

  const openSearch = useCallback(() => setIsSearchModalOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchModalOpen(false), []);

  return (
    <div className="nx-app">
      <a className="nx-skip-link" href="#main">
        跳到主要内容
      </a>
      <SearchProvider openSearch={openSearch}>
        <TopBar />
        {children}
        <FloatingControls />
        {isSearchModalOpen && <SearchModal isOpen onClose={closeSearch} />}
      </SearchProvider>
    </div>
  );
}
