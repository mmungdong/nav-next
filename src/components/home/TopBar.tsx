'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import { useSearch } from '@/components/SearchContext';

function formatToday(): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('month')}月${pick('day')}日 · ${pick('weekday')}`;
}

export default function TopBar() {
  const { siteConfig } = useConfigStore();
  const { isAuthenticated } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { openSearch } = useSearch();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [today, setToday] = useState('');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setToday(formatToday()));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep the server and first client render identical; next-themes resolves the
  // stored theme before hydration, so wait for the mounted flag before swapping.
  const isDark = mounted ? resolvedTheme !== 'light' : true;
  const themeLabel = !mounted ? '切换主题' : isDark ? '切换到浅色主题' : '切换到深色主题';

  return (
    <header className="nx-topbar">
      <div className="nx-topbar-inner">
        <Link className="nx-brand" href="/" aria-label={`${siteConfig.site.name} 首页`}>
          <svg
            className="nx-brand-mark"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <rect width="8.5" height="8.5" rx="2.4" fill="currentColor" />
            <rect className="nx-brand-accent" x="11.5" width="8.5" height="8.5" rx="2.4" />
            <rect y="11.5" width="8.5" height="8.5" rx="2.4" fill="currentColor" />
            <rect x="11.5" y="11.5" width="8.5" height="8.5" rx="2.4" fill="currentColor" />
          </svg>
          <span className="nx-wordmark" title={siteConfig.site.name}>
            {siteConfig.site.name}
          </span>
          <span className="nx-brand-desc" title={siteConfig.site.description}>
            {siteConfig.site.description}
          </span>
        </Link>

        <div className="nx-bar-actions">
          <span className="nx-today">{today}</span>
          <button
            type="button"
            className="nx-icon-btn"
            aria-label="打开全局搜索"
            title="全局搜索 (Cmd/Ctrl + K)"
            onClick={openSearch}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </button>
          <button
            type="button"
            className="nx-icon-btn"
            aria-label={themeLabel}
            title={themeLabel}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              </svg>
            )}
          </button>
          {isAuthenticated && (
            <Link className="nx-manage" href="/system" title="管理后台" aria-label="管理后台">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h8M16.5 7H20M4 17h3.5M11.5 17H20" />
                <circle cx="14" cy="7" r="2.2" />
                <circle cx="9" cy="17" r="2.2" />
              </svg>
              <span>管理</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
