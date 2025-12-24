'use client';

import { useState } from 'react';
import { ICategory, IWebsite } from '@/types';

interface MoveWebsiteModalProps {
  categories: ICategory[];
  website?: IWebsite;
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetCategoryId: number) => void;
}

export default function MoveWebsiteModal({
  categories,
  website,
  isOpen,
  onClose,
  onMove,
}: MoveWebsiteModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // 当模态框关闭时重置选择
  if (!isOpen && selectedCategory !== null) {
    setSelectedCategory(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory !== null) {
      onMove(selectedCategory);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div
        className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      ></div>
      <div
        className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/30 dark:border-gray-700/50 pointer-events-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            移动网站
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
          <div className="px-6 py-4">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              选择要将 &quot;{website?.name}&quot; 移动到的目标分类：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-white/70 dark:bg-blue-900/50 border-2 border-blue-500 dark:border-blue-600 backdrop-blur-sm'
                      : 'bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 hover:bg-white/70 dark:hover:bg-gray-700/70'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="flex items-center w-full">
                    <div className="flex-shrink-0 mr-3">
                      <span className="text-2xl">{category.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-lg truncate">
                        {category.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {category.nav.length} 个网站
                      </p>
                    </div>
                    {selectedCategory === category.id && (
                      <div className="flex-shrink-0 ml-2">
                        <svg
                          className="h-5 w-5 text-blue-500 dark:text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
              disabled={selectedCategory === null}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition ${
                selectedCategory === null
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                  : 'bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700/90 text-white focus:ring-blue-500'
              }`}
            >
              移动
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
