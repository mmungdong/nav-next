'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import { useNavStore } from '@/stores/navStore';
import AdminSidebar from '@/components/layout/AdminSidebar';
import DraftTools from '@/components/DraftTools';
import { useAdminSyncGuard } from '@/hooks/useAdminSyncGuard';
import { isSyncSuccess } from '@/lib/syncTypes';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, authStatus, authError, checkAuth, logout, githubToken } =
    useAuthStore();
  const { setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overwriteTarget, setOverwriteTarget] = useState<'nav' | 'config' | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  const enabled = (authStatus === 'authenticated' || authStatus === 'offline') && isAuthenticated;
  const { status, error, retry, confirmLeave, pendingLeave } = useAdminSyncGuard(enabled);

  const siteConfig = useConfigStore((s) => s.siteConfig);
  const navConflict = useNavStore((s) => s.conflict);
  const navConflictData = useNavStore((s) => s.conflict?.remoteData);
  const navBaseline = useNavStore((s) => s.baseline);
  const navPeerNotice = useNavStore((s) => s.peerNotice);
  const navDismissPeerNotice = useNavStore((s) => s.dismissPeerNotice);
  const configPeerNotice = useConfigStore((s) => s.peerNotice);
  const configDismissPeerNotice = useConfigStore((s) => s.dismissPeerNotice);
  const navRecoverableDrafts = useNavStore((s) => s.recoverableDrafts);
  const navRestoreDraft = useNavStore((s) => s.restoreDraftById);
  const configRecoverableDrafts = useConfigStore((s) => s.recoverableDrafts);
  const configRestoreDraft = useConfigStore((s) => s.restoreDraftById);
  const navAdopt = useNavStore((s) => s.adoptRemote);
  const navOverwrite = useNavStore((s) => s.overwriteRemote);
  const configConflict = useConfigStore((s) => s.conflict);
  const configAdopt = useConfigStore((s) => s.adoptRemote);
  const configOverwrite = useConfigStore((s) => s.overwriteRemote);
  const compareData = useNavStore((s) => s.compareData);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'signed_out') router.push('/login');
  }, [authStatus, router]);

  // Follow the stored theme once the config is available in admin.
  useEffect(() => {
    if (!enabled) return;
    setTheme(siteConfig.site.theme);
  }, [enabled, setTheme, siteConfig.site.theme]);

  const sidebarOpenRef = useRef(false);
  useEffect(() => {
    if (sidebarOpen) {
      sidebarOpenRef.current = true;
      firstLinkRef.current?.focus();
    } else if (sidebarOpenRef.current) {
      sidebarOpenRef.current = false;
      sidebarToggleRef.current?.focus({ preventScroll: true });
    }
  }, [sidebarOpen]);

  const handleLogout = () => {
    confirmLeave(() => {
      logout();
      router.push('/login');
    });
  };

  const handleBackHome = () => {
    confirmLeave(() => router.push('/'));
  };

  const remoteChangeSummary = (() => {
    if (!navConflict || !navConflictData) return null;
    const diff = compareData(navConflictData, navBaseline);
    return {
      added: diff.categoriesAdded.length + diff.websitesAdded.length,
      removed: diff.categoriesRemoved.length + diff.websitesRemoved.length,
      modified: diff.categoriesModified.length + diff.websitesModified.length,
      moved: diff.websitesMoved.length,
      reordered:
        diff.categoriesReordered || diff.websitesReordered.length > 0,
    };
  })();

  const runOverwrite = async () => {
    if (!overwriteTarget || !githubToken) return;
    const result =
      overwriteTarget === 'nav'
        ? await navOverwrite(githubToken)
        : await configOverwrite(githubToken);
    setOverwriteTarget(null);
    setConflictMessage(
      isSyncSuccess(result)
        ? '已用本机版本覆盖远程'
        : `覆盖失败：${isSyncSuccess(result) ? '' : result.message}`
    );
  };

  if (authStatus === 'unknown' || authStatus === 'checking' || (isAuthenticated && status === 'loading')) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4 px-6 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {status === 'loading' && isAuthenticated ? '正在恢复草稿并校验远程数据…' : '正在验证 GitHub 授权…'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4 px-6 text-center">
        <p className="text-lg font-medium text-red-600 dark:text-red-400">需要重新授权</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md">
          {authError ?? '当前没有有效的 GitHub 授权。'}
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
        >
          重新授权
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-5xl">⚠️</p>
          <p className="text-lg font-medium text-red-600 dark:text-red-400">数据加载失败</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={retry}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              重试
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
            >
              重新授权
            </button>
            <button
              onClick={() => confirmLeave(() => router.push('/'))}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
            >
              返回首页
            </button>
          </div>
          <div className="flex justify-center">
            <DraftTools />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <button
        ref={sidebarToggleRef}
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
        className="lg:hidden fixed top-3 left-3 z-30 min-w-[44px] min-h-[44px] px-3 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
      >
        菜单
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-[250px] transform transition-transform duration-200 lg:static lg:translate-x-0 lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminSidebar
          onLogout={handleLogout}
          onBackHome={handleBackHome}
          onNavigate={() => setSidebarOpen(false)}
          firstLinkRef={firstLinkRef}
        />
      </aside>

      <div className="flex-1 min-w-0 p-4 md:p-6 pt-16 lg:pt-6">
        {(navRecoverableDrafts.length > 0 || configRecoverableDrafts.length > 0) && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="mb-2">
              发现未恢复的本机草稿（可能来自上次会话或其他标签页）。恢复后仍只在本机，推送前不会覆盖远程。
            </p>
            <div className="flex flex-wrap gap-2">
              {navRecoverableDrafts.map((draft) => (
                <button
                  key={draft.draftId}
                  type="button"
                  onClick={() => navRestoreDraft(draft.draftId)}
                  className="px-3 py-2 min-h-[44px] rounded-md bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700"
                >
                  恢复网站数据 · {new Date(draft.updatedAt).toLocaleString()}
                </button>
              ))}
              {configRecoverableDrafts.map((draft) => (
                <button
                  key={draft.draftId}
                  type="button"
                  onClick={() => configRestoreDraft(draft.draftId)}
                  className="px-3 py-2 min-h-[44px] rounded-md bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700"
                >
                  恢复站点配置 · {new Date(draft.updatedAt).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {(navPeerNotice || configPeerNotice) && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
            <span>{navPeerNotice ?? configPeerNotice}</span>
            <button
              type="button"
              onClick={() => {
                navDismissPeerNotice();
                configDismissPeerNotice();
              }}
              className="underline font-medium"
            >
              知道了
            </button>
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <DraftTools />
        </div>

        {authStatus === 'offline' && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {authError ?? '当前离线：凭据和草稿已保留，可以继续编辑，但暂时不能推送。'}
            <button onClick={retry} className="ml-3 underline font-medium">
              重试连接
            </button>
          </div>
        )}

        {(navConflict || configConflict) && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 space-y-3">
            <p className="font-medium text-red-800 dark:text-red-200">检测到远程冲突，已停止自动覆盖</p>
            {navConflict && (
              <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                <p>
                  网站数据：远程已被其他设备更新
                  {remoteChangeSummary && (
                    <span className="ml-1">
                      （远程新增 {remoteChangeSummary.added}、删除 {remoteChangeSummary.removed}、
                      修改 {remoteChangeSummary.modified}
                      {remoteChangeSummary.moved ? `、跨分类移动 ${remoteChangeSummary.moved}` : ''}
                      {remoteChangeSummary.reordered ? '、顺序变化' : ''}）
                    </span>
                  )}
                  。本机草稿已保留。
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={navAdopt}
                    className="px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700"
                  >
                    采用远程（放弃本机）
                  </button>
                  <button
                    onClick={() => setOverwriteTarget('nav')}
                    className="px-3 py-2 rounded-md bg-red-600 text-white"
                  >
                    用本机版本覆盖
                  </button>
                  <span className="px-3 py-2 text-xs text-red-600 dark:text-red-300">
                    保留草稿：关闭本提示即可，推送会保持锁定
                  </span>
                </div>
              </div>
            )}
            {configConflict && (
              <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                <p>站点配置：远程已被其他设备更新，本机草稿已保留。</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={configAdopt}
                    className="px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700"
                  >
                    采用远程（放弃本机）
                  </button>
                  <button
                    onClick={() => setOverwriteTarget('config')}
                    className="px-3 py-2 rounded-md bg-red-600 text-white"
                  >
                    用本机版本覆盖
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {conflictMessage && (
          <p className="mb-4 text-sm text-gray-700 dark:text-gray-200">{conflictMessage}</p>
        )}

        {children}
      </div>

      {pendingLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={pendingLeave.onCancel} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="未推送的改动"
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90dvh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {pendingLeave.message}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              保存会推送到 GitHub；保留草稿会留在本机，下次进入可恢复；丢弃会放弃本机改动（会先保存恢复副本）。
            </p>
            {pendingLeave.error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{pendingLeave.error}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={pendingLeave.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={pendingLeave.onDiscard}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg"
              >
                丢弃并离开
              </button>
              <button
                onClick={pendingLeave.onKeep}
                className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-lg"
              >
                保留草稿离开
              </button>
              <button
                onClick={pendingLeave.onSave}
                disabled={pendingLeave.saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg"
              >
                {pendingLeave.saving ? '保存中…' : '保存并离开'}
              </button>
            </div>
          </div>
        </div>
      )}

      {overwriteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOverwriteTarget(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="确认覆盖远程"
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              确认用本机版本覆盖远程？
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              远程当前内容会先保存为本机恢复副本，然后以你刚审阅的远程 SHA 为基线提交本机版本。
              如果这期间远程再次变化，仍会冲突，不会自动覆盖。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOverwriteTarget(null)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={runOverwrite}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg"
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
