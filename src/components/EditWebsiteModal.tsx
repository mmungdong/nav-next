'use client';

import { useState, useEffect, useCallback } from 'react';
import { IWebsite } from '@/types';
import { getWebInfo, getFaviconUrl } from '@/lib/webInfoApi';

interface EditWebsiteModalProps {
  website?: IWebsite;
  isOpen: boolean;
  onClose: () => void;
  onSave: (website: IWebsite) => void;
}

export default function EditWebsiteModal({
  website,
  isOpen,
  onClose,
  onSave,
}: EditWebsiteModalProps) {
  const [formData, setFormData] = useState<IWebsite>({
    id: Date.now(),
    name: '',
    desc: '',
    url: '',
    icon: '',
  });
  const [isFetching, setIsFetching] = useState(false);

  // 当website prop改变时更新formData
  useEffect(() => {
    if (website) {
      setFormData(website);
    } else {
      setFormData({
        id: Date.now(),
        name: '',
        desc: '',
        url: '',
        icon: '',
      });
    }
  }, [website]);

  // 获取网站信息的回调函数
  const fetchWebInfo = useCallback(
    async (url: string, currentFormData: IWebsite) => {
      // 检查是否已经有完整的网站信息
      const hasCompleteInfo =
        (currentFormData.name && currentFormData.name.trim() !== '') ||
        (currentFormData.desc && currentFormData.desc.trim() !== '') ||
        (currentFormData.icon && currentFormData.icon.trim() !== '');
      if (hasCompleteInfo) return;

      try {
        setIsFetching(true);

        // 获取网站信息
        const webInfo = await getWebInfo(url);

        // 更新表单数据，只填充空字段
        setFormData((prev) => ({
          ...prev,
          name:
            prev.name && prev.name.trim() !== ''
              ? prev.name
              : webInfo.title || '',
          desc:
            prev.desc && prev.desc.trim() !== ''
              ? prev.desc
              : webInfo.description || '',
          icon:
            prev.icon && prev.icon.trim() !== ''
              ? prev.icon
              : webInfo.url || getFaviconUrl(url) || '',
        }));
      } catch (error) {
        console.warn('获取网站信息失败:', error);
      } finally {
        setIsFetching(false);
      }
    },
    []
  );

  // 当URL改变时自动获取网站信息（仅在添加模式下）
  useEffect(() => {
    // 只有在添加新网站时才自动获取信息（website为空）
    if (website || !formData.url || !isOpen) return;

    // 防抖处理，避免频繁请求
    const timer = setTimeout(() => {
      fetchWebInfo(formData.url, formData);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.url, isOpen, fetchWebInfo, formData, website]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div
        className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      ></div>
      <div
        className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/30 dark:border-gray-700/50 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {website ? '编辑网站' : '添加网站'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
                required
              />
              {isFetching && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  正在获取网站信息...
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站名称
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网站描述
              </label>
              <textarea
                name="desc"
                value={formData.desc}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                图标URL
              </label>
              <input
                type="url"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm flex justify-end space-x-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-600/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-xl hover:bg-white/70 dark:hover:bg-gray-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isFetching}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${
                isFetching
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700/90'
              }`}
            >
              {isFetching ? '获取中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
