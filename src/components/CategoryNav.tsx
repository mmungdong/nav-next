import { motion } from 'framer-motion';
import { ICategory } from '@/types';

interface CategoryNavProps {
  categories: ICategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

// 1. 定义一个简单的 SVG 文件夹图标组件
// 使用 stroke="currentColor" 让图标颜色自动跟随文字颜色
const FolderIcon = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"} // 选中时填充，未选中时描边
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

export const CategoryNav = ({ categories, activeId, onSelect }: CategoryNavProps) => {
  return (
    <nav className="space-y-1">
      {categories.map((category) => {
        const isActive = activeId === category.id.toString();
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id.toString())}
            className={`
              group flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
              ${isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
          >
            {/* 2. 图标区域优化 */}
            <span className={`mr-3 flex items-center justify-center transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              {/* 逻辑：如果有自定义 emoji icon 就显示 emoji，否则显示 SVG 图标 */}
              {category.icon ? (
                <span className="text-lg leading-none">{category.icon}</span>
              ) : (
                <FolderIcon
                  className="w-5 h-5" // 设定固定宽高，保证一致性
                  filled={isActive}   // 选中时变成实心，增加交互反馈
                />
              )}
            </span>

            <span className="truncate flex-1 text-left">{category.title}</span>

            <span className={`
              ml-2 py-0.5 px-2 rounded-md text-xs font-mono
              ${isActive
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'}
            `}>
              {category.nav.length}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
