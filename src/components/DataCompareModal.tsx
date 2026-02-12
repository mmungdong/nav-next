'use client';
import { useState } from 'react';
import { DataDiffResult } from '@/stores/navStore';

// 定义 Message 类型，保持与父组件一致
type MessageType = { 
  type: 'success' | 'error' | 'loading'; 
  text: string 
} | null;

interface DataCompareModalProps {
  diffResult: DataDiffResult | null;
  isOpen: boolean;
  onClose: () => void;
  onUseRemote?: () => void;
  onSyncToRemote?: () => void;
  // 修改 1: 优化类型定义
  setMessage?: (message: MessageType) => void;
}

// ... StatBadge 和 DiffFieldRow 组件保持不变 ...
// 为了节省篇幅，这里省略辅助组件代码，你可以直接用之前的
// ...

// 辅助组件：字段 Diff 行
const DiffFieldRow = ({ label, from, to }: { label: string; from: any; to: any }) => {
  const formatValue = (val: any) => {
    if (typeof val === 'boolean') return val ? '是' : '否';
    if (val === '' || val === null || val === undefined) return <span className="text-gray-400 italic">空</span>;
    return String(val);
  };
  return (
    <div className="grid grid-cols-12 gap-2 text-sm py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="col-span-2 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide self-center">
        {label}
      </div>
      <div className="col-span-5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-2 py-1 rounded line-through decoration-red-300 break-all">
        {formatValue(from)}
      </div>
      <div className="col-span-5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 px-2 py-1 rounded break-all">
        {formatValue(to)}
      </div>
    </div>
  );
};

