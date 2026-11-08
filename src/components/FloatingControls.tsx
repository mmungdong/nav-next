'use client';
import { useEffect, useRef, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useConfigStore } from '@/stores/configStore';

export default function FloatingControls() {
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshCategories = useNavStore((s) => s.refreshPublic);
  const refreshConfig = useConfigStore((s) => s.refreshPublic);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(
    () => () => {
      if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
    },
    []
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatus(null);
    await Promise.all([refreshCategories(), refreshConfig()]);
    const navError = useNavStore.getState().publicError;
    const configError = useConfigStore.getState().publicError;
    setStatus(
      navError || configError ? '刷新失败，当前显示的是缓存数据' : '已重新获取部署数据'
    );
    setRefreshing(false);
    if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      statusTimerRef.current = null;
      setStatus(null);
    }, 4000);
  };

  return (
    <>
      {status && (
        <div
          role="status"
          className="nx-refresh-status"
        >
          {status}
        </div>
      )}
      <div className="nx-fab-stack">
        <button
          type="button"
          className="nx-top-fab"
          onClick={handleRefresh}
          title="刷新数据"
          aria-label="刷新部署数据"
          aria-busy={refreshing}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={refreshing ? 'nx-spin' : undefined}
          >
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <path d="M20 4v5h-5" />
          </svg>
        </button>
        {showTopBtn && (
          <button
            type="button"
            className="nx-top-fab"
            onClick={() => window.scrollTo(0, 0)}
            title="回到顶部"
            aria-label="回到顶部"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 14 6-6 6 6" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
