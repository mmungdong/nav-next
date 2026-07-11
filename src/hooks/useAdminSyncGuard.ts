'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';

type Status = 'loading' | 'ready' | 'error';

interface PendingLeave {
  message: string;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function useAdminSyncGuard() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);

  const navForcePull = useNavStore((s) => s.forcePull);
  const navPushToRemote = useNavStore((s) => s.pushToRemote);
  const navDiscardLocal = useNavStore((s) => s.discardLocal);
  const navDirty = useNavStore((s) => s.dirty);
  const configForcePull = useConfigStore((s) => s.forcePull);
  const configPushToRemote = useConfigStore((s) => s.pushToRemote);
  const configDiscardLocal = useConfigStore((s) => s.discardLocal);
  const configDirty = useConfigStore((s) => s.dirty);
  const githubToken = useAuthStore((s) => s.githubToken);

  const runPull = useCallback(async () => {
    if (!githubToken) {
      setStatus('error');
      setError('未配置 GitHub Token，请先在登录页授权');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [navOk, configOk] = await Promise.all([
        navForcePull(githubToken),
        configForcePull(githubToken),
      ]);
      if (!navOk || !configOk) {
        setStatus('error');
        setError('拉取远程数据失败，请检查网络与 Token 权限');
        return;
      }
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(`拉取失败: ${(e as Error).message}`);
    }
  }, [githubToken, navForcePull, configForcePull]);

  // enter: pull on mount
  useEffect(() => {
    runPull();
  }, [runPull]);

  // beforeunload guard when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (navDirty || configDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [navDirty, configDirty]);

  // request leave: if dirty, surface dialog; else navigate immediately
  const confirmLeave = useCallback(
    (navigate: () => void) => {
      if (!navDirty && !configDirty) {
        navigate();
        return;
      }
      setPendingLeave({
        message: '有未保存的改动，是否保存？',
        error: null,
        onSave: async () => {
          setPendingLeave((prev) => (prev ? { ...prev, error: null } : prev));
          const [navOk, configOk] = await Promise.all([
            navDirty ? navPushToRemote(githubToken!) : Promise.resolve(true),
            configDirty ? configPushToRemote(githubToken!) : Promise.resolve(true),
          ]);
          if (navOk && configOk) {
            setPendingLeave(null);
            navigate();
          } else {
            setPendingLeave((prev) =>
              prev ? { ...prev, error: '推送失败，请重试或丢弃改动' } : prev
            );
          }
        },
        onDiscard: () => {
          if (navDirty) navDiscardLocal();
          if (configDirty) configDiscardLocal();
          setPendingLeave(null);
          navigate();
        },
        onCancel: () => setPendingLeave(null),
      });
    },
    [navDirty, configDirty, navPushToRemote, configPushToRemote, navDiscardLocal, configDiscardLocal, githubToken]
  );

  return { status, error, retry: runPull, confirmLeave, pendingLeave, setPendingLeave };
}

// pure helper for testable leave decision
export function decideLeave(navDirty: boolean, configDirty: boolean): 'clean' | 'dirty' {
  return navDirty || configDirty ? 'dirty' : 'clean';
}
