'use client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavStore } from '@/stores/navStore';
import { ICategory, IWebsite } from '@/types';
import EditWebsiteModal from '@/components/EditWebsiteModal';
import EditCategoryModal from '@/components/EditCategoryModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import MoveWebsiteModal from '@/components/MoveWebsiteModal';
import CategorySortModal from '@/components/CategorySortModal';
import WebsiteSortModal from '@/components/WebsiteSortModal';
import { useAuthStore } from '@/stores/authStore';
import { useFlashMessage } from '@/hooks/useFlashMessage';
import Icon from '@/components/admin/Icon';
import { useAdminUiStore, type CategoryIntent } from '@/stores/adminUiStore';

// The persisted sync time lives outside React; the server has no localStorage.
const subscribeToStorage = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};
const getServerLastSync = (): string | null => null;

const monoChar = (name: string) => {
  const text = String(name).trim();
  if (!text) return '·';
  return /^[A-Za-z0-9]/.test(text) ? text[0].toUpperCase() : Array.from(text)[0];
};

const prettyUrl = (url: string) =>
  String(url)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

const formatSyncTime = (value: string | null) => {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return sameDay ? `今天 ${clock}` : `${date.getMonth() + 1}/${date.getDate()} ${clock}`;
};

export default function WebManagementPage() {
  const {
    categories,
    loading,
    saveCategories,
    getLastSyncTime,
    lastSyncAt,
    pushToRemote,
    checkRemote,
    dirty,
    draftIssue,
    conflict,
    syncStatus,
  } = useNavStore();

  const { githubToken } = useAuthStore();

  // 状态管理
  const searchQuery = useAdminUiStore((s) => s.searchQuery);
  const setSearchQuery = useAdminUiStore((s) => s.setSearchQuery);
  const activeCategoryId = useAdminUiStore((s) => s.activeCategoryId);
  const setActiveCategoryId = useAdminUiStore((s) => s.setActiveCategoryId);

  // Modals 状态
  const [editingWebsite, setEditingWebsite] = useState<IWebsite | undefined>(undefined);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | undefined>(undefined);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState<IWebsite | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ICategory | null>(null);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [movingWebsite, setMovingWebsite] = useState<IWebsite | undefined>(undefined);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ICategory | null>(null);

  // 同步与消息状态
  // The store holds this session's push; localStorage holds earlier sessions.
  const persistedLastSync = useSyncExternalStore(
    subscribeToStorage,
    getLastSyncTime,
    getServerLastSync
  );
  const lastSyncTime = lastSyncAt ?? persistedLastSync;
  const { message, flash: showMessage } = useFlashMessage(3000);
  const [savingRemote, setSavingRemote] = useState(false);

  // 排序状态
  const [isCategorySortModalOpen, setIsCategorySortModalOpen] = useState(false);
  const [sortingCategoryId, setSortingCategoryId] = useState<number | null>(null);
  const [isWebsiteSortModalOpen, setIsWebsiteSortModalOpen] = useState(false);

  const sortingCategory = useMemo(
    () => categories.find((category) => category.id === sortingCategoryId) ?? null,
    [categories, sortingCategoryId]
  );

  // The selected category lives in the shared chrome state, so it survives the
  // sidebar unmounting on narrow screens and stays valid after a delete.
  const activeCategory = useMemo(() => {
    const found = categories.find((category) => category.id === activeCategoryId);
    return found ?? categories[0] ?? null;
  }, [categories, activeCategoryId]);

  useEffect(() => {
    if (!activeCategory) return;
    if (activeCategory.id !== activeCategoryId) setActiveCategoryId(activeCategory.id);
  }, [activeCategory, activeCategoryId, setActiveCategoryId]);

  // --- 核心逻辑优化：使用 useMemo 缓存搜索结果，避免重复计算 ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();
    const matched: { category: ICategory; website: IWebsite }[] = [];

    categories.forEach((category) => {
      category.nav.forEach((website) => {
        if (
          website.name.toLowerCase().includes(lowerQuery) ||
          website.desc.toLowerCase().includes(lowerQuery) ||
          website.url.toLowerCase().includes(lowerQuery)
        ) {
          matched.push({ category, website });
        }
      });
    });

    return matched;
  }, [searchQuery, categories]);

  // --- CRUD 操作处理 ---

  const handlePushToRemote = async () => {
    if (!githubToken) return showMessage('error', '请先配置 GitHub Token');
    setSavingRemote(true);
    const result = await pushToRemote(githubToken);
    setSavingRemote(false);
    if (result.status === 'success') {
      showMessage('success', 'GitHub 已更新；首页需等待部署后才会显示新数据');
      return;
    }
    showMessage('error', result.message);
  };

  const handleCheckRemote = async () => {
    if (!githubToken) return showMessage('error', '请先配置 GitHub Token');
    const outcome = await checkRemote(githubToken, { manual: true });
    if (outcome.result.status === 'success' && !outcome.checked) {
      return showMessage('error', '尚未取得远程基线，无法检查更新');
    }
    if (outcome.result.status === 'success') {
      showMessage('success', outcome.remoteChanged ? '已获取远程更新' : '远程没有新变化');
      return;
    }
    showMessage('error', outcome.result.message);
  };

  // 保存网站
  const handleSaveWebsite = async (website: IWebsite) => {
    try {
      const updatedCategories = categories.map((category) => {
        if (category.id === selectedCategory?.id) {
          const existingIndex = category.nav.findIndex((w) => w.id === website.id);
          let updatedNav;
          if (existingIndex >= 0) {
            updatedNav = category.nav.map((w, index) => (index === existingIndex ? website : w));
          } else {
            updatedNav = [...category.nav, website];
          }
          return { ...category, nav: updatedNav };
        }
        return category;
      });

      const saved = saveCategories(updatedCategories);
      setIsEditModalOpen(false);
      setEditingWebsite(undefined);
      showMessage(
        saved ? 'success' : 'error',
        saved ? '网站已保存到本机，尚未推送' : '本机保存失败，改动仅在当前页面内'
      );
    } catch (error) {
      console.error('保存网站失败:', error);
      showMessage('error', '保存网站失败');
    }
  };

  // 删除网站
  const handleDeleteWebsite = (website: IWebsite, category: ICategory) => {
    setDeletingWebsite(website);
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteWebsite = async () => {
    if (!deletingWebsite || !selectedCategory) return;
    try {
      const updatedCategories = categories.map((category) => {
        if (category.id === selectedCategory.id) {
          return { ...category, nav: category.nav.filter((w) => w.id !== deletingWebsite.id) };
        }
        return category;
      });
      const saved = saveCategories(updatedCategories);
      setIsDeleteModalOpen(false);
      setDeletingWebsite(null);
      showMessage(
        saved ? 'success' : 'error',
        saved ? '网站已删除，尚未推送' : '本机保存失败，改动仅在当前页面内'
      );
    } catch {
      showMessage('error', '删除失败');
    }
  };

  // 移动网站
  const handleMoveWebsite = (website: IWebsite, category: ICategory) => {
    setMovingWebsite(website);
    setSelectedCategory(category);
    setIsMoveModalOpen(true);
  };

  const confirmMoveWebsite = async (targetCategoryId: number) => {
    if (!movingWebsite || !selectedCategory) return;
    try {
      let updatedCategories = categories.map((cat) => {
        // 移除
        if (cat.id === selectedCategory.id) {
          return { ...cat, nav: cat.nav.filter((w) => w.id !== movingWebsite.id) };
        }
        return cat;
      });

      // 添加
      updatedCategories = updatedCategories.map((cat) => {
        if (cat.id === targetCategoryId) {
          return { ...cat, nav: [...cat.nav, movingWebsite] };
        }
        return cat;
      });

      const saved = saveCategories(updatedCategories);
      setIsMoveModalOpen(false);
      setMovingWebsite(undefined);
      showMessage(
        saved ? 'success' : 'error',
        saved ? '网站已移动，尚未推送' : '本机保存失败，改动仅在当前页面内'
      );
    } catch {
      showMessage('error', '移动失败');
    }
  };

  // 分类操作
  const handleAddCategory = () => {
    setEditingCategory(undefined);
    setIsEditCategoryModalOpen(true);
  };

  const handleEditCategory = (category: ICategory) => {
    setEditingCategory(category);
    setIsEditCategoryModalOpen(true);
  };

  const handleSaveCategory = async (category: ICategory) => {
    try {
      let updatedCategories;
      if (editingCategory) {
        updatedCategories = categories.map((cat) =>
          cat.id === category.id ? { ...category, nav: cat.nav || [] } : cat
        );
      } else {
        updatedCategories = [...categories, { ...category, nav: [] }];
      }
      const saved = saveCategories(updatedCategories);
      setIsEditCategoryModalOpen(false);
      setEditingCategory(undefined);
      showMessage(
        saved ? 'success' : 'error',
        saved ? '分类已保存到本机，尚未推送' : '本机保存失败，改动仅在当前页面内'
      );
    } catch {
      showMessage('error', '分类保存失败');
    }
  };

  const handleDeleteCategory = (category: ICategory) => {
    setDeletingCategory(category);
    setIsDeleteCategoryModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      const updatedCategories = categories.filter((cat) => cat.id !== deletingCategory.id);
      const saved = saveCategories(updatedCategories);
      setIsDeleteCategoryModalOpen(false);
      setDeletingCategory(null);
      showMessage(
        saved ? 'success' : 'error',
        saved ? '分类已删除，尚未推送' : '本机保存失败，改动仅在当前页面内'
      );
    } catch {
      showMessage('error', '删除分类失败');
    }
  };

  // 排序相关：只提交 ID 顺序，再与当前对象合并
  const handleSaveCategorySort = async (orderedIds: number[]) => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const sorted = orderedIds
      .map((id) => categoryMap.get(id))
      .filter((category): category is ICategory => Boolean(category));
    if (sorted.length !== categories.length) {
      showMessage('error', '分类列表已变化，请重新打开排序');
      return;
    }
    const saved = saveCategories(sorted);
    setIsCategorySortModalOpen(false);
    showMessage(saved ? 'success' : 'error', saved ? '分类排序已保存到本机' : '本机保存失败，排序仅在页面内');
  };

  const handleSaveWebsiteSort = async (categoryId: number, orderedIds: number[]) => {
    const current = categories.find((category) => category.id === categoryId);
    if (!current) {
      showMessage('error', '分类已不存在，请重新打开排序');
      setIsWebsiteSortModalOpen(false);
      return;
    }
    const websiteMap = new Map(current.nav.map((website) => [website.id, website]));
    const sortedNav = orderedIds
      .map((id) => websiteMap.get(id))
      .filter((website): website is IWebsite => Boolean(website));
    if (sortedNav.length !== current.nav.length) {
      showMessage('error', '分类内网站已变化，请重新打开排序');
      return;
    }
    const saved = saveCategories(
      categories.map((category) =>
        category.id === categoryId ? { ...category, nav: sortedNav } : category
      )
    );
    setIsWebsiteSortModalOpen(false);
    showMessage(saved ? 'success' : 'error', saved ? '网站排序已保存到本机' : '本机保存失败，排序仅在页面内');
  };

  // 添加网站
  const handleAddWebsite = (category: ICategory) => {
    setSelectedCategory(category);
    setEditingWebsite(undefined);
    setIsEditModalOpen(true);
  };

  // The sidebar lives in the layout, so category dialogs are opened through a
  // DOM event rather than prop-drilling the handlers up and back down.
  const noop = () => {};
  const categoryHandlers = useRef({
    add: noop,
    sort: noop,
    edit: noop as (id: number) => void,
    remove: noop as (id: number) => void,
  });

  useEffect(() => {
    categoryHandlers.current = {
      add: handleAddCategory,
      sort: () => setIsCategorySortModalOpen(true),
      edit: (id: number) => {
        const category = categories.find((item) => item.id === id);
        if (category) handleEditCategory(category);
      },
      remove: (id: number) => {
        const category = categories.find((item) => item.id === id);
        if (category) handleDeleteCategory(category);
      },
    };
  });

  useEffect(() => {
    const onIntent = (event: Event) => {
      const intent = (event as CustomEvent<CategoryIntent>).detail;
      const handlers = categoryHandlers.current;
      if (intent.kind === 'add') handlers.add();
      if (intent.kind === 'sort') handlers.sort();
      if (intent.kind === 'edit') handlers.edit(intent.id);
      if (intent.kind === 'delete') handlers.remove(intent.id);
    };
    window.addEventListener('admin:category-intent', onIntent);
    return () => window.removeEventListener('admin:category-intent', onIntent);
  }, []);

  const toastType = message?.type === 'error' ? 'error' : 'success';

  const syncState = (() => {
    if (syncStatus === 'loading') return { cls: 'syncing', text: '正在比对远端数据…', spin: true };
    if (conflict) return { cls: 'danger', text: '冲突待处理', spin: false };
    if (savingRemote) return { cls: 'syncing', text: '正在推送到 GitHub…', spin: true };
    if (dirty) return { cls: 'warn', text: `${dirty} 项未推送`, spin: false };
    return { cls: 'ok', text: '已同步', spin: false };
  })();

  const listRows = searchQuery.trim()
    ? searchResults.map((entry) => ({ ...entry, inSearch: true }))
    : (activeCategory?.nav ?? []).map((website) => ({
        category: activeCategory as ICategory,
        website,
        inSearch: false,
      }));

  const listTitle = searchQuery.trim() ? '搜索结果' : (activeCategory?.title ?? '站点');
  const listCount = listRows.length;
  const pinnedCount = searchQuery.trim()
    ? listRows.filter((row) => row.website.top).length
    : (activeCategory?.nav ?? []).filter((site) => site.top).length;

  if (loading) {
    return (
      <div className="list-card" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="sk-row" key={index}>
            <span className="sk sk-grip" />
            <span className="sk sk-avatar" />
            <span className="sk-lines">
              <span className="sk sk-line w1" />
              <span className="sk sk-line w2" />
              <span className="sk sk-line w3" />
            </span>
            <span className="sk sk-stars" />
            <span className="sk sk-actions" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="mono">/system/web</span>
            <span className="eyebrow-dot" aria-hidden="true" />
            <span>后台 · 站点维护</span>
          </div>
          <h1>网站管理</h1>
          <p className="page-sub">
            维护 {categories.length} 个分类与{' '}
            {categories.reduce((sum, category) => sum + category.nav.length, 0)} 个站点，改动先保存在本地，确认后再推送到 GitHub。
          </p>
          {draftIssue && <p className="page-sub danger-text">{draftIssue}</p>}
        </div>
        <div className="head-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => activeCategory && handleAddWebsite(activeCategory)}
            disabled={!activeCategory}
          >
            <Icon name="plus" />
            新增站点
          </button>
        </div>
      </div>

      <section className="sync-card" aria-label="数据同步">
        <div className="sync-main">
          <span className={`sync-ico${conflict ? ' warn' : ''}`} aria-hidden="true">
            <Icon name={conflict ? 'alert' : 'cloud'} />
          </span>
          <div className="sync-text">
            <div className="sync-title">
              数据同步{' '}
              <span className={`status-pill ${syncState.cls}`} role="status">
                {syncState.spin ? <span className="spinner" /> : <span className="dot" />}
                {syncState.text}
              </span>
            </div>
            <p className="sync-meta">
              最近同步 <span className="mono">{formatSyncTime(lastSyncTime)}</span>
              <span className="sep">·</span>GitHub
              <span className="sep">·</span>
              <span className="mono">main</span>
              <span className="sep">·</span>
              <span className="mono">public/data/db.json</span>
            </p>
          </div>
        </div>
        <div className="sync-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleCheckRemote}
            disabled={!githubToken || Boolean(conflict) || syncStatus === 'loading'}
          >
            <Icon name="download" />
            从远端拉取
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handlePushToRemote}
            disabled={!githubToken || !dirty || savingRemote || Boolean(conflict)}
          >
            <Icon name="upload" />
            {savingRemote ? '推送中…' : '推送到远端'}
          </button>
        </div>
      </section>

      <div className="list-head">
        <div className="list-heading">
          <span className="list-ico">
            <Icon name={searchQuery.trim() ? 'search' : 'star'} />
          </span>
          <div>
            <div className="list-title-row">
              <h2>{listTitle}</h2>
              <span className="count-chip mono">{listCount}</span>
            </div>
            <p className="list-meta">
              {searchQuery.trim()
                ? `包含 “${searchQuery}” 的站点 · 全部分类`
                : listCount
                  ? `${listCount} 个站点 · ${pinnedCount} 个置顶`
                  : '暂无站点，等待整理'}
            </p>
          </div>
        </div>
        <div className="list-actions">
          {!searchQuery.trim() && activeCategory && (
            <button
              className="btn sm btn-ghost"
              type="button"
              onClick={() => {
                setSortingCategoryId(activeCategory.id);
                setIsWebsiteSortModalOpen(true);
              }}
              disabled={!listCount}
            >
              <Icon name="grip" />
              排序
            </button>
          )}
          {searchQuery.trim() && (
            <button className="btn sm btn-ghost" type="button" onClick={() => setSearchQuery('')}>
              <Icon name="x" />
              清除搜索
            </button>
          )}
        </div>
      </div>

      {listCount === 0 ? (
        <div className="empty">
          <span className="empty-art" aria-hidden="true">
            <Icon name={searchQuery.trim() ? 'search' : 'inbox'} />
          </span>
          <h3>
            {searchQuery.trim() ? '没有找到匹配的站点' : `「${activeCategory?.title ?? ''}」还没有站点`}
          </h3>
          <p>
            {searchQuery.trim()
              ? `没有与 “${searchQuery}” 相关的名称、描述或链接。试试更短的关键词，或清除搜索浏览分类。`
              : '新建一个站点，或从其他分类中移动现有站点到这里。评分、标签与置顶状态都会保留。'}
          </p>
          {searchQuery.trim() ? (
            <button className="btn btn-ghost" type="button" onClick={() => setSearchQuery('')}>
              <Icon name="x" />
              清除搜索
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => activeCategory && handleAddWebsite(activeCategory)}
            >
              <Icon name="plus" />
              添加第一个站点
            </button>
          )}
        </div>
      ) : (
        <div className="list-card" role="list">
          {listRows.map(({ category, website, inSearch }) => {
            const tags = (website.tags ?? []).filter(
              (tag): tag is string => typeof tag === 'string' && tag.trim() !== ''
            );
            return (
              <article className="site-row" role="listitem" key={`${category.id}-${website.id}`}>
                <span className="site-grip" aria-hidden="true" />
                <span className="site-avatar" aria-hidden="true">
                  {monoChar(website.name)}
                </span>
                <div className="site-main">
                  <div className="site-titleline">
                    <h3 className="site-name" title={website.name}>
                      {website.name}
                    </h3>
                    {website.top && (
                      <span className="pin-badge">
                        <Icon name="pin" />
                        置顶
                      </span>
                    )}
                    <span className="site-tags">
                      {tags.slice(0, 2).map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                      {tags.length > 2 && <span className="tag">+{tags.length - 2}</span>}
                    </span>
                  </div>
                  <p className="site-desc" title={website.desc}>
                    {website.desc}
                  </p>
                  <div className="site-url">
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`在新标签页打开 ${website.url}`}
                    >
                      {prettyUrl(website.url)}
                    </a>
                    {inSearch && (
                      <span className="cat-chip">
                        <Icon name="tag" />
                        {category.title}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="site-rate"
                  aria-label={`评分 ${website.rate ?? 0} 分，满分 5 分`}
                >
                  <span className="stars" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        name={star <= (website.rate ?? 0) ? 'star-fill' : 'star'}
                        className={`star${star <= (website.rate ?? 0) ? ' on' : ''}`}
                      />
                    ))}
                  </span>
                  <span className="rate-num mono">{(website.rate ?? 0).toFixed(1)}</span>
                </div>
                <div className="site-actions">
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label={`编辑 ${website.name}`}
                    title="编辑站点"
                    onClick={() => {
                      setSelectedCategory(category);
                      setEditingWebsite(website);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Icon name="pencil" />
                  </button>
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label={`移动 ${website.name}`}
                    title="移动到其他分类"
                    onClick={() => handleMoveWebsite(website, category)}
                  >
                    <Icon name="move" />
                  </button>
                  <button
                    className="icon-btn danger"
                    type="button"
                    aria-label={`删除 ${website.name}`}
                    title="删除站点"
                    onClick={() => handleDeleteWebsite(website, category)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="page-foot">
        数据来源 <span className="mono">public/data/db.json</span>
        <span className="eyebrow-dot" aria-hidden="true" />
        改动先写入本机草稿
      </p>

      {/* Modals */}
      <EditWebsiteModal
        website={editingWebsite}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWebsite(undefined);
        }}
        onSave={handleSaveWebsite}
      />

      {isEditCategoryModalOpen && (
        <EditCategoryModal
          key={editingCategory?.id ?? 'new'}
          category={editingCategory}
          isOpen={isEditCategoryModalOpen}
          onClose={() => setIsEditCategoryModalOpen(false)}
          onSave={handleSaveCategory}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteWebsite}
        itemName={deletingWebsite?.name || ''}
      />

      <DeleteConfirmModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        onConfirm={confirmDeleteCategory}
        itemName={deletingCategory?.title || ''}
      />

      {isMoveModalOpen && (
        <MoveWebsiteModal
          categories={categories}
          website={movingWebsite}
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onMove={confirmMoveWebsite}
        />
      )}

      <CategorySortModal
        categories={categories}
        isOpen={isCategorySortModalOpen}
        onClose={() => setIsCategorySortModalOpen(false)}
        onSave={handleSaveCategorySort}
      />

      {sortingCategory && (
        <WebsiteSortModal
          key={sortingCategory.id}
          category={sortingCategory}
          isOpen={isWebsiteSortModalOpen}
          onClose={() => setIsWebsiteSortModalOpen(false)}
          onSave={handleSaveWebsiteSort}
        />
      )}

      {message && (
        <div className="toasts" role="status" aria-live="polite">
          <div className={`toast ${toastType} in`}>
            <span className="toast-ico" aria-hidden="true">
              <Icon name={toastType === 'error' ? 'alert' : 'check'} />
            </span>
            <span className="toast-copy">
              <strong>{toastType === 'error' ? '操作失败' : '已完成'}</strong>
              <span>{message.text}</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}