'use client';

import { useEffect, useRef, useState } from 'react';
import OptimizedImage from '@/components/OptimizedImage';
import { ICategory } from '@/types';

interface WebsiteSortModalProps {
  category: ICategory;
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryId: number, orderedIds: number[]) => void;
}

export default function WebsiteSortModal({
  category,
  isOpen,
  onClose,
  onSave,
}: WebsiteSortModalProps) {
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const [stale, setStale] = useState(false);
  const snapshotRef = useRef('');

  const reload = () => {
    const ids = category.nav.map((website) => website.id);
    setOrderedIds(ids);
    snapshotRef.current = ids.join(',');
    setStale(false);
  };

  // Each open starts from the current list; only the ID order is submitted, so
  // fields edited elsewhere are never reverted to this dialog's snapshot.
  useEffect(() => {
    if (!isOpen) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !snapshotRef.current) return;
    if (category.nav.map((website) => website.id).join(',') !== snapshotRef.current) {
      setStale(true);
    }
  }, [category, isOpen]);

  const websiteMap = new Map(category.nav.map((website) => [website.id, website]));
  const orderedWebsites = orderedIds
    .map((id) => websiteMap.get(id))
    .filter((website): website is NonNullable<typeof website> => Boolean(website));

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;

    setOrderedIds((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, dragged);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stale) return;
    onSave(category.id, orderedIds);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div
        className="fixed inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`网站排序 - ${category.title}`}
        className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90dvh] overflow-y-auto border border-white/30 dark:border-gray-700/50 pointer-events-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            网站排序 - {category.title}
          </h3>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">拖拽网站来调整显示顺序</p>

            {stale && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-200">
                <span>分类内网站已在别处新增或删除，请重新载入后再保存。</span>
                <button type="button" onClick={reload} className="underline font-medium">
                  重新载入
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {orderedWebsites.map((website, index) => (
                <div
                  key={website.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="p-4 rounded-xl cursor-move bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 hover:bg-white/70 dark:hover:bg-gray-700/70 flex items-center transition-all duration-200"
                >
                  <div className="flex items-center w-full">
                    <div className="flex-shrink-0 mr-3 cursor-move">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                      {website.icon ? (
                        <OptimizedImage
                          src={website.icon}
                          alt={website.name}
                          width={24}
                          height={24}
                          className="object-contain"
                          fallbackClassName="text-xs"
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
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm flex justify-end space-x-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-600/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-xl hover:bg-white/70 dark:hover:bg-gray-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={stale}
              className="px-5 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700/90 disabled:opacity-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
