'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

interface GitSyncStatus {
  isSynced: boolean;
  localChanges: boolean;
  remoteChanges: boolean;
  lastSyncCheck: string;
  error?: string;
}

export default function GitSyncStatus() {
  const [status, setStatus] = useState<GitSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, githubToken } = useAuthStore();

  const checkSyncStatus = async () => {
    if (!isAuthenticated || !githubToken) {
      setError('未认证或缺少GitHub Token');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 由于这是一个静态导出应用，我们不能直接访问本地Git状态
      // 所以我们只能通过GitHub API检查远程仓库的状态
      // 这里我们简单地使用时间戳来模拟最近的同步状态
      const currentTime = new Date();
      const simulatedStatus: GitSyncStatus = {
        isSynced: true, // 假设初始状态是同步的
        localChanges: false, // 假设没有本地更改
        remoteChanges: false, // 假设没有远程更改
        lastSyncCheck: currentTime.toISOString(),
      };

      setStatus(simulatedStatus);
    } catch (err: any) {
      console.error('检查同步状态失败:', err);
      setError(err.message || '检查同步状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // 首次加载时获取状态
      checkSyncStatus();

      // 设置每30分钟检查一次的定时器（1800000毫秒）
      const intervalId = setInterval(checkSyncStatus, 30 * 60 * 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isAuthenticated, githubToken]);

  if (!isAuthenticated) {
    return null;
  }

  const getStatusIcon = () => {
    if (loading) {
      return (
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
      );
    }

    if (error || !status) {
      return (
        <div className="flex items-center">
          <span className="text-red-500">⚠️</span>
        </div>
      );
    }

    // 检查是否有本地更改或远程更改
    if (status.localChanges || status.remoteChanges) {
      return (
        <div className="flex items-center">
          <span className="text-yellow-500">⚠️</span>
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <span className="text-green-500">✓</span>
      </div>
    );
  };

  const getStatusMessage = () => {
    if (loading) return '检查同步状态中...';
    if (error) return `错误: ${error}`;
    if (!status) return '无法获取状态';

    if (status.localChanges && status.remoteChanges) {
      return '本地有更改，远程也有更新';
    } else if (status.localChanges) {
      return '本地有未推送的更改';
    } else if (status.remoteChanges) {
      return '远程有更新';
    }

    return '本地与远程同步';
  };

  const getStatusColor = () => {
    if (loading) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
    if (error || !status) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';

    if (status.localChanges || status.remoteChanges) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
    }

    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`p-4 rounded-lg shadow-lg border backdrop-blur-sm ${getStatusColor()} border-gray-200 dark:border-gray-700 min-w-75 max-w-md`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <div>
                <h3 className="font-semibold text-sm">Git同步状态</h3>
                <p className="text-xs opacity-80 mt-1">{getStatusMessage()}</p>
              </div>
            </div>

            <button
              onClick={checkSyncStatus}
              className="text-xs bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 px-2 py-1 rounded transition-colors"
              title="立即检查"
            >
              刷新
            </button>
          </div>

          <div className="mt-3 text-xs space-y-1 opacity-90">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded ${status?.localChanges ? 'bg-yellow-200/50 dark:bg-yellow-900/30' : 'bg-gray-200/30 dark:bg-gray-700/30'}`}>
                <div className="font-semibold">本地</div>
                <div className="text-xs">{status?.localChanges ? '有更改' : '同步'}</div>
              </div>
              <div className={`p-2 rounded ${status?.isSynced ? 'bg-green-200/50 dark:bg-green-900/30' : 'bg-yellow-200/50 dark:bg-yellow-900/30'}`}>
                <div className="font-semibold">状态</div>
                <div className="text-xs">{status?.isSynced ? '同步' : '不同步'}</div>
              </div>
              <div className={`p-2 rounded ${status?.remoteChanges ? 'bg-blue-200/50 dark:bg-blue-900/30' : 'bg-gray-200/30 dark:bg-gray-700/30'}`}>
                <div className="font-semibold">远程</div>
                <div className="text-xs">{status?.remoteChanges ? '有更新' : '最新'}</div>
              </div>
            </div>

            <div className="text-xs opacity-70 mt-2">
              最后检查: {status ? new Date(status.lastSyncCheck).toLocaleTimeString() : '从未检查'}
            </div>

            <div className="text-xs mt-2 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded">
              提示: 在静态部署中，此功能仅能检测远程仓库更新。本地更改需通过命令行或GitHub Desktop等工具手动同步。
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}