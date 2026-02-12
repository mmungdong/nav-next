'use client';
import { IWebsite } from '@/types';
import OptimizedImage from '@/components/OptimizedImage';

interface WebsiteCardProps {
  website: IWebsite;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
}

export default function WebsiteCardAdmin({ website, categoryName, onEdit, onDelete, onMove }: WebsiteCardProps) {
  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-200 flex flex-col h-full">
      {/* 顶部标签 */}
      <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {website.top && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">置顶</span>}
        {website.ownVisible && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">私有</span>}
      </div>

      <div className="flex items-start mb-3">
        <div className="flex-shrink-0 mr-3">
          <OptimizedImage
            src={website.icon}
            alt={website.name}
            width={40}
            height={40}
            className="rounded-lg object-contain bg-gray-50 dark:bg-gray-700 p-0.5"
            fallbackClassName="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center text-lg font-bold"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate" title={website.name}>
            {website.name}
          </h3>
          {categoryName && (
            <p className="text-xs text-blue-500 mt-0.5 truncate">{categoryName}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-grow h-8">
        {website.desc || '暂无描述'}
      </p>

      {/* 底部链接与操作栏 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50 mt-auto">
        <a
          href={website.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-blue-500 truncate max-w-[50%] transition-colors hover:underline"
        >
          {new URL(website.url).hostname.replace('www.', '')}
        </a>

        {/* 悬浮操作按钮 */}
        <div className="flex space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(); }}
            className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md transition-colors"
            title="移动"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
