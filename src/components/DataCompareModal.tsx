import { ICategory, IWebsite } from '@/types';
import { DataDiffResult } from '@/stores/navStore';

interface DataCompareModalProps {
  diffResult: DataDiffResult | null;
  isOpen: boolean;
  onClose: () => void;
  onUseRemote?: () => void; // 使用远程配置的回调函数
  onSyncToRemote?: () => void; // 同步到远程的回调函数
}

const DataCompareModal = ({
  diffResult,
  isOpen,
  onClose,
  onUseRemote,
  onSyncToRemote,
}: DataCompareModalProps) => {
  if (!isOpen || !diffResult) return null;

  const {
    categoriesAdded,
    categoriesRemoved,
    categoriesModified,
    websitesAdded,
    websitesRemoved,
    websitesModified,
  } = diffResult;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            数据差异比较
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {/* 分类差异 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              分类差异
            </h3>

            {/* 新增分类 */}
            {categoriesAdded.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                  新增分类 ({categoriesAdded.length})
                </h4>
                <ul className="space-y-2">
                  {categoriesAdded.map((category) => (
                    <li
                      key={category.id}
                      className="bg-green-50 dark:bg-green-900/20 p-2 rounded"
                    >
                      <span className="font-medium">
                        {category.icon} {category.title}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        ({category.nav.length} 个网站)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 删除分类 */}
            {categoriesRemoved.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  删除分类 ({categoriesRemoved.length})
                </h4>
                <ul className="space-y-2">
                  {categoriesRemoved.map((category) => (
                    <li
                      key={category.id}
                      className="bg-red-50 dark:bg-red-900/20 p-2 rounded"
                    >
                      <span className="font-medium line-through">
                        {category.icon} {category.title}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        ({category.nav.length} 个网站)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 修改分类 */}
            {categoriesModified.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                  修改分类 ({categoriesModified.length})
                </h4>
                <ul className="space-y-2">
                  {categoriesModified.map((diff, index) => (
                    <li
                      key={index}
                      className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded"
                    >
                      <div>
                        <span className="font-medium">
                          {diff.category.icon} {diff.category.title}
                        </span>
                      </div>
                      {diff.changes.title && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          标题:
                          <span className="line-through text-red-600 dark:text-red-400">
                            {' '}
                            {`"${diff.changes.title.from}"`}{' '}
                          </span>
                          →
                          <span className="text-green-600 dark:text-green-400 ml-1">
                            {' '}
                            {`"${diff.changes.title.to}"`}
                          </span>
                        </div>
                      )}
                      {diff.changes.icon && (
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          图标:
                          <span className="line-through text-red-600 dark:text-red-400">
                            {' '}
                            {`"${diff.changes.icon.from}"`}{' '}
                          </span>
                          →
                          <span className="text-green-600 dark:text-green-400 ml-1">
                            {' '}
                            {`"${diff.changes.icon.to}"`}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 网站差异 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              网站差异
            </h3>

            {/* 新增网站 */}
            {websitesAdded.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                  新增网站 ({websitesAdded.length})
                </h4>
                <ul className="space-y-2">
                  {websitesAdded.map((websiteDiff, index) => (
                    <li
                      key={index}
                      className="bg-green-50 dark:bg-green-900/20 p-2 rounded"
                    >
                      <div className="font-medium">
                        [{websiteDiff.categoryTitle}] {websiteDiff.website.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {websiteDiff.website.desc}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 删除网站 */}
            {websitesRemoved.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  删除网站 ({websitesRemoved.length})
                </h4>
                <ul className="space-y-2">
                  {websitesRemoved.map((websiteDiff, index) => (
                    <li
                      key={index}
                      className="bg-red-50 dark:bg-red-900/20 p-2 rounded"
                    >
                      <div className="font-medium line-through">
                        [{websiteDiff.categoryTitle}] {websiteDiff.website.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {websiteDiff.website.desc}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 修改网站 */}
            {websitesModified.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                  修改网站 ({websitesModified.length})
                </h4>
                <ul className="space-y-2">
                  {websitesModified.map((change, index) => {
                    // 尝试从本地数据中找到网站名称作为备选
                    const localWebsite = categoriesAdded
                      .concat(categoriesModified.map((d) => d.category))
                      .find((cat) => cat.title === change.categoryTitle)
                      ?.nav.find((website) => website.id === change.websiteId);
                    const websiteName =
                      localWebsite?.name || `网站ID: ${change.websiteId}`;
                    return (
                      <li
                        key={index}
                        className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded"
                      >
                        <div className="font-medium">
                          [{change.categoryTitle}] {websiteName}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 space-y-1">
                          {change.changes.name && (
                            <div>
                              名称:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {`"${change.changes.name.from}"`}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {`"${change.changes.name.to}"`}
                              </span>
                            </div>
                          )}
                          {change.changes.desc && (
                            <div>
                              描述:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {`"${change.changes.desc.from}"`}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {`"${change.changes.desc.to}"`}
                              </span>
                            </div>
                          )}
                          {change.changes.url && (
                            <div>
                              链接:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {`"${change.changes.url.from}"`}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {`"${change.changes.url.to}"`}
                              </span>
                            </div>
                          )}
                          {change.changes.icon && (
                            <div>
                              图标:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {`"${change.changes.icon.from}"`}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {`"${change.changes.icon.to}"`}
                              </span>
                            </div>
                          )}
                          {change.changes.rate && (
                            <div>
                              评分:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {change.changes.rate.from}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {change.changes.rate.to}
                              </span>
                            </div>
                          )}
                          {change.changes.top && (
                            <div>
                              置顶:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {change.changes.top.from ? '是' : '否'}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {change.changes.top.to ? '是' : '否'}
                              </span>
                            </div>
                          )}
                          {change.changes.ownVisible && (
                            <div>
                              可见性:
                              <span className="line-through text-red-600 dark:text-red-400">
                                {' '}
                                {change.changes.ownVisible.from
                                  ? '公开'
                                  : '私有'}{' '}
                              </span>
                              →
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {' '}
                                {change.changes.ownVisible.to ? '公开' : '私有'}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          {onUseRemote && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    '此操作将删除本地配置，无法恢复，确定要继续吗？'
                  )
                ) {
                  onUseRemote();
                }
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
            >
              使用远程配置
            </button>
          )}
          {onSyncToRemote && (
            <button
              onClick={onSyncToRemote}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              同步到远程
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataCompareModal;
