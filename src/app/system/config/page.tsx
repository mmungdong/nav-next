'use client';

import { useState } from 'react';

interface ConfigItem {
  id: number;
  key: string;
  name: string;
  value: string;
  type: 'string' | 'text' | 'boolean' | 'number' | 'select';
  options?: string[];
  description: string;
}

export default function ConfigManagementPage() {
  const [configs, setConfigs] = useState([
    {
      id: 1,
      key: 'site_title',
      name: '网站标题',
      value: '发现导航',
      type: 'string',
      description: '网站的标题显示',
    },
    {
      id: 2,
      key: 'site_description',
      name: '网站描述',
      value: '一个简洁实用的导航网站',
      type: 'text',
      description: '网站的描述信息',
    },
    {
      id: 3,
      key: 'enable_registration',
      name: '启用注册',
      value: 'false',
      type: 'boolean',
      description: '是否允许用户注册',
    },
    {
      id: 4,
      key: 'max_websites_per_user',
      name: '用户最大网站数',
      value: '100',
      type: 'number',
      description: '每个用户最多可添加的网站数量',
    },
    {
      id: 5,
      key: 'default_theme',
      name: '默认主题',
      value: 'light',
      type: 'select',
      options: ['light', 'dark'],
      description: '网站默认主题',
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);

  // 过滤配置项
  const filteredConfigs = configs.filter(
    (config) =>
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddConfig = () => {
    setEditingConfig(null);
    setShowModal(true);
  };

  const handleEditConfig = (config: ConfigItem) => {
    setEditingConfig(config);
    setShowModal(true);
  };

  const handleDeleteConfig = (id: number) => {
    if (confirm('确定要删除这个配置项吗？')) {
      setConfigs(configs.filter((config) => config.id !== id));
    }
  };

  const handleSaveConfig = (configData: Partial<ConfigItem>) => {
    if (editingConfig) {
      // 编辑配置
      setConfigs(
        configs.map((config) =>
          config.id === editingConfig.id ? { ...config, ...configData } : config
        )
      );
    } else {
      // 添加配置
      const newConfig = {
        ...configData,
        id: Math.max(...configs.map((c) => c.id), 0) + 1,
      };
      setConfigs([...configs, newConfig]);
    }
    setShowModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          配置管理
        </h1>
        <button
          onClick={handleAddConfig}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          添加配置项
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索配置项..."
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

      {/* 配置项列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                配置键
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                配置名称
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                值
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                类型
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                描述
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
                    {config.key}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {config.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {config.type === 'boolean' ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          config.value === 'true'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {config.value === 'true' ? '开启' : '关闭'}
                      </span>
                    ) : (
                      config.value
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {config.type}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {config.description}
                  </div>
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

      {/* 配置项编辑模态框 */}
      {showModal && (
        <ConfigModal
          config={editingConfig}
          onSave={handleSaveConfig}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ConfigModal({
  config,
  onSave,
  onClose,
}: {
  config: ConfigItem | null;
  onSave: (config: Partial<ConfigItem>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(
    config || {
      key: '',
      name: '',
      value: '',
      type: 'string',
      description: '',
      options: [],
    }
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
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
          {config ? '编辑配置项' : '添加配置项'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="key"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              配置键
            </label>
            <input
              type="text"
              id="key"
              name="key"
              value={formData.key}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              配置名称
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
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              类型
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="string">字符串</option>
              <option value="text">文本</option>
              <option value="number">数字</option>
              <option value="boolean">布尔值</option>
              <option value="select">选择框</option>
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="value"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              值
            </label>
            {formData.type === 'boolean' ? (
              <select
                id="value"
                name="value"
                value={formData.value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            ) : formData.type === 'select' ? (
              <input
                type="text"
                id="value"
                name="value"
                value={formData.value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="请输入默认值"
              />
            ) : (
              <input
                type={formData.type === 'number' ? 'number' : 'text'}
                id="value"
                name="value"
                value={formData.value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            )}
          </div>

          {formData.type === 'select' && (
            <div className="mb-4">
              <label
                htmlFor="options"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                选项 (用逗号分隔)
              </label>
              <input
                type="text"
                id="options"
                name="options"
                value={formData.options?.join(', ') || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    options: e.target.value.split(',').map((opt) => opt.trim()),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="选项1, 选项2, 选项3"
              />
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              描述
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
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
