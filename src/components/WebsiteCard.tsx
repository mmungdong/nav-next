import { motion } from 'framer-motion';
import OptimizedImage from '@/components/OptimizedImage';
import { animationConfig } from '@/lib/animations';
import { IWebsite } from '@/types';

interface WebsiteCardProps {
  website: IWebsite;
  index: number;
}

export const WebsiteCard = ({ website, index }: WebsiteCardProps) => {
  return (
    <motion.a
      href={website.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
      transition={{
        duration: animationConfig.card.enter.duration / 1000,
        ease: animationConfig.easings.easeInOut,
        delay: (index % 10) * 0.05,
      }}
    >
      <div className="
        group relative h-full flex flex-col
        bg-white dark:bg-gray-800
        rounded-2xl p-5
        border border-gray-100 dark:border-gray-700/50
        shadow-sm hover:shadow-xl hover:shadow-blue-500/5
        transition-all duration-300 ease-out
        hover:-translate-y-1
      ">
        {/* Hover 边框渐变效果 */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-500/10 dark:group-hover:border-blue-400/20 transition-colors pointer-events-none" />

        <div className="flex items-start gap-4">
          {/* 图标容器 */}
          <div className="relative w-12 h-12 flex-shrink-0 rounded-xl bg-gray-50 dark:bg-gray-700/50 p-1 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
            <OptimizedImage
              src={website.icon}
              alt={website.name}
              width={40}
              height={40}
              className="w-8 h-8 rounded-lg object-contain"
              fallbackClassName="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-500"
            />
          </div>

          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              {website.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed h-8">
              {website.desc}
            </p>
          </div>

          {/* Hover 箭头 */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>
    </motion.a>
  );
};
