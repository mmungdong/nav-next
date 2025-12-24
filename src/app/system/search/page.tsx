'use client';

import { useState } from 'react';

interface SearchConfig {
  id: number;
  name: string;
  url: string;
  icon: string;
  sort: number;
  isActive: boolean;
}

export default function SearchManagementPage() {
  const [searchConfigs, setSearchConfigs] = useState<SearchConfig[]>([
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
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SearchConfig | null>(null);

  // 过滤搜索配置
  const filteredConfigs = searchConfigs.filter(
    (config) =>
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddConfig = () => {
    setEditingConfig(null);
    setShowModal(true);
  };

  const handleEditConfig = (config: SearchConfig) => {
    setEditingConfig(config);
    setShowModal(true);
  };

  const handleDeleteConfig = (id: number) => {
    if (confirm('确定要删除这个搜索配置吗？')) {
      setSearchConfigs(searchConfigs.filter((config) => config.id !== id));
    }
  };

  const handleToggleActive = (id: number) => {
    setSearchConfigs(
      searchConfigs.map((config) =>
        config.id === id ? { ...config, isActive: !config.isActive } : config
      )
    );
  };

  const handleSaveConfig = (configData: Partial<SearchConfig>) => {
    if (editingConfig) {
      // 编辑配置
      setSearchConfigs(
        searchConfigs.map((config) =>
          config.id === editingConfig.id ? { ...config, ...configData } : config
        )
      );
    } else {
      // 添加配置
      const newConfig: SearchConfig = {
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
    }
    setShowModal(false);
  };

  return (
    <div className="">
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
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
              <tr key={config.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {config.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {config.icon}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                    {config.url}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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

      {/* 搜索配置编辑模态框 */}
      {showModal && (
        <SearchConfigModal
          config={editingConfig}
          onSave={handleSaveConfig}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function SearchConfigModal({
  config,
  onSave,
  onClose,
}: {
  config: SearchConfig | null;
  onSave: (config: Partial<SearchConfig>) => void;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              示例: https://www.google.com/search?q={'{query}'}
            </p>
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
