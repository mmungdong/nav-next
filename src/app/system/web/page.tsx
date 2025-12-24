'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import DefaultIcon, { isIconUrlFailed } from '@/components/DefaultIcon';
import Image from 'next/image';
import { ICategory, IWebsite } from '@/types';
import EditWebsiteModal from '@/components/EditWebsiteModal';
import EditCategoryModal from '@/components/EditCategoryModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import MoveWebsiteModal from '@/components/MoveWebsiteModal';
import CategorySortModal from '@/components/CategorySortModal';
import WebsiteSortModal from '@/components/WebsiteSortModal';
import { useAuthStore } from '@/stores/authStore';
import { updateFileContent, getFileContent } from '@/lib/githubApi';

export default function WebManagementPage() {
  const {
    categories,
    loading,
    fetchCategories,
    saveCategories,
    getLastSyncTime,
  } = useNavStore();
  const { githubToken } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCategory, setViewingCategory] = useState<ICategory | null>(
    null
  ); // 当前查看的分类
  const [editingWebsite, setEditingWebsite] = useState<IWebsite | undefined>(
    undefined
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | undefined>(
    undefined
  );
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState<IWebsite | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ICategory | null>(
    null
  );
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] =
    useState(false);
  const [movingWebsite, setMovingWebsite] = useState<IWebsite | undefined>(
    undefined
  );
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ICategory | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCategorySortModalOpen, setIsCategorySortModalOpen] = useState(false);
  const [sortingCategory, setSortingCategory] = useState<ICategory | null>(
    null
  );
  const [isWebsiteSortModalOpen, setIsWebsiteSortModalOpen] = useState(false);

  // 消息展示组件
  const MessageDisplay = () => {
    if (!message) return null;

    return (
      <div
        className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        <div className="flex items-start">
          {message.type === 'success' ? (
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          )}
          <div>
            {message.text.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 编辑网站
  const handleEditWebsite = (website: IWebsite) => {
    setEditingWebsite(website);
    setIsEditModalOpen(true);
  };

  // 保存网站
  const handleSaveWebsite = async (website: IWebsite) => {
    try {
      // 更新本地状态
      const updatedCategories = categories.map((category) => {
        if (category.id === selectedCategory?.id) {
          // 检查是否是编辑现有网站还是添加新网站
          const existingWebsiteIndex = category.nav.findIndex(
            (w) => w.id === website.id
          );

          let updatedNav;
          if (existingWebsiteIndex >= 0) {
            // 编辑现有网站
            updatedNav = category.nav.map((w, index) =>
              index === existingWebsiteIndex ? website : w
            );
          } else {
            // 添加新网站
            updatedNav = [...category.nav, website];
          }

          return { ...category, nav: updatedNav };
        }
        return category;
      });

      // 保存到本地存储
      await saveCategories(updatedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(updatedCategories);
      }

      setIsEditModalOpen(false);
      setEditingWebsite(undefined);
    } catch (error) {
      console.error('保存网站失败:', error);
      setMessage({ type: 'error', text: '保存失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 删除网站
  const handleDeleteWebsite = (website: IWebsite, category: ICategory) => {
    setDeletingWebsite(website);
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  // 确认删除网站
  const confirmDeleteWebsite = async () => {
    if (!deletingWebsite || !selectedCategory) return;

    try {
      // 更新本地状态
      const updatedCategories = categories.map((category) => {
        if (category.id === selectedCategory.id) {
          const updatedNav = category.nav.filter(
            (w) => w.id !== deletingWebsite.id
          );
          return { ...category, nav: updatedNav };
        }
        return category;
      });

      // 保存到本地存储
      await saveCategories(updatedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(updatedCategories);
      }

      setIsDeleteModalOpen(false);
      setDeletingWebsite(null);
      setSelectedCategory(null);
    } catch (error) {
      console.error('删除网站失败:', error);
      setMessage({ type: 'error', text: '删除失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 移动网站
  const handleMoveWebsite = (website: IWebsite, category: ICategory) => {
    setMovingWebsite(website);
    setSelectedCategory(category);
    setIsMoveModalOpen(true);
  };

  // 添加网站到分类
  const handleAddWebsite = (category: ICategory) => {
    setSelectedCategory(category);
    setEditingWebsite(undefined); // 添加新模式
    setIsEditModalOpen(true);
  };

  // 添加分类
  const handleAddCategory = () => {
    setEditingCategory(undefined); // 添加新模式
    setIsEditCategoryModalOpen(true);
  };

  // 编辑分类
  const handleEditCategory = (category: ICategory) => {
    setEditingCategory(category);
    setIsEditCategoryModalOpen(true);
  };

  // 保存分类
  const handleSaveCategory = async (category: ICategory) => {
    try {
      let updatedCategories;

      if (editingCategory) {
        // 编辑现有分类
        updatedCategories = categories.map((cat) =>
          cat.id === category.id ? { ...category, nav: cat.nav || [] } : cat
        );
      } else {
        // 添加新分类
        const newCategory = {
          ...category,
          nav: category.nav || [], // 确保新分类有nav数组
        };
        updatedCategories = [...categories, newCategory];
      }

      // 保存到本地存储
      await saveCategories(updatedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(updatedCategories);
      }

      setIsEditCategoryModalOpen(false);
      setEditingCategory(undefined);
    } catch (error) {
      console.error('保存分类失败:', error);
      setMessage({ type: 'error', text: '保存失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 删除分类
  const handleDeleteCategory = (category: ICategory) => {
    setDeletingCategory(category);
    setIsDeleteCategoryModalOpen(true);
  };

  // 确认删除分类
  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      // 从分类列表中移除该分类
      const updatedCategories = categories.filter(
        (cat) => cat.id !== deletingCategory.id
      );

      // 保存到本地存储
      await saveCategories(updatedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(updatedCategories);
      }

      setIsDeleteCategoryModalOpen(false);
      setDeletingCategory(null);
    } catch (error) {
      console.error('删除分类失败:', error);
      setMessage({ type: 'error', text: '删除失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 保存分类排序
  const handleSaveCategorySort = async (sortedCategories: ICategory[]) => {
    try {
      // 保存到本地存储
      await saveCategories(sortedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(sortedCategories);
      }

      setIsCategorySortModalOpen(false);
      setMessage({ type: 'success', text: '分类排序已保存！' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('保存分类排序失败:', error);
      setMessage({ type: 'error', text: '保存排序失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 保存网站排序
  const handleSaveWebsiteSort = async (
    categoryId: number,
    sortedWebsites: IWebsite[]
  ) => {
    try {
      // 更新本地状态
      const updatedCategories = categories.map((category) => {
        if (category.id === categoryId) {
          return { ...category, nav: sortedWebsites };
        }
        return category;
      });

      // 保存到本地存储
      await saveCategories(updatedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(updatedCategories);
      }

      setIsWebsiteSortModalOpen(false);
      setSortingCategory(null);
      setMessage({ type: 'success', text: '网站排序已保存！' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('保存网站排序失败:', error);
      setMessage({ type: 'error', text: '保存排序失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 显示网站排序模态框
  const handleShowWebsiteSort = (category: ICategory) => {
    setSortingCategory(category);
    setIsWebsiteSortModalOpen(true);
  };

  // 确认移动网站
  const confirmMoveWebsite = async (targetCategoryId: number) => {
    if (!movingWebsite || !selectedCategory) return;

    try {
      // 更新本地状态
      let updatedCategories = [...categories];

      // 从原分类中删除
      updatedCategories = updatedCategories.map((category) => {
        if (category.id === selectedCategory.id) {
          const updatedNav = category.nav.filter(
            (w) => w.id !== movingWebsite.id
          );
          return { ...category, nav: updatedNav };
        }
        return category;
      });

      // 添加到目标分类
      updatedCategories = updatedCategories.map((category) => {
        if (category.id === targetCategoryId) {
          const updatedNav = [...category.nav, movingWebsite];
          return { ...category, nav: updatedNav };
        }
        return category;
      });

      // 保存到本地存储
      await saveCategories(updatedCategories);

      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);

      // 如果有GitHub Token，同步到GitHub
      if (githubToken) {
        await syncToGitHub(updatedCategories);
      }

      setIsMoveModalOpen(false);
      setMovingWebsite(undefined);
      setSelectedCategory(null);
    } catch (error) {
      console.error('移动网站失败:', error);
      setMessage({ type: 'error', text: '移动失败，请重试' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // 同步到GitHub
  const syncToGitHub = async (updatedCategories: ICategory[]) => {
    if (!githubToken) return;

    try {
      // 获取文件信息（需要SHA来更新文件）
      const owner = 'mmungdong'; // 替换为实际的仓库所有者
      const repo = 'nav-next'; // 替换为实际的仓库名
      const path = 'public/data/db.json';
      const branch = 'main';

      // 获取当前文件的SHA
      const fileInfo = await getFileContent(
        githubToken,
        owner,
        repo,
        path,
        branch
      );

      // 准备文件内容
      const content = JSON.stringify(updatedCategories, null, 2);

      // 更新或创建文件
      await updateFileContent(
        githubToken,
        owner,
        repo,
        path,
        content,
        `Update website data: ${new Date().toISOString()}`,
        branch,
        fileInfo.sha || undefined // 如果文件不存在，sha为undefined
      );
    } catch (error) {
      console.error('同步到GitHub失败:', error);
      // 将错误信息传递给调用者
      throw new Error((error as Error).message || '同步到GitHub失败');
    }
  };

  // 手动同步到远程
  const handleSyncToRemote = async () => {
    if (!githubToken || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncToGitHub(categories);
      // 更新最后同步时间状态为当前时间
      const currentTime = new Date().toISOString();
      setLastSyncTime(currentTime);
      setMessage({ type: 'success', text: '数据已成功同步到远程仓库！' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('同步失败:', error);
      let errorMessage = (error as Error).message || '未知错误';

      // 为私有仓库问题提供更明确的指导
      if (
        errorMessage.includes('无法访问私有仓库') ||
        errorMessage.includes('Resource not accessible')
      ) {
        errorMessage +=
          '。请确保：\n1. GitHub Token具有完整的repo权限\n2. 您对私有仓库有访问权限\n3. 如果属于组织，检查是否需要SSO授权';
      }

      setMessage({ type: 'error', text: `同步失败: ${errorMessage}` });
      setTimeout(() => setMessage(null), 10000); // 私有仓库问题显示更长时间
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // 获取最后同步时间
    const lastSync = getLastSyncTime();
    setLastSyncTime(lastSync);
  }, [fetchCategories, getLastSyncTime]);

  // 使用原始分类顺序，不进行额外排序
  const sortedCategories = categories;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 站内搜索逻辑 - 分类和网站分开显示
  const { filteredCategories, filteredWebsites } = searchQuery.trim()
    ? (() => {
        // 分别筛选匹配的分类和网站
        const matchedCategories: ICategory[] = [];
        const matchedWebsites: { category: ICategory; website: IWebsite }[] =
          [];

        sortedCategories.forEach((category) => {
          // 检查分类标题是否匹配（用于分类搜索）
          if (
            category.title.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            matchedCategories.push(category);
          }

          // 检查该分类下的网站是否匹配（用于网站搜索）
          category.nav.forEach((website) => {
            if (
              website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              website.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
              website.url.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
              matchedWebsites.push({ category, website });
            }
          });
        });

        return {
          filteredCategories: matchedCategories,
          filteredWebsites: matchedWebsites,
        };
      })()
    : { filteredCategories: sortedCategories, filteredWebsites: [] };

  return (
    <div>
      <MessageDisplay />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            网站管理
          </h1>
          {lastSyncTime && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              最后同步: {new Date(lastSyncTime).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {githubToken && (
            <button
              className={`bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSyncToRemote}
              disabled={isSyncing}
            >
              {isSyncing ? '同步中...' : '更新到远程'}
            </button>
          )}
          <button
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition-colors"
            onClick={() => setIsCategorySortModalOpen(true)}
          >
            分类排序
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            onClick={handleAddCategory}
          >
            添加分类
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索分类或网站..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* 搜索结果 */}
      {searchQuery.trim() ? (
        <div className="space-y-6">
          {/* 分类搜索结果 - 只有在没有选中分类时显示 */}
          {filteredCategories.length > 0 && !viewingCategory && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                匹配的分类
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      // 直接设置当前查看的分类
                      setViewingCategory(category);
                    }}
                  >
                    <span className="text-2xl mr-3">{category.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.nav.length} 个网站
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 显示选中的分类及其网站 - 只在选中分类时显示 */}
          {viewingCategory && (
            <div>
              <div className="flex items-center mb-4">
                <button
                  className="text-blue-500 hover:text-blue-700 mr-4 flex items-center"
                  onClick={() => setViewingCategory(null)}
                >
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  返回搜索
                </button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {viewingCategory.icon} {viewingCategory.title}
                </h2>
              </div>

              {viewingCategory.nav.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  该分类下没有网站
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {viewingCategory.nav.map((website) => (
                    <div
                      key={website.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 flex flex-col transition-all duration-200 hover:shadow-md min-h-[150px]"
                    >
                      <div className="flex items-start">
                        <>
                          {website.icon && !isIconUrlFailed(website.icon) ? (
                            <Image
                              src={website.icon}
                              alt={website.name}
                              width={40}
                              height={40}
                              className="rounded-lg object-cover mr-3 flex-shrink-0"
                            />
                          ) : null}
                          <div
                            className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 flex-shrink-0"
                            style={{
                              display:
                                website.icon && !isIconUrlFailed(website.icon)
                                  ? 'none'
                                  : 'flex',
                            }}
                          >
                            <DefaultIcon />
                          </div>
                        </>
                        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {website.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex-1 line-clamp-2">
                            {website.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end space-x-2">
                        <button
                          className="text-blue-500 hover:text-blue-700 text-sm"
                          onClick={() => handleEditWebsite(website)}
                        >
                          编辑
                        </button>
                        <button
                          className="text-green-500 hover:text-green-700 text-sm"
                          onClick={() =>
                            handleMoveWebsite(website, viewingCategory)
                          }
                        >
                          移动
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700 text-sm"
                          onClick={() =>
                            handleDeleteWebsite(website, viewingCategory)
                          }
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 网站搜索结果 - 只在没有选中分类时显示 */}
          {filteredWebsites.length > 0 && !viewingCategory && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                匹配的网站
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredWebsites.map(({ category, website }) => (
                  <div
                    key={website.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 flex flex-col transition-all duration-200 hover:shadow-md min-h-[150px]"
                  >
                    <div className="flex items-start">
                      <>
                        {website.icon && !isIconUrlFailed(website.icon) ? (
                          <Image
                            src={website.icon}
                            alt={website.name}
                            width={40}
                            height={40}
                            className="rounded-lg object-cover mr-3 flex-shrink-0"
                          />
                        ) : null}
                        <div
                          className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 flex-shrink-0"
                          style={{
                            display:
                              website.icon && !isIconUrlFailed(website.icon)
                                ? 'none'
                                : 'flex',
                          }}
                        >
                          <DefaultIcon />
                        </div>
                      </>
                      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {website.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex-1 line-clamp-2">
                          {website.desc}
                        </p>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {category.title}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        className="text-blue-500 hover:text-blue-700 text-sm"
                        onClick={() => handleEditWebsite(website)}
                      >
                        编辑
                      </button>
                      <button
                        className="text-green-500 hover:text-green-700 text-sm"
                        onClick={() => handleMoveWebsite(website, category)}
                      >
                        移动
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700 text-sm"
                        onClick={() => handleDeleteWebsite(website, category)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无结果 */}
          {filteredCategories.length === 0 && filteredWebsites.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.1-5.7-2.828-1.409 1.728-3.36 2.828-5.7 2.828a7.962 7.962 0 015.7-5.7c0-.34.034-.674.1-.992H3a1 1 0 00-1 1v9a1 1 0 001 1h18a1 1 0 001-1v-9a1 1 0 00-1-1h-3.1c.066.318.1.652.1.992a7.96 7.96 0 01-5.7 5.7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                未找到匹配的结果
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                没有找到与 &quot;{searchQuery}&quot; 相关的分类或网站
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 默认分类列表 */
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              id={`category-${category.id}`}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">{category.icon}</span>
                  {category.title}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    ({category.nav.length})
                  </span>
                </h2>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 hover:text-blue-700"
                    onClick={() => handleEditCategory(category)}
                  >
                    编辑
                  </button>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex space-x-2">
                    <button
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
                      onClick={() => handleShowWebsiteSort(category)}
                    >
                      网站排序
                    </button>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
                      onClick={() => handleAddWebsite(category)}
                    >
                      添加网站
                    </button>
                  </div>
                </div>

                {category.nav.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    该分类下没有网站
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {category.nav.map((website) => (
                      <div
                        key={website.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 flex flex-col transition-all duration-200 hover:shadow-md min-h-[140px]"
                      >
                        <div className="flex items-start">
                          <>
                            {website.icon && !isIconUrlFailed(website.icon) ? (
                              <Image
                                src={website.icon}
                                alt={website.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover mr-3 flex-shrink-0"
                              />
                            ) : null}
                            <div
                              className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 flex-shrink-0"
                              style={{
                                display:
                                  website.icon && !isIconUrlFailed(website.icon)
                                    ? 'none'
                                    : 'flex',
                              }}
                            >
                              <DefaultIcon />
                            </div>
                          </>
                          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {website.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex-1 line-clamp-2">
                              {website.desc}
                            </p>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="mt-3 flex justify-end space-x-2">
                          <button
                            className="text-blue-500 hover:text-blue-700 text-sm"
                            onClick={() => handleEditWebsite(website)}
                          >
                            编辑
                          </button>
                          <button
                            className="text-green-500 hover:text-green-700 text-sm"
                            onClick={() => handleMoveWebsite(website, category)}
                          >
                            移动
                          </button>
                          <button
                            className="text-red-500 hover:text-red-700 text-sm"
                            onClick={() =>
                              handleDeleteWebsite(website, category)
                            }
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 编辑网站模态框 */}
      <EditWebsiteModal
        website={editingWebsite}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWebsite(undefined);
        }}
        onSave={handleSaveWebsite}
      />

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingWebsite(null);
        }}
        onConfirm={confirmDeleteWebsite}
        itemName={deletingWebsite?.name || ''}
      />

      {/* 移动网站模态框 */}
      <MoveWebsiteModal
        categories={categories}
        website={movingWebsite}
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setMovingWebsite(undefined);
        }}
        onMove={confirmMoveWebsite}
      />

      {/* 编辑分类模态框 */}
      <EditCategoryModal
        category={editingCategory}
        isOpen={isEditCategoryModalOpen}
        onClose={() => {
          setIsEditCategoryModalOpen(false);
          setEditingCategory(undefined);
        }}
        onSave={handleSaveCategory}
      />

      {/* 删除分类确认模态框 */}
      <DeleteConfirmModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => {
          setIsDeleteCategoryModalOpen(false);
          setDeletingCategory(null);
        }}
        onConfirm={confirmDeleteCategory}
        itemName={deletingCategory?.title || ''}
      />

      {/* 分类排序模态框 */}
      <CategorySortModal
        key={`category-sort-${categories.length}`}
        categories={categories}
        isOpen={isCategorySortModalOpen}
        onClose={() => setIsCategorySortModalOpen(false)}
        onSave={handleSaveCategorySort}
      />

      {/* 网站排序模态框 */}
      <WebsiteSortModal
        key={sortingCategory?.id || 'empty'}
        category={sortingCategory || { id: 0, title: '', icon: '', nav: [] }}
        isOpen={isWebsiteSortModalOpen}
        onClose={() => {
          setIsWebsiteSortModalOpen(false);
          setSortingCategory(null);
        }}
        onSave={handleSaveWebsiteSort}
      />
    </div>
  );
}
