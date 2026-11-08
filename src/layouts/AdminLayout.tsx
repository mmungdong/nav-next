'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/authStore';
import { useConfigStore } from '@/stores/configStore';
import { useNavStore } from '@/stores/navStore';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminSprite from '@/components/admin/AdminSprite';
import Icon from '@/components/admin/Icon';
import DraftTools from '@/components/DraftTools';
import { useAdminSyncGuard } from '@/hooks/useAdminSyncGuard';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isSyncSuccess } from '@/lib/syncTypes';
import { hydrateAdminUi, useAdminUiStore } from '@/stores/adminUiStore';
import './admin-shell.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const PAGE_NAMES: Array<{ href: string; name: string }> = [
  { href: '/system/web', name: '网站管理' },
  { href: '/system/search', name: '搜索管理' },
  { href: '/system/setting', name: '系统设置' },
  { href: '/system/info', name: '系统信息' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, authStatus, authError, checkAuth, logout, githubToken } =
    useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  const githubUser = useAuthStore((s) => s.githubUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overwriteTarget, setOverwriteTarget] = useState<'nav' | 'config' | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  const sidebarCollapsed = useAdminUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAdminUiStore((s) => s.setSidebarCollapsed);
  const searchQuery = useAdminUiStore((s) => s.searchQuery);
  const setSearchQuery = useAdminUiStore((s) => s.setSearchQuery);

  useEffect(() => {
    hydrateAdminUi();
  }, []);

  const currentPageName =
    PAGE_NAMES.find((page) => pathname.startsWith(page.href))?.name ?? '后台';
  const showTopbarSearch = pathname.startsWith('/system/web');


  const enabled = (authStatus === 'authenticated' || authStatus === 'offline') && isAuthenticated;
  const { status, error, retry, confirmLeave, pendingLeave } = useAdminSyncGuard(enabled);

  // Re-verifying the token is what clears a stale offline banner; data init alone
  // cannot tell a recovered rate limit from a still-broken credential.
  const retryConnection = async () => {
    await checkAuth();
    retry();
  };

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
  const [adoptBlocked, setAdoptBlocked] = useState<'nav' | 'config' | null>(null);
  const [adoptWithoutBackup, setAdoptWithoutBackup] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);
  const leaveDialogRef = useRef<HTMLDivElement>(null);
  const leaveCancelRef = useRef<HTMLButtonElement>(null);
  const overwriteDialogRef = useRef<HTMLDivElement>(null);
  const overwriteCancelRef = useRef<HTMLButtonElement>(null);

  // The mobile drawer behaves like a modal: Escape closes it, Tab stays inside.
  useDialogFocus({
    isOpen: sidebarOpen,
    dialogRef: sidebarRef,
    onClose: () => setSidebarOpen(false),
    initialFocusRef: firstLinkRef,
  });

  useDialogFocus({
    isOpen: Boolean(pendingLeave),
    dialogRef: leaveDialogRef,
    onClose: pendingLeave?.onCancel,
    initialFocusRef: leaveCancelRef,
  });

  useDialogFocus({
    isOpen: Boolean(overwriteTarget),
    dialogRef: overwriteDialogRef,
    onClose: () => setOverwriteTarget(null),
    initialFocusRef: overwriteCancelRef,
  });

  // A resolved conflict must not leave a stale "discard without backup" consent.
  const navAdoptBlocked = adoptBlocked === 'nav' && Boolean(navConflict);
  const configAdoptBlocked = adoptBlocked === 'config' && Boolean(configConflict);

  const handleAdopt = (target: 'nav' | 'config') => {
    const blocked = target === 'nav' ? navAdoptBlocked : configAdoptBlocked;
    const discardWithoutBackup = blocked && adoptWithoutBackup;
    const result =
      target === 'nav' ? navAdopt({ discardWithoutBackup }) : configAdopt({ discardWithoutBackup });
    if (result.ok) {
      setAdoptBlocked(null);
      setAdoptWithoutBackup(false);
      setConflictMessage(null);
      return;
    }
    // The draft was kept because its recovery copy could not be written.
    setAdoptBlocked(target);
    setAdoptWithoutBackup(false);
    setConflictMessage(
      result.message
        ? `${result.message}如确认不再需要恢复，请勾选下方选项后再次点击「采用远程」。`
        : null
    );
  };

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'signed_out') router.push('/login');
  }, [authStatus, router]);

  // The configured default theme is applied once by ConfigThemeSync; forcing it
  // here on every render would undo the in-app theme toggle.

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
    <div className={`adm${sidebarOpen ? ' mobile-nav-open' : ''}`}>
      <AdminSprite />
      <div className={`app${sidebarCollapsed ? ' collapsed' : ''}`}>
        {sidebarOpen && (
          <div className="nav-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        <aside
          id="admin-sidebar"
          ref={sidebarRef}
          role={sidebarOpen ? 'dialog' : undefined}
          aria-modal={sidebarOpen ? true : undefined}
          aria-label={sidebarOpen ? '后台导航' : undefined}
          className="sidebar"
        >
          <AdminSidebar
            onLogout={handleLogout}
            onBackHome={handleBackHome}
            onNavigate={() => setSidebarOpen(false)}
            firstLinkRef={firstLinkRef}
          />
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-btn"
                type="button"
                onClick={() => {
                  if (window.matchMedia('(max-width: 720px)').matches) {
                    setSidebarOpen(!sidebarOpen);
                    return;
                  }
                  setSidebarCollapsed(!sidebarCollapsed);
                }}
                aria-expanded={sidebarOpen || !sidebarCollapsed}
                aria-controls="admin-sidebar"
                title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
                aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
              >
                <Icon name="panel" />
              </button>
              <nav className="crumbs" aria-label="面包屑">
                <span className="crumb-root">后台</span>
                <Icon name="chevron" className="crumb-sep" />
                <span className="crumb-current">{currentPageName}</span>
              </nav>
            </div>

            {showTopbarSearch && (
              <div className="search-wrap" role="search">
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="搜索站点、描述或链接…"
                  aria-label="跨分类搜索站点"
                  autoComplete="off"
                  spellCheck={false}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <kbd className="search-kbd mono" aria-hidden="true">
                  /
                </kbd>
                {searchQuery && (
                  <button
                    className="search-clear"
                    type="button"
                    aria-label="清除搜索"
                    title="清除搜索"
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon name="x" />
                  </button>
                )}
              </div>
            )}

            <div className="topbar-right">
              <button
                className="icon-btn theme-toggle"
                type="button"
                aria-label={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                aria-pressed={resolvedTheme === 'dark'}
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                <Icon name="moon" className="icon-moon" />
                <Icon name="sun" className="icon-sun" />
              </button>
              <span className="topbar-sep" aria-hidden="true" />
              <div className="user-chip" title={githubUser?.login ?? '站点所有者'}>
                <span className="avatar" aria-hidden="true">
                  {(githubUser?.login ?? 'M').charAt(0).toUpperCase()}
                </span>
                <span className="user-name">站点所有者</span>
              </div>
            </div>
          </header>

          <main className="page">
            <div className="page-inner">
              {(navRecoverableDrafts.length > 0 || configRecoverableDrafts.length > 0) && (
                <div className="banner warn">
                  <div className="banner-body">
                    <p>
                      发现未恢复的本机草稿（可能来自上次会话或其他标签页）。恢复后仍只在本机，推送前不会覆盖远程。
                    </p>
                    <div className="banner-actions">
                      {navRecoverableDrafts.map((draft) => (
                        <button
                          key={draft.draftId}
                          type="button"
                          className="btn sm btn-ghost"
                          onClick={() => navRestoreDraft(draft.draftId)}
                        >
                          恢复网站数据 · {new Date(draft.updatedAt).toLocaleString()}
                        </button>
                      ))}
                      {configRecoverableDrafts.map((draft) => (
                        <button
                          key={draft.draftId}
                          type="button"
                          className="btn sm btn-ghost"
                          onClick={() => configRestoreDraft(draft.draftId)}
                        >
                          恢复站点配置 · {new Date(draft.updatedAt).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(navPeerNotice || configPeerNotice) && (
                <div className="banner info">
                  <div className="banner-body">
                    <span>{navPeerNotice ?? configPeerNotice}</span>
                  </div>
                  <button
                    type="button"
                    className="btn sm btn-ghost"
                    onClick={() => {
                      navDismissPeerNotice();
                      configDismissPeerNotice();
                    }}
                  >
                    知道了
                  </button>
                </div>
              )}

              {authStatus === 'offline' && (
                <div className="banner warn">
                  <div className="banner-body">
                    <p>{authError ?? '当前离线：凭据和草稿已保留，可以继续编辑，但暂时不能推送。'}</p>
                  </div>
                  <div className="banner-actions">
                    <button type="button" className="btn sm btn-ghost" onClick={() => void retryConnection()}>
                      重试连接
                    </button>
                    <button type="button" className="btn sm btn-ghost" onClick={() => router.push('/login')}>
                      重新授权
                    </button>
                  </div>
                </div>
              )}

              {(navConflict || configConflict) && (
                <div className="conflict">
                  <span className="conflict-ico" aria-hidden="true">
                    <Icon name="alert" />
                  </span>
                  <div className="conflict-body">
                    <div className="conflict-title">检测到远程冲突，已停止自动覆盖</div>
                    {navConflict && (
                      <div className="conflict-detail">
                        <p>
                          网站数据：远程已被其他设备更新
                          {remoteChangeSummary && (
                            <span className="mono">
                              （新增 {remoteChangeSummary.added}、删除 {remoteChangeSummary.removed}、修改{' '}
                              {remoteChangeSummary.modified}
                              {remoteChangeSummary.moved ? `、跨分类移动 ${remoteChangeSummary.moved}` : ''}
                              {remoteChangeSummary.reordered ? '、顺序变化' : ''}）
                            </span>
                          )}
                          。本机草稿已保留。
                        </p>
                        <div className="conflict-actions">
                          <button className="btn sm btn-ghost" onClick={() => handleAdopt('nav')}>
                            {navAdoptBlocked && adoptWithoutBackup
                              ? '仍要采用远程（不保留副本）'
                              : '采用远程（放弃本机）'}
                          </button>
                          <button className="btn sm btn-danger" onClick={() => setOverwriteTarget('nav')}>
                            用本机版本覆盖
                          </button>
                        </div>
                        {navAdoptBlocked && (
                          <label className="conflict-consent">
                            <input
                              type="checkbox"
                              checked={adoptWithoutBackup}
                              onChange={(event) => setAdoptWithoutBackup(event.target.checked)}
                            />
                            我已导出草稿，确认放弃本机改动（不保留恢复副本）
                          </label>
                        )}
                      </div>
                    )}
                    {configConflict && (
                      <div className="conflict-detail">
                        <p>站点配置：远程已被其他设备更新，本机草稿已保留。</p>
                        <div className="conflict-actions">
                          <button className="btn sm btn-ghost" onClick={() => handleAdopt('config')}>
                            {configAdoptBlocked && adoptWithoutBackup
                              ? '仍要采用远程（不保留副本）'
                              : '采用远程（放弃本机）'}
                          </button>
                          <button className="btn sm btn-danger" onClick={() => setOverwriteTarget('config')}>
                            用本机版本覆盖
                          </button>
                        </div>
                        {configAdoptBlocked && (
                          <label className="conflict-consent">
                            <input
                              type="checkbox"
                              checked={adoptWithoutBackup}
                              onChange={(event) => setAdoptWithoutBackup(event.target.checked)}
                            />
                            我已导出草稿，确认放弃本机改动（不保留恢复副本）
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {conflictMessage && <p className="conflict-message">{conflictMessage}</p>}

              {children}

              <div className="page-tools">
                <DraftTools />
              </div>
            </div>
          </main>
        </div>
      </div>

      {pendingLeave && (
        <div className="modal-backdrop" role="presentation" onClick={pendingLeave.onCancel}>
          <div
            ref={leaveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="未推送的改动"
            className="modal-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>{pendingLeave.message}</h2>
                <p>
                  保存会推送到 GitHub；保留草稿会留在本机，下次进入可恢复；丢弃会放弃本机改动（会先保存恢复副本）。
                </p>
              </div>
            </div>
            {pendingLeave.error && <p className="modal-note danger">{pendingLeave.error}</p>}
            {pendingLeave.discardBlocked && (
              <div className="modal-note danger">
                <p>
                  恢复副本未能写入本机，改动已保留。请先取消并使用「导出草稿」保存；确认不再需要恢复时，可直接丢弃。
                </p>
                <button className="btn sm btn-danger" onClick={pendingLeave.onDiscardWithoutBackup}>
                  仍要丢弃（不保留恢复副本）
                </button>
              </div>
            )}
            <div className="modal-foot">
              <button ref={leaveCancelRef} onClick={pendingLeave.onCancel} className="btn btn-ghost">
                取消
              </button>
              <button onClick={pendingLeave.onDiscard} className="btn btn-ghost danger-text">
                丢弃并离开
              </button>
              <button onClick={pendingLeave.onKeep} className="btn btn-ghost">
                保留草稿离开
              </button>
              <button onClick={pendingLeave.onSave} disabled={pendingLeave.saving} className="btn btn-primary">
                {pendingLeave.saving ? '保存中…' : '保存并离开'}
              </button>
            </div>
          </div>
        </div>
      )}

      {overwriteTarget && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOverwriteTarget(null)}>
          <div
            ref={overwriteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认覆盖远程"
            className="modal-panel danger"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>确认用本机版本覆盖远程？</h2>
                <p>
                  远程当前内容会先保存为本机恢复副本，然后以你刚审阅的远程 SHA 为基线提交本机版本。
                  如果这期间远程再次变化，仍会冲突，不会自动覆盖。
                </p>
              </div>
            </div>
            <div className="modal-foot">
              <button ref={overwriteCancelRef} onClick={() => setOverwriteTarget(null)} className="btn btn-ghost">
                取消
              </button>
              <button onClick={runOverwrite} className="btn btn-danger">
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
