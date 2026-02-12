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

const INITIAL_FORM_DATA: IWebsite = {
  id: 0,
  name: '',
  desc: '',
  url: '',
  icon: '',
  rate: 5, // 默认评分
  top: false,
  ownVisible: false,
};

export default function EditWebsiteModal({
  website,
  isOpen,
  onClose,
  onSave,
}: EditWebsiteModalProps) {
  const [formData, setFormData] = useState<IWebsite>(INITIAL_FORM_DATA);
  const [isFetching, setIsFetching] = useState(false);

  // --- 关键修复：当弹窗打开或 website 属性变化时，重置表单 ---
  useEffect(() => {
    if (isOpen) {
      if (website) {
        // 编辑模式
        setFormData({ ...website });
      } else {
        // 添加模式：重置并生成新ID
        setFormData({ ...INITIAL_FORM_DATA, id: Date.now() });
      }
    }
  }, [isOpen, website]);

  // 智能获取网站信息
  const fetchWebInfo = useCallback(async (url: string) => {
    // 只有在字段为空时才自动填充，避免覆盖用户已输入的内容
    if (!url) return;

    try {
      setIsFetching(true);
      const webInfo = await getWebInfo(url);

      setFormData((prev) => ({
        ...prev,
        name: prev.name || webInfo.title || '',
        desc: prev.desc || webInfo.description || '',
        icon: prev.icon || webInfo.url || getFaviconUrl(url) || '',
      }));
    } catch (error) {
      console.warn('获取网站信息失败:', error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // 仅在添加模式下，且 URL 失去焦点或用户点击按钮时触发获取，而不是每次输入都触发
  const handleUrlBlur = () => {
    if (!website && formData.url) { // 仅新建时自动获取
        fetchWebInfo(formData.url);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    // 处理 Checkbox
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {website ? '编辑网站' : '添加新网站'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              网站链接 (URL)
            </label>
            <div className="relative">
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                onBlur={handleUrlBlur}
                placeholder="https://example.com"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => fetchWebInfo(formData.url)}
                disabled={isFetching || !formData.url}
                className="absolute right-2 top-1.5 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
              >
                {isFetching ? '获取中...' : '智能识别'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  网站名称
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  图标链接
                </label>
                <div className="flex gap-2">
                    <input
                      type="text"
                      name="icon"
                      value={formData.icon || ''}
                      onChange={handleChange}
                      placeholder="图标 URL"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {formData.icon && (
                        <img src={formData.icon} alt="preview" className="w-10 h-10 rounded bg-gray-100 object-contain p-1 border" onError={(e) => e.currentTarget.style.display = 'none'} />
                    )}
                </div>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              name="desc"
              value={formData.desc}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center space-x-6 pt-2">
             <label className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="checkbox"
                    name="top"
                    checked={formData.top || false}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">置顶推荐</span>
             </label>

             <label className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="checkbox"
                    name="ownVisible"
                    checked={formData.ownVisible || false}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">仅自己可见</span>
             </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-all"
            >
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
