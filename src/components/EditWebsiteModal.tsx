'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  rate: 5,
  top: false,
};

export default function EditWebsiteModal({
  website,
  isOpen,
  onClose,
  onSave,
}: EditWebsiteModalProps) {
  const [formData, setFormData] = useState<IWebsite>(INITIAL_FORM_DATA);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  // Identifies the only recognition request allowed to touch the form; closing
  // the modal or opening another site invalidates every earlier response.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      requestIdRef.current += 1;
      setIsFetching(false);
      return;
    }
    requestIdRef.current += 1;
    const next = website
      ? { ...website }
      : { ...INITIAL_FORM_DATA, id: Date.now() };
    setFormData(next);
    setInitialSnapshot(JSON.stringify(next));
    setFetchError(null);
  }, [isOpen, website]);

  // Metadata lookup sends the full URL to a third party; it only runs on an
  // explicit click. Blur no longer triggers a request.
  const fetchWebInfo = useCallback(async (url: string) => {
    if (!url) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsFetching(true);
    setFetchError(null);
    try {
      const webInfo = await getWebInfo(url);
      if (requestIdRef.current !== requestId) return;
      setFormData((prev) => ({
        ...prev,
        name: prev.name || webInfo.title || '',
        desc: prev.desc || webInfo.description || '',
        icon: prev.icon || webInfo.url || getFaviconUrl(url) || '',
      }));
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      console.warn('获取网站信息失败:', error);
      setFetchError('自动识别失败，请手动填写名称和图标。');
    } finally {
      if (requestIdRef.current === requestId) setIsFetching(false);
    }
  }, []);

  const isDirty = JSON.stringify(formData) !== initialSnapshot;

  const requestClose = () => {
    if (isDirty && !window.confirm('表单还有未保存的内容，确认放弃？')) return;
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={requestClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto transform transition-all border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {website ? '编辑网站' : '添加新网站'}
          </h3>
          <button
            onClick={requestClose}
            className="min-w-[44px] min-h-[44px] text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
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
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              点击“智能识别”会把完整 URL 发送给第三方接口；失败时可手动填写。
            </p>
            {fetchError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fetchError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-all"
            >
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