export default function DataCompareModal({
  diffResult,
  isOpen,
  onClose,
  onUseRemote,
  onSyncToRemote,
  setMessage,
}: DataCompareModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'websites'>('overview');
  
  if (!isOpen || !diffResult) return null;
  
  const {
    categoriesAdded,
    categoriesRemoved,
    categoriesModified,
    websitesAdded,
    websitesRemoved,
    websitesModified,
  } = diffResult;

  // 计算统计数据
  const stats = {
    catAdd: categoriesAdded.length,
    catDel: categoriesRemoved.length,
    catMod: categoriesModified.length,
    webAdd: websitesAdded.length,
    webDel: websitesRemoved.length,
    webMod: websitesModified.length,
    totalCat: categoriesAdded.length + categoriesRemoved.length + categoriesModified.length,
    totalWeb: websitesAdded.length + websitesRemoved.length + websitesModified.length,
  };

  // 渲染概览卡片
  const renderOverviewCard = (title: string, add: number, del: number, mod: number, onClick: () => void) => (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors">{title}</h3>
        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
          共 {add + del + mod} 处变更
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">新增</span>
          <span className="font-mono font-medium text-green-600">+{add}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">删除</span>
          <span className="font-mono font-medium text-red-600">-{del}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">修改</span>
          <span className="font-mono font-medium text-blue-600">~{mod}</span>
        </div>
      </div>
    </div>
  );

  // 渲染分类列表
  const renderCategoriesTab = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* 新增 */}
      {categoriesAdded.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-green-600 dark:text-green-400 mb-3 flex items-center uppercase tracking-wider">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            新增分类 ({categoriesAdded.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoriesAdded.map(cat => (
              <div key={cat.id} className="flex items-center p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg">
                <span className="text-2xl mr-3">{cat.icon}</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{cat.title}</div>
                  <div className="text-xs text-gray-500">{cat.nav.length} 个网站</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* 修改 */}
      {categoriesModified.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center uppercase tracking-wider">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            修改分类 ({categoriesModified.length})
          </h4>
          <div className="space-y-3">
            {categoriesModified.map((diff, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/30 rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center">
                  <span className="text-xl mr-2">{diff.category.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{diff.category.title}</span>
                </div>
                <div className="p-4 space-y-1">
                  {diff.changes.title && <DiffFieldRow label="名称" from={diff.changes.title.from} to={diff.changes.title.to} />}
                  {diff.changes.icon && <DiffFieldRow label="图标" from={diff.changes.icon.from} to={diff.changes.icon.to} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* 删除 */}
      {categoriesRemoved.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center uppercase tracking-wider">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            删除分类 ({categoriesRemoved.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoriesRemoved.map(cat => (
              <div key={cat.id} className="flex items-center p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg opacity-75">
                <span className="text-2xl mr-3 grayscale">{cat.icon}</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 line-through">{cat.title}</div>
                  <div className="text-xs text-gray-500">{cat.nav.length} 个网站</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {stats.totalCat === 0 && <EmptyState text="没有分类变更" />}
    </div>
  );

  // 渲染网站列表
  const renderWebsitesTab = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* 新增 */}
      {websitesAdded.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-green-600 dark:text-green-400 mb-3 flex items-center uppercase tracking-wider">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            新增网站 ({websitesAdded.length})
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {websitesAdded.map((diff, idx) => (
              <div key={idx} className="flex items-start p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg">
                <div className="flex-shrink-0 mr-3 mt-1">
                   <div className="w-8 h-8 rounded bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-200 text-xs font-bold">新</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h5 className="font-medium text-gray-900 dark:text-white truncate">{diff.website.name}</h5>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">{diff.categoryTitle}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{diff.website.desc || '暂无描述'}</p>
                  <a href={diff.website.url} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline mt-1 block truncate">{diff.website.url}</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* 修改 */}
      {websitesModified.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center uppercase tracking-wider">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            修改网站 ({websitesModified.length})
          </h4>
          <div className="space-y-4">
            {websitesModified.map((diff, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/30 rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-blue-50/50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-blue-500">#{diff.websiteId}</span>
                    <span className="text-gray-400 text-sm">in</span>
                    <span>{diff.categoryTitle}</span>
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  {diff.changes.name && <DiffFieldRow label="名称" from={diff.changes.name.from} to={diff.changes.name.to} />}
                  {diff.changes.url && <DiffFieldRow label="链接" from={diff.changes.url.from} to={diff.changes.url.to} />}
                  {diff.changes.desc && <DiffFieldRow label="描述" from={diff.changes.desc.from} to={diff.changes.desc.to} />}
                  {diff.changes.icon && <DiffFieldRow label="图标" from={diff.changes.icon.from} to={diff.changes.icon.to} />}
                  {diff.changes.rate !== undefined && <DiffFieldRow label="评分" from={diff.changes.rate?.from} to={diff.changes.rate?.to} />}
                  {diff.changes.top !== undefined && <DiffFieldRow label="置顶" from={diff.changes.top?.from} to={diff.changes.top?.to} />}
                  {diff.changes.ownVisible !== undefined && <DiffFieldRow label="私有" from={diff.changes.ownVisible?.from} to={diff.changes.ownVisible?.to} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* 删除 */}
      {websitesRemoved.length > 0 && (
        <section>
          <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center uppercase tracking-wider">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            删除网站 ({websitesRemoved.length})
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {websitesRemoved.map((diff, idx) => (
              <div key={idx} className="flex items-start p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg opacity-75">
                <div className="flex-shrink-0 mr-3 mt-1">
                   <div className="w-8 h-8 rounded bg-red-200 dark:bg-red-800 flex items-center justify-center text-red-700 dark:text-red-200 text-xs font-bold">删</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h5 className="font-medium text-gray-900 dark:text-white truncate line-through">{diff.website.name}</h5>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">{diff.categoryTitle}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{diff.website.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {stats.totalWeb === 0 && <EmptyState text="没有网站变更" />}
    </div>
  );

  const EmptyState = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p>{text}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              数据同步检查
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">对比本地数据与远程仓库的差异</p>
          </div>
          <button 
            onClick={() => {
              // 修改 2: 使用可选链调用，安全地清除消息
              setMessage?.(null);
              onClose();
            }} 
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-white dark:bg-gray-900 sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'categories' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            分类变更
            {(stats.catAdd + stats.catDel + stats.catMod) > 0 && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{stats.catAdd + stats.catDel + stats.catMod}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('websites')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'websites' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            网站变更
            {(stats.webAdd + stats.webDel + stats.webMod) > 0 && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{stats.webAdd + stats.webDel + stats.webMod}</span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/20 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {renderOverviewCard("分类变更", stats.catAdd, stats.catDel, stats.catMod, () => setActiveTab('categories'))}
              {renderOverviewCard("网站变更", stats.webAdd, stats.webDel, stats.webMod, () => setActiveTab('websites'))}
              <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">💡 同步说明</h3>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li><span className="font-bold">使用远程配置：</span>将远程 GitHub 仓库的数据覆盖到本地，本地未同步的修改将丢失。</li>
                  <li><span className="font-bold">同步到远程：</span>将本地的数据推送到 GitHub，远程的旧数据将被覆盖。</li>
                  <li>建议在操作前仔细核对变更内容，操作不可撤销。</li>
                </ul>
              </div>
            </div>
          )}
          {activeTab === 'categories' && renderCategoriesTab()}
          {activeTab === 'websites' && renderWebsitesTab()}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => {
              // 修改 3: 使用可选链调用
              setMessage?.(null);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          {onUseRemote && (
            <button
              onClick={() => {
                if (window.confirm('确定要使用远程数据覆盖本地吗？本地未保存的修改将丢失！')) {
                  onUseRemote();
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" /></svg>
              拉取远程覆盖本地
            </button>
          )}
          {onSyncToRemote && (
            <button
              onClick={() => {
                if (window.confirm('确定要将本地数据推送到远程吗？')) {
                  onSyncToRemote();
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-medium transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              推送本地到远程
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
