'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import Icon from '@/components/admin/Icon';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useAuthStore } from '@/stores/authStore';
import { useNavStore } from '@/stores/navStore';
import { useAdminUiStore, type CategoryIntent } from '@/stores/adminUiStore';

interface AdminSidebarProps {
  onLogout?: () => void;
  onBackHome?: () => void;
  onNavigate?: () => void;
  firstLinkRef?: React.MutableRefObject<HTMLAnchorElement | null>;
}

const menuItems = [
  { name: '网站管理', href: '/system/web', icon: 'grid' },
  { name: '搜索管理', href: '/system/search', icon: 'search' },
  { name: '系统设置', href: '/system/setting', icon: 'server' },
  { name: '系统信息', href: '/system/info', icon: 'message' },
];

export default function AdminSidebar({
  onLogout,
  onBackHome,
  onNavigate,
  firstLinkRef,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const githubUser = useAuthStore((s) => s.githubUser);
  const categories = useNavStore((s) => s.categories);
  const {
    activeCategoryId,
    categoryManageMode,
    setActiveCategoryId,
    setCategoryManageMode,
    setSearchQuery,
  } = useAdminUiStore();

  // Pending nav remembers the path it started from, so it clears itself once the route changes.
  const [pendingNav, setPendingNav] = useState<{ href: string; from: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const logoutDialogRef = useRef<HTMLDivElement>(null);
  const logoutCancelRef = useRef<HTMLButtonElement>(null);

  useDialogFocus({
    isOpen: showLogoutConfirm,
    dialogRef: logoutDialogRef,
    onClose: () => setShowLogoutConfirm(false),
    initialFocusRef: logoutCancelRef,
  });

  const activeHref = useMemo(() => {
    const exact = menuItems.find((item) => item.href === pathname);
    if (exact) return exact.href;
    const prefix = menuItems.find((item) => pathname.startsWith(item.href));
    return prefix ? prefix.href : '';
  }, [pathname]);

  const isLoading = useCallback(
    (href: string) => pendingNav?.href === href && pendingNav.from === pathname,
    [pendingNav, pathname]
  );

  const handleMenuClick = useCallback(
    (href: string) => {
      return (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setPendingNav({ href, from: pathname });
        onNavigate?.();
        router.push(href);
      };
    },
    [router, onNavigate, pathname]
  );

  // The page owns the category dialogs; the sidebar only announces the intent.
  const requestCategoryIntent = (intent: CategoryIntent) => {
    window.dispatchEvent(new CustomEvent<CategoryIntent>('admin:category-intent', { detail: intent }));
  };

  const totalSites = useMemo(
    () => categories.reduce((sum, category) => sum + category.nav.length, 0),
    [categories]
  );

  // Category rails are page state, so they only exist where categories do.
  const showCategories = pathname.startsWith('/system/web');

  const selectCategory = (id: number) => {
    setSearchQuery('');
    setActiveCategoryId(id);
    onNavigate?.();
  };

  const handleLogoutConfirm = () => {
    if (onLogout) {
      onLogout();
    }
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div className="brand">
        <span className="logo" aria-hidden="true">
          <Icon name="grid" />
        </span>
        <span className="brand-text">
          <strong>nav-next</strong>
          <span>管理后台</span>
        </span>
      </div>

      <nav className="side-nav" aria-label="主导航">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            ref={item === menuItems[0] ? firstLinkRef : undefined}
            onClick={handleMenuClick(item.href)}
            className={`nav-pill${activeHref === item.href ? ' active' : ''}`}
            aria-current={activeHref === item.href ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.name}</span>
            {isLoading(item.href) && <span className="spinner" aria-hidden="true" />}
          </a>
        ))}
      </nav>

      {showCategories && (
        <div className="side-section">
          <div className="side-label">
            <span className="label-text">分类</span>
            <span className="count-chip mono">{categories.length}</span>
            <span className="side-actions">
              <button
                className="icon-btn xs"
                type="button"
                title="新增分类"
                aria-label="新增分类"
                onClick={() => requestCategoryIntent({ kind: 'add' })}
              >
                <Icon name="plus" />
              </button>
              <button
                className={`icon-btn xs${categoryManageMode ? ' active' : ''}`}
                type="button"
                title={categoryManageMode ? '完成分类管理' : '管理分类'}
                aria-label={categoryManageMode ? '完成分类管理' : '管理分类'}
                aria-pressed={categoryManageMode}
                onClick={() => setCategoryManageMode(!categoryManageMode)}
              >
                <Icon name={categoryManageMode ? 'check' : 'pencil'} />
              </button>
            </span>
          </div>

          <div className="cat-list">
            {categories.map((category) => {
              const selected = category.id === activeCategoryId;
              return (
                <div
                  key={category.id}
                  className={`cat-row${selected ? ' selected' : ''}${categoryManageMode ? ' managing' : ''}`}
                >
                  <button
                    className="cat-main"
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    aria-current={selected ? 'page' : undefined}
                    title={category.title}
                  >
                    <span className="cat-ico cat-letter" aria-hidden="true">
                      {Array.from(category.title.trim())[0] ?? '·'}
                    </span>
                    <span className="cat-name">{category.title}</span>
                    <span className="cat-count mono">{category.nav.length}</span>
                  </button>
                  {categoryManageMode && (
                    <span className="cat-actions">
                      <button
                        className="icon-btn xs"
                        type="button"
                        aria-label={`编辑分类 ${category.title}`}
                        title="编辑分类"
                        onClick={() => requestCategoryIntent({ kind: 'edit', id: category.id })}
                      >
                        <Icon name="pencil" />
                      </button>
                      <button
                        className="icon-btn xs danger"
                        type="button"
                        aria-label={`删除分类 ${category.title}`}
                        title="删除分类"
                        onClick={() => requestCategoryIntent({ kind: 'delete', id: category.id })}
                      >
                        <Icon name="trash" />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {categoryManageMode && (
            <>
              <div className="cat-hint">用右侧按钮编辑或删除分类，调整顺序请点「排序」。</div>
              <div className="cat-hint-actions">
                <button
                  className="btn sm btn-ghost"
                  type="button"
                  onClick={() => requestCategoryIntent({ kind: 'sort' })}
                >
                  <Icon name="grip" />
                  排序
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="side-foot">
        <div className="data-line">
          <span className="dot" aria-hidden="true" />
          <span>
            本地数据 · <span className="mono">{totalSites}</span> 个站点
          </span>
        </div>
        <div className="user-row">
          <span className="avatar" aria-hidden="true">
            {(githubUser?.login ?? 'M').charAt(0).toUpperCase()}
          </span>
          <span className="user-meta">
            <strong>站点所有者</strong>
            <span>{githubUser?.login ?? '本机编辑'}</span>
          </span>
          <span className="user-actions">
            <button
              className="icon-btn xs"
              type="button"
              title="返回主页"
              aria-label="返回主页"
              onClick={() => onBackHome?.()}
            >
              <Icon name="external" />
            </button>
            <button
              className="icon-btn xs danger"
              type="button"
              title="退出登录"
              aria-label="退出登录"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <Icon name="x" />
            </button>
          </span>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowLogoutConfirm(false)}>
          <div
            ref={logoutDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认退出登录"
            className="modal-panel danger"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>确认退出登录</h2>
                <p>退出后需要重新授权才能继续管理站点。</p>
              </div>
            </div>
            <div className="modal-body">
              <p>本机未推送的改动会保留在草稿里，不会因为退出而丢失。</p>
            </div>
            <div className="modal-foot">
              <button ref={logoutCancelRef} type="button" className="btn btn-ghost" onClick={() => setShowLogoutConfirm(false)}>
                取消
              </button>
              <button type="button" className="btn btn-danger" onClick={handleLogoutConfirm}>
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
