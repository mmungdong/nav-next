'use client';

import { useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import { ISearchEngine } from '@/types';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

export default function SearchManagementPage() {
  const { siteConfig, saveConfig, pushToRemote, dirty } = useConfigStore();
  const { githubToken } = useAuthStore();
  const engines = siteConfig.search.engines;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ISearchEngine | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const writeEngines = (next: ISearchEngine[]) => {
    saveConfig({ ...siteConfig, search: { engines: next } });
  };

  const handleAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleEdit = (engine: ISearchEngine) => {
    setEditing(engine);
    setShowModal(true);
  };

  const handleSaveEngine = (data: ISearchEngine) => {
    if (editing) {
      writeEngines(engines.map((e) => (e.id === editing.id ? data : e)));
      flash('success', '引擎已更新');
    } else {
      writeEngines([...engines, data]);
      flash('success', '引擎已添加');
    }
    setShowModal(false);
  };

  const confirmDelete = () => {
    if (deletingId) {
      writeEngines(engines.filter((e) => e.id !== deletingId));
      setDeletingId(null);
      flash('success', '引擎已删除');
    }
  };

  const moveEngine = (id: string, dir: -1 | 1) => {
    const idx = engines.findIndex((e) => e.id === id);
    const target = idx + dir;
    if (target < 0 || target >= engines.length) return;
    const next = [...engines];
    [next[idx], next[target]] = [next[target], next[idx]];
    writeEngines(next);
  };

  const handleSaveAll = async () => {
    if (!githubToken) return flash('error', '未配置 GitHub Token');
    setSaving(true);
    const ok = await pushToRemote(githubToken);
    setSaving(false);
    flash(ok ? 'success' : 'error', ok ? '已保存并推送' : '推送失败，请重试');
  };

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">搜索管理</h1>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${dirty ? 'text-amber-600' : 'text-gray-400'}`}>
            {dirty ? '● 有未保存的改动' : '○ 已同步'}
          </span>
          <button
            onClick={handleSaveAll}
            disabled={!dirty || saving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? '保存中…' : '保存并推送'}
          </button>
          <button
            onClick={handleAdd}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            添加引擎
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm mb-4 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {engines.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            暂无搜索引擎，点击添加按钮创建
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">排序</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {engines.map((engine, idx) => (
                <tr key={engine.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{engine.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{engine.url}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-1">
                      <button onClick={() => moveEngine(engine.id, -1)} disabled={idx === 0} className="px-2 disabled:opacity-30">↑</button>
                      <button onClick={() => moveEngine(engine.id, 1)} disabled={idx === engines.length - 1} className="px-2 disabled:opacity-30">↓</button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                    <button onClick={() => handleEdit(engine)} className="text-blue-500 hover:text-blue-700">编辑</button>
                    <button onClick={() => setDeletingId(engine.id)} className="text-red-500 hover:text-red-700">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <EngineModal
          engine={editing}
          onSave={handleSaveEngine}
          onClose={() => setShowModal(false)}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        itemName={engines.find((e) => e.id === deletingId)?.name || '引擎'}
      />
    </div>
  );
}

function EngineModal({
  engine,
  onSave,
  onClose,
}: {
  engine: ISearchEngine | null;
  onSave: (engine: ISearchEngine) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ISearchEngine>(
    engine || { id: `engine-${Date.now()}`, name: '', url: '', icon: '' }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = '名称不能为空';
    if (!form.url.trim()) errs.url = 'URL不能为空';
    else if (!/^https?:\/\//.test(form.url)) errs.url = 'URL必须以 http:// 或 https:// 开头';
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {engine ? '编辑引擎' : '添加引擎'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标标识</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="google / bing / baidu"
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              搜索 URL（查询词拼在末尾）
            </label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://www.google.com/search?q="
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.url && <p className="mt-1 text-sm text-red-500">{errors.url}</p>}
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-md">
              取消
            </button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
