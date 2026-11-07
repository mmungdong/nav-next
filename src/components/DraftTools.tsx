'use client';

import { useRef, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useConfigStore } from '@/stores/configStore';

/**
 * Local-only draft escape hatch: export never includes credentials, and import
 * only restores a local draft — it never binds it to the remote or pushes.
 */
export default function DraftTools() {
  const navResourceKey = useNavStore((s) => s.resourceKey);
  const configResourceKey = useConfigStore((s) => s.resourceKey);
  const navExport = useNavStore((s) => s.exportDraftText);
  const configExport = useConfigStore((s) => s.exportDraftText);
  const navImport = useNavStore((s) => s.importDraftText);
  const configImport = useConfigStore((s) => s.importDraftText);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    const drafts = [navExport(), configExport()]
      .filter((value): value is string => Boolean(value))
      .map((value) => JSON.parse(value) as unknown);
    if (drafts.length === 0) {
      setMessage('当前没有可导出的草稿');
      return;
    }
    const blob = new Blob([JSON.stringify(drafts, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `navnext-drafts-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('草稿已导出（不含 GitHub Token）');
  };

  const handleImport = async (file: File) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setMessage('导入失败：文件不是合法 JSON');
      return;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const errors: string[] = [];
    let imported = 0;

    for (const item of items) {
      const resourceKey =
        item && typeof item === 'object' && 'resourceKey' in item
          ? String((item as { resourceKey: unknown }).resourceKey)
          : '';
      const raw = JSON.stringify(item);
      const result =
        resourceKey === navResourceKey
          ? navImport(raw)
          : resourceKey === configResourceKey
            ? configImport(raw)
            : null;
      if (!result) {
        errors.push('资源标识与本仓库配置不匹配');
      } else if (!result.ok) {
        errors.push(result.error ?? '导入失败');
      } else {
        imported += 1;
      }
    }

    if (errors.length > 0) {
      setMessage(`已导入 ${imported} 份；${errors.join('；')}`);
    } else {
      setMessage(`已导入 ${imported} 份草稿，未推送到 GitHub`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={handleExport}
        className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
      >
        导出草稿
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
      >
        导入恢复草稿
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="选择草稿文件"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.target.value = '';
        }}
      />
      {message && (
        <span role="status" className="text-gray-600 dark:text-gray-300">
          {message}
        </span>
      )}
    </div>
  );
}
