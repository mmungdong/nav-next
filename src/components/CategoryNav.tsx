import { motion } from 'framer-motion';
import { ICategory } from '@/types';

interface CategoryNavProps {
  categories: ICategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

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
            <span className={`mr-3 text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              {category.icon || '📁'}
            </span>
            <span className="truncate flex-1 text-left">{category.title}</span>
            <span className={`
              ml-2 py-0.5 px-2 rounded-md text-xs
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
