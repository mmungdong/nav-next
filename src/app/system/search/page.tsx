'use client';

import { useState, useMemo, useEffect } from 'react';
import { ISearchConfig } from '@/types';
import MessageDisplay from '@/components/MessageDisplay';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { debounce } from '@/hooks/useDebounce';

export default function SearchManagementPage() {
  const [searchConfigs, setSearchConfigs] = useState<ISearchConfig[]>([
    {
      id: 1,
      name: '百度',
      url: 'https://www.baidu.com/s?wd=',
      icon: '🔍',
      sort: 1,
      isActive: true,
    },
    {
      id: 2,
      name: '谷歌',
      url: 'https://www.google.com/search?q=',
      icon: '🔍',
      sort: 2,
      isActive: true,
    },
    {
      id: 3,
      name: '必应',
      url: 'https://www.bing.com/search?q=',
      icon: '🔍',
      sort: 3,
      isActive: false,
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ISearchConfig | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'loading'; text: string } | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);

  // 使用防抖搜索
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // 过滤搜索配置
  const filteredConfigs = useMemo(() => {
    return searchConfigs.filter(
      (config) =>
        config.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        config.url.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [searchConfigs, debouncedSearchQuery]);

  const handleAddConfig = () => {
    setEditingConfig(null);
    setShowModal(true);
  };

  const handleEditConfig = (config: ISearchConfig) => {
    setEditingConfig(config);
    setShowModal(true);
  };

  const handleDeleteConfig = (id: number) => {
    setConfigToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (configToDelete !== null) {
      try {
        setSearchConfigs(searchConfigs.filter((config) => config.id !== configToDelete));
        setShowDeleteConfirm(false);
        setConfigToDelete(null);
        setMessage({ type: 'success', text: '删除成功' });
        // 自动清除消息提示
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error('删除搜索配置失败:', error);
        setMessage({ type: 'error', text: '删除失败，请重试' });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const handleToggleActive = (id: number) => {
    try {
      setSearchConfigs(
        searchConfigs.map((config) =>
          config.id === id ? { ...config, isActive: !config.isActive } : config
        )
      );
      setMessage({ type: 'success', text: '状态已更新' });
      // 自动清除消息提示
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('更新搜索配置状态失败:', error);
      setMessage({ type: 'error', text: '更新状态失败，请重试' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveConfig = (configData: Partial<ISearchConfig>) => {
    try {
      if (!configData.name || !configData.name.trim()) {
        setMessage({ type: 'error', text: '配置名称不能为空' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      if (!configData.url || !configData.url.trim()) {
        setMessage({ type: 'error', text: '配置URL不能为空' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      if (editingConfig) {
        // 编辑配置
        setSearchConfigs(
          searchConfigs.map((config) =>
            config.id === editingConfig.id ? { ...config, ...configData } : config
          )
        );
        setMessage({ type: 'success', text: '配置已更新' });
      } else {
        // 添加配置
        const newConfig: ISearchConfig = {
          id: Math.max(...searchConfigs.map((c) => c.id), 0) + 1,
          name: configData.name || '',
          url: configData.url || '',
          icon: configData.icon || '🔍',
          sort:
            configData.sort !== undefined
              ? configData.sort
              : searchConfigs.length + 1,
          isActive:
            configData.isActive !== undefined ? configData.isActive : true,
        };
        setSearchConfigs([...searchConfigs, newConfig]);
        setMessage({ type: 'success', text: '配置已添加' });
      }
      setShowModal(false);
      // 自动清除消息提示
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('保存搜索配置失败:', error);
      setMessage({ type: 'error', text: '保存配置失败，请重试' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="">
      {message && <MessageDisplay message={message} isMessageVisible={isMessageVisible} />}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          搜索管理
        </h1>
        <button
          onClick={handleAddConfig}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          添加搜索配置
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索配置..."
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

      {/* 搜索配置列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {filteredConfigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">暂无搜索配置，点击添加按钮创建</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    名称
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell"
                  >
                    图标
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    URL
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell"
                  >
                    排序
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    状态
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {config.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {config.icon}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs md:max-w-md">
                        {config.url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">
                      {config.sort}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(config.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          config.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {config.isActive ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditConfig(config)}
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 搜索配置编辑模态框 */}
      {showModal && (
        <SearchConfigModal
          config={editingConfig}
          onSave={handleSaveConfig}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        itemName={searchConfigs.find(c => c.id === configToDelete)?.name || '配置'}
      />
    </div>
  );
}

function SearchConfigModal({
  config,
  onSave,
  onClose,
}: {
  config: ISearchConfig | null;
  onSave: (config: Partial<ISearchConfig>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(
    config || {
      name: '',
      url: '',
      icon: '🔍',
      sort: 0,
      isActive: true,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 验证名称不为空
    if (!formData.name.trim()) {
      newErrors.name = '名称不能为空';
    }

    // 验证URL格式，检查是否包含搜索参数
    if (!formData.url.trim()) {
      newErrors.url = 'URL不能为空';
    } else if (!formData.url.includes('{query}') && !formData.url.includes('?q=') && !formData.url.includes('?wd=')) {
      newErrors.url = 'URL必须包含搜索参数（如 ?q=, ?wd= 或 {query}）';
    } else if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      newErrors.url = 'URL必须以 http:// 或 https:// 开头';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // 清除相关错误信息
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {config ? '编辑搜索配置' : '添加搜索配置'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              名称
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label
              htmlFor="icon"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              图标
            </label>
            <input
              type="text"
              id="icon"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              URL (搜索链接，使用 {'{query}'} 作为占位符)
            </label>
            <input
              type="text"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.url ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              示例: https://www.google.com/search?q={'{query}'}
            </p>
            {errors.url && <p className="mt-1 text-sm text-red-500">{errors.url}</p>}
          </div>

          <div className="mb-4">
            <label
              htmlFor="sort"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              排序
            </label>
            <input
              type="number"
              id="sort"
              name="sort"
              value={formData.sort}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                启用
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
