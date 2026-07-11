'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { useAdminSyncGuard } from '@/hooks/useAdminSyncGuard';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, logout } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(true);
  const { status, error, retry, confirmLeave, pendingLeave } =
    useAdminSyncGuard();

  useEffect(() => {
    const run = async () => {
      await checkAuth();
      setAuthLoading(false);
    };
    run();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  const handleLogout = () => {
    confirmLeave(() => {
      logout();
      router.push('/login');
    });
  };

  const handleBackHome = () => {
    confirmLeave(() => router.push('/'));
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // sync guard overlay
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-6"></div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
          正在拉取网站数据与系统配置…
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6">
        <div className="max-w-md text-center">
          <p className="text-5xl mb-4">⚠️</p>
          <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
            数据拉取失败
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={retry}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <div className="w-[200px] lg:w-[250px] border-r border-gray-200 dark:border-gray-700">
        <AdminSidebar onLogout={handleLogout} onBackHome={handleBackHome} />
      </div>
      <div className="flex-1 min-w-0 p-6">{children}</div>

      {/* unsaved-changes guard dialog */}
      {pendingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={pendingLeave.onCancel}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {pendingLeave.message}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              保存将推送到远程仓库；丢弃将放弃本地改动。
            </p>
            {pendingLeave.error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                {pendingLeave.error}
              </p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={pendingLeave.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={pendingLeave.onDiscard}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                丢弃
              </button>
              <button
                onClick={pendingLeave.onSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
