'use client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavStore } from '@/stores/navStore';
import { ICategory, IWebsite } from '@/types';
import EditWebsiteModal from '@/components/EditWebsiteModal';
import EditCategoryModal from '@/components/EditCategoryModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import MoveWebsiteModal from '@/components/MoveWebsiteModal';
import CategorySortModal from '@/components/CategorySortModal';
import WebsiteSortModal from '@/components/WebsiteSortModal';
import { useAuthStore } from '@/stores/authStore';
import MessageDisplay from '@/components/MessageDisplay';
import DataCompareModal from '@/components/DataCompareModal';
import { DataDiffResult } from '@/stores/navStore';
import WebsiteCardAdmin from '@/components/WebsiteCardAdmin'; // 新增组件
import { updateFileContent, getFileContent } from '@/lib/githubApi';

export default function WebManagementPage() {
  const {
    categories,
    loading,
    fetchCategories,
    saveCategories,
    getLastSyncTime,
    checkDataSync,
    fetchRemoteData,
    compareData,
  } = useNavStore();

  const { githubToken } = useAuthStore();

  // 状态管理
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCategory, setViewingCategory] = useState<ICategory | null>(null);

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
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'loading'; text: string } | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<DataDiffResult | null>(null);

  // 排序状态
  const [isCategorySortModalOpen, setIsCategorySortModalOpen] = useState(false);
  const [sortingCategory, setSortingCategory] = useState<ICategory | null>(null);
  const [isWebsiteSortModalOpen, setIsWebsiteSortModalOpen] = useState(false);

  // --- 核心逻辑优化：使用 useMemo 缓存搜索结果，避免重复计算 ---
  const { filteredCategories, filteredWebsites } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredCategories: categories, filteredWebsites: [] };
    }

    const lowerQuery = searchQuery.toLowerCase();
    const matchedCategories: ICategory[] = [];
    const matchedWebsites: { category: ICategory; website: IWebsite }[] = [];

    categories.forEach((category) => {
      // 匹配分类
      if (category.title.toLowerCase().includes(lowerQuery)) {
        matchedCategories.push(category);
      }
      // 匹配网站
      category.nav.forEach((website) => {
        if (
          website.name.toLowerCase().includes(lowerQuery) ||
          website.desc.toLowerCase().includes(lowerQuery) ||
          website.url.toLowerCase().includes(lowerQuery)
        ) {
          matchedWebsites.push({ category, website });
        }
      });
    });

    return { filteredCategories: matchedCategories, filteredWebsites: matchedWebsites };
  }, [searchQuery, categories]);

  // --- CRUD 操作处理 ---

  const handleUseRemoteConfig = async () => {
    if (!githubToken) return showMessage('error', '请先配置 GitHub Token');

    // 设置加载状态
    setIsSyncing(true);
    setMessage({ type: 'loading', text: '正在拉取远程配置...' });
    setIsMessageVisible(true);

    try {
      // 获取远程数据
      const remoteData = await fetchRemoteData(githubToken);

      if (!remoteData) {
        throw new Error('远程数据为空或格式错误');
      }

      // 保存到本地存储 (覆盖)
      await saveCategories(remoteData);

      // 更新时间
      updateSyncTime();

      // 关闭模态框
      setIsCompareModalOpen(false);

      // 成功提示
      setMessage({ type: 'success', text: '同步成功！页面即将刷新...' });

      // 延迟刷新页面，确保状态重置
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('拉取失败:', error);
      showMessage('error', `拉取失败: ${(error as Error).message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. 同步本地配置到远程 (Push: Local -> Remote)
  const handleSyncToLocalRemote = async () => {
    if (!githubToken) return showMessage('error', '请先配置 GitHub Token');

    // 配置信息 (建议后续提取到环境变量或设置页)
    const owner = 'mmungdong'; // ⚠️ 请确认这是你的 GitHub 用户名
    const repo = 'nav-next';   // ⚠️ 请确认这是你的 仓库名
    const path = 'public/data/db.json'; // 数据文件路径
    const branch = 'main';     // 分支名

    setIsSyncing(true);
    setMessage({ type: 'loading', text: '正在推送到远程仓库...' });
    setIsMessageVisible(true);

    try {
      // 第一步：获取远程文件的 SHA (GitHub API 更新文件必须提供 SHA)
      const fileInfo = await getFileContent(
        githubToken,
        owner,
        repo,
        path,
        branch
      );

      // 第二步：准备要上传的内容
      // 格式化 JSON，缩进2个空格，方便阅读
      const content = JSON.stringify(categories, null, 2);
      const commitMessage = `Update data via Web Console: ${new Date().toLocaleString()}`;

      // 第三步：执行更新
      await updateFileContent(
        githubToken,
        owner,
        repo,
        path,
        content,
        commitMessage,
        branch,
        fileInfo.sha // 如果是新建文件，这里可能是 undefined，但在同步场景下通常文件已存在
      );

      // 成功处理
      updateSyncTime();
      setIsCompareModalOpen(false);
      showMessage('success', '推送成功！远程仓库已更新');

    } catch (error) {
      console.error('推送失败:', error);
      let errMsg = (error as Error).message;
      if (errMsg.includes('404')) {
        errMsg = '找不到仓库或文件，请检查用户名/仓库名配置';
      } else if (errMsg.includes('409')) {
        errMsg = '发生冲突，请先拉取远程最新代码';
      }
      showMessage('error', `推送失败: ${errMsg}`);
    } finally {
      setIsSyncing(false);
      // 3秒后隐藏 loading 消息（如果 showMessage 没覆盖的话）
      setTimeout(() => setIsMessageVisible(false), 3000);
    }
  };

  // 显示消息辅助函数
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setIsMessageVisible(true);
    setTimeout(() => {
      setMessage(null);
      setIsMessageVisible(false);
    }, 3000);
  };

  // 更新最后同步时间
  const updateSyncTime = () => {
    const currentTime = new Date().toISOString();
    setLastSyncTime(currentTime);
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

      await saveCategories(updatedCategories);
      updateSyncTime();
      setIsEditModalOpen(false);
      setEditingWebsite(undefined);
      showMessage('success', '网站保存成功');
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
      await saveCategories(updatedCategories);
      updateSyncTime();
      setIsDeleteModalOpen(false);
      setDeletingWebsite(null);
      showMessage('success', '网站已删除');
    } catch (error) {
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

      await saveCategories(updatedCategories);
      updateSyncTime();
      setIsMoveModalOpen(false);
      setMovingWebsite(undefined);
      showMessage('success', '移动成功');
    } catch (error) {
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
      await saveCategories(updatedCategories);
      updateSyncTime();
      setIsEditCategoryModalOpen(false);
      setEditingCategory(undefined);
      showMessage('success', '分类保存成功');
    } catch (error) {
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
      await saveCategories(updatedCategories);
      updateSyncTime();
      setIsDeleteCategoryModalOpen(false);
      setDeletingCategory(null);
      showMessage('success', '分类已删除');
    } catch (error) {
      showMessage('error', '删除分类失败');
    }
  };

  // 排序相关
  const handleSaveCategorySort = async (sortedCategories: ICategory[]) => {
    await saveCategories(sortedCategories);
    updateSyncTime();
    setIsCategorySortModalOpen(false);
    showMessage('success', '分类排序已保存');
  };

  const handleSaveWebsiteSort = async (categoryId: number, sortedWebsites: IWebsite[]) => {
    const updatedCategories = categories.map((cat) =>
      cat.id === categoryId ? { ...cat, nav: sortedWebsites } : cat
    );
    await saveCategories(updatedCategories);
    updateSyncTime();
    setIsWebsiteSortModalOpen(false);
    showMessage('success', '网站排序已保存');
  };

  // 数据同步相关
  const handleCompareData = async () => {
    if (!githubToken) return showMessage('error', '请先配置 GitHub Token');
    setMessage({ type: 'loading', text: '正在获取远程数据...' });
    setIsMessageVisible(true);

    try {
      const remoteData = await fetchRemoteData(githubToken);
      if (remoteData) {
        const diff = compareData(categories, remoteData);
        setDiffResult(diff);
        setIsCompareModalOpen(true);
      } else {
        showMessage('error', '无法获取远程数据');
      }
    } catch (error) {
      showMessage('error', '比较失败: ' + (error as Error).message);
    } finally {
      if (message?.type === 'loading') setIsMessageVisible(false);
    }
  };

  // 初始化
  useEffect(() => {
    fetchCategories();
    const lastSync = getLastSyncTime();
    if (lastSync) setLastSyncTime(lastSync);
  }, [fetchCategories, getLastSyncTime]);

  // 添加网站
  const handleAddWebsite = (category: ICategory) => {
    setSelectedCategory(category);
    setEditingWebsite(undefined);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-500">加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <MessageDisplay message={message} isMessageVisible={isMessageVisible} />

      {/* 顶部 Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              网站管理控制台
            </h1>
            {lastSyncTime && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                最后同步: {new Date(lastSyncTime).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {githubToken && (
              <button
                className="flex items-center px-4 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-all font-medium"
                onClick={handleCompareData}
                disabled={isSyncing}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                数据同步
              </button>
            )}
            <button
              className="flex items-center px-4 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all font-medium"
              onClick={() => setIsCategorySortModalOpen(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              分类排序
            </button>
            <button
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all font-medium"
              onClick={handleAddCategory}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建分类
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
            placeholder="搜索网站名称、描述或 URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 搜索模式 */}
        {searchQuery.trim() ? (
          <>
            {/* 搜索到的分类 */}
            {filteredCategories.length > 0 && !viewingCategory && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">匹配的分类</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => setViewingCategory(category)}
                      className="group bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl bg-gray-100 dark:bg-gray-700 w-12 h-12 flex items-center justify-center rounded-lg group-hover:scale-110 transition-transform">
                          {category.icon || '📂'}
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{category.title}</h3>
                          <p className="text-sm text-gray-500">{category.nav.length} 个资源</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 搜索到的网站 */}
            {(filteredWebsites.length > 0 || viewingCategory) && (
              <section>
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">
                      {viewingCategory ? `分类: ${viewingCategory.title}` : '匹配的网站'}
                    </h2>
                    {viewingCategory && (
                      <button
                        onClick={() => setViewingCategory(null)}
                        className="text-sm text-blue-500 hover:text-blue-600 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        返回所有结果
                      </button>
                    )}
                 </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {(viewingCategory ? viewingCategory.nav : filteredWebsites.map(fw => fw.website)).map((website) => {
                    // 如果是搜索结果，我们需要找到对应的 category 传给 Card
                    const category = viewingCategory || filteredWebsites.find(fw => fw.website.id === website.id)?.category;
                    if (!category) return null;

                    return (
                      <WebsiteCardAdmin
                        key={website.id}
                        website={website}
                        categoryName={category.title}
                        onEdit={() => {
                          setSelectedCategory(category);
                          setEditingWebsite(website);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={() => handleDeleteWebsite(website, category)}
                        onMove={() => handleMoveWebsite(website, category)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {filteredCategories.length === 0 && filteredWebsites.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">未找到相关内容</h3>
                <p className="text-gray-500 mt-2">换个关键词试试看？</p>
              </div>
            )}
          </>
        ) : (
          /* 默认视图：全部分类 */
          categories.map((category) => (
            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* 分类标题栏 */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {category.title}
                    <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {category.nav.length}
                    </span>
                  </h2>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleAddWebsite(category)}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-md text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    + 添加网站
                  </button>
                  <button
                    onClick={() => {
                      setSortingCategory(category);
                      setIsWebsiteSortModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="排序"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
                    title="编辑分类"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    title="删除分类"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 网站列表 Grid */}
              <div className="p-6 bg-white dark:bg-gray-800">
                {category.nav.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <p className="text-gray-400 text-sm">暂无网站，点击上方按钮添加</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {category.nav.map((website) => (
                      <WebsiteCardAdmin
                        key={website.id}
                        website={website}
                        onEdit={() => {
                          setSelectedCategory(category);
                          setEditingWebsite(website);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={() => handleDeleteWebsite(website, category)}
                        onMove={() => handleMoveWebsite(website, category)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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

      <EditCategoryModal
        category={editingCategory}
        isOpen={isEditCategoryModalOpen}
        onClose={() => setIsEditCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />

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

      <MoveWebsiteModal
        categories={categories}
        website={movingWebsite}
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={confirmMoveWebsite}
      />

      <CategorySortModal
        categories={categories}
        isOpen={isCategorySortModalOpen}
        onClose={() => setIsCategorySortModalOpen(false)}
        onSave={handleSaveCategorySort}
      />

      <WebsiteSortModal
        category={sortingCategory || { id: 0, title: '', icon: '', nav: [] }}
        isOpen={isWebsiteSortModalOpen}
        onClose={() => setIsWebsiteSortModalOpen(false)}
        onSave={handleSaveWebsiteSort}
      />

      <DataCompareModal
        diffResult={diffResult}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        // 注意：这里需要根据你的 store 实现具体的同步方法
        onUseRemote={handleUseRemoteConfig}
        onSyncToRemote={handleSyncToLocalRemote}
        setMessage={setMessage}
      />
    </div>
  );
}
