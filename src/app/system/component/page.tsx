'use client';

import { useState } from 'react';

interface ComponentConfig {
  [key: string]: string | number | boolean;
}

interface ComponentItem {
  id: number;
  name: string;
  type: string;
  isEnabled: boolean;
  config: ComponentConfig;
}

export default function ComponentManagementPage() {
  const [components, setComponents] = useState([
    {
      id: 1,
      name: '日历',
      type: 'calendar',
      isEnabled: true,
      config: { theme: 'light' },
    },
    {
      id: 2,
      name: '倒计时',
      type: 'countdown',
      isEnabled: true,
      config: { targetDate: '2024-12-31' },
    },
    {
      id: 3,
      name: '新闻',
      type: 'news',
      isEnabled: false,
      config: { source: 'top-headlines' },
    },
    {
      id: 4,
      name: '天气',
      type: 'weather',
      isEnabled: true,
      config: { location: '北京' },
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentItem | null>(null);

  // 过滤组件
  const filteredComponents = components.filter(
    (component) =>
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddComponent = () => {
    setEditingComponent(null);
    setShowModal(true);
  };

  const handleEditComponent = (component: ComponentItem) => {
    setEditingComponent(component);
    setShowModal(true);
  };

  const handleDeleteComponent = (id: number) => {
    if (confirm('确定要删除这个组件吗？')) {
      setComponents(components.filter((component) => component.id !== id));
    }
  };

  const handleToggleEnabled = (id: number) => {
    setComponents(
      components.map((component) =>
        component.id === id
          ? { ...component, isEnabled: !component.isEnabled }
          : component
      )
    );
  };

  const handleSaveComponent = (componentData: Partial<ComponentItem>) => {
    if (editingComponent) {
      // 编辑组件
      setComponents(
        components.map((component) =>
          component.id === editingComponent.id
            ? { ...component, ...componentData }
            : component
        )
      );
    } else {
      // 添加组件
      const newComponent = {
        ...componentData,
        id: Math.max(...components.map((c) => c.id), 0) + 1,
      };
      setComponents([...components, newComponent]);
    }
    setShowModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          组件管理
        </h1>
        <button
          onClick={handleAddComponent}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          添加组件
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索组件..."
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

      {/* 组件列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                组件名称
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
                状态
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                配置
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
            {filteredComponents.map((component) => (
              <tr key={component.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {component.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white capitalize">
                    {component.type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleEnabled(component.id)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      component.isEnabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {component.isEnabled ? '启用' : '禁用'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {Object.keys(component.config).map((key) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{key}:</span>{' '}
                        {String(component.config[key])}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditComponent(component)}
                    className="text-blue-500 hover:text-blue-700 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteComponent(component.id)}
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

      {/* 组件编辑模态框 */}
      {showModal && (
        <ComponentModal
          component={editingComponent}
          onSave={handleSaveComponent}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ComponentModal({
  component,
  onSave,
  onClose,
}: {
  component: ComponentItem | null;
  onSave: (component: Partial<ComponentItem>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(
    component || {
      name: '',
      type: 'calendar',
      isEnabled: true,
      config: {},
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleConfigChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [key]: value,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // 根据组件类型渲染不同的配置选项
  const renderConfigFields = () => {
    switch (formData.type) {
      case 'calendar':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              主题
            </label>
            <select
              value={formData.config.theme || 'light'}
              onChange={(e) => handleConfigChange('theme', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        );
      case 'countdown':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目标日期
            </label>
            <input
              type="date"
              value={formData.config.targetDate || ''}
              onChange={(e) => handleConfigChange('targetDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        );
      case 'news':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新闻源
            </label>
            <select
              value={formData.config.source || 'top-headlines'}
              onChange={(e) => handleConfigChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="top-headlines">头条新闻</option>
              <option value="technology">科技新闻</option>
              <option value="sports">体育新闻</option>
            </select>
          </div>
        );
      case 'weather':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              位置
            </label>
            <input
              type="text"
              value={formData.config.location || ''}
              onChange={(e) => handleConfigChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="例如: 北京"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {component ? '编辑组件' : '添加组件'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              组件名称
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
              组件类型
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="calendar">日历</option>
              <option value="countdown">倒计时</option>
              <option value="news">新闻</option>
              <option value="weather">天气</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isEnabled"
                checked={formData.isEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                启用组件
              </span>
            </label>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              配置
            </h3>
            {renderConfigFields()}
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
