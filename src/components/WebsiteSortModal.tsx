'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ICategory, IWebsite } from '@/types';

interface WebsiteSortModalProps {
  category: ICategory;
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryId: number, sortedWebsites: IWebsite[]) => void;
}

export default function WebsiteSortModal({
  category,
  isOpen,
  onClose,
  onSave,
}: WebsiteSortModalProps) {
  const [sortedWebsites, setSortedWebsites] = useState<IWebsite[]>(() => [
    ...category.nav,
  ]);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'));

    if (dragIndex === dropIndex) return;

    const newWebsites = [...sortedWebsites];
    const [draggedItem] = newWebsites.splice(dragIndex, 1);
    newWebsites.splice(dropIndex, 0, draggedItem);

    setSortedWebsites(newWebsites);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(category.id, sortedWebsites);
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
            网站排序 - {category.title}
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
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              拖拽网站来调整显示顺序
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {sortedWebsites.map((website, index) => (
                <div
                  key={website.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="p-4 rounded-xl cursor-move bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 hover:bg-white/70 dark:hover:bg-gray-700/70 flex items-center transition-all duration-200"
                >
                  <div className="flex-shrink-0 mr-3 cursor-move">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    {website.icon ? (
                      <Image
                        src={website.icon}
                        alt={website.name}
                        width={24}
                        height={24}
                        className="object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML =
                            '<div className="text-xs">🌐</div>';
                        }}
                      />
                    ) : (
                      <div className="text-xs">🌐</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {website.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {website.desc}
                    </p>
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
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
