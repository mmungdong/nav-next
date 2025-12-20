'use client';

import { useState, useEffect } from 'react';
import { ICategory, IWebsite } from '@/types';
import { useNavStore } from '@/stores/navStore';
import Image from 'next/image';

interface SiteSearchResultsProps {
  query: string;
  onClose: () => void;
}

const SiteSearchResults: React.FC<SiteSearchResultsProps> = ({
  query,
  onClose,
}) => {
  const { categories } = useNavStore();
  const [filteredResults, setFilteredResults] = useState<
    { category: ICategory; websites: IWebsite[] }[]
  >([]);
  const [noResults, setNoResults] = useState(false);

  // 搜索逻辑
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!query.trim()) {
      setFilteredResults([]);
      setNoResults(false);
      return;
    }

    const results: { category: ICategory; websites: IWebsite[] }[] = [];

    // 遍历所有分类和网站进行搜索
    categories.forEach((category) => {
      // 首先检查分类标题是否匹配
      if (category.title.toLowerCase().includes(query.toLowerCase())) {
        // 如果分类标题匹配，则包含该分类下的所有网站
        results.push({
          category: category,
          websites: [...category.nav], // 包含该分类下的所有网站
        });
      } else {
        // 如果分类标题不匹配，则检查该分类下的网站
        const matchingWebsites = category.nav.filter(
          (website) =>
            website.name.toLowerCase().includes(query.toLowerCase()) ||
            website.desc.toLowerCase().includes(query.toLowerCase()) ||
            website.url.toLowerCase().includes(query.toLowerCase()) ||
            (website.tags &&
              website.tags.some(
                (tag) =>
                  tag.name &&
                  tag.name.toLowerCase().includes(query.toLowerCase())
              ))
        );

        if (matchingWebsites.length > 0) {
          results.push({
            category: category,
            websites: matchingWebsites,
          });
        }
      }
    });

    setFilteredResults(results);
    setNoResults(results.length === 0);
  }, [query, categories]);

  // 处理网站点击
  const handleWebsiteClick = (url: string) => {
    window.open(url, '_blank');
    onClose();
  };

  // 阻止滚动事件冒泡到模态框
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  if (!query.trim()) {
    return null;
  }

  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/50 overflow-hidden z-50"
      onWheel={handleWheel}
    >
      <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
        {noResults ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.1-5.7-2.828-1.409 1.728-3.36 2.828-5.7 2.828a7.962 7.962 0 015.7-5.7c0-.34.034-.674.1-.992H3a1 1 0 00-1 1v9a1 1 0 001 1h18a1 1 0 001-1v-9a1 1 0 00-1-1h-3.1c.066.318.1.652.1.992a7.96 7.96 0 01-5.7 5.7z"
                />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              未找到与 &quot;{query}&quot; 相关的结果
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              试试其他关键词
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl z-10">
              <h3 className="font-medium text-gray-900 dark:text-white">
                站内搜索结果 (
                {filteredResults.reduce(
                  (acc, curr) => acc + curr.websites.length,
                  0
                )}
                )
              </h3>
            </div>

            <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {filteredResults.map(({ category, websites }) => (
                <div key={category.id} className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    {category.title}
                  </h4>
                  <div className="space-y-2">
                    {websites.slice(0, 5).map((website) => (
                      <div
                        key={website.id}
                        onClick={() => handleWebsiteClick(website.url)}
                        className="p-3 rounded-xl bg-white/50 dark:bg-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/80 backdrop-blur-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer transition-all group"
                      >
                        <div className="flex items-start">
                          {website.icon ? (
                            <Image
                              src={website.icon}
                              alt={website.name}
                              width={40}
                              height={40}
                              className="rounded-lg mr-3 flex-shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                {website.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {website.name}
                            </h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                              {website.desc}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {website.tags &&
                                website.tags.slice(0, 3).map(
                                  (tag) =>
                                    tag.name && (
                                      <span
                                        key={tag.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: `${tag.color}20`,
                                          color: tag.color,
                                        }}
                                      >
                                        {tag.name}
                                      </span>
                                    )
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SiteSearchResults;
