'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavStore } from '@/stores/navStore';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import { isSyncSuccess, SyncResult } from '@/lib/syncTypes';

type Status = 'loading' | 'ready' | 'error';

export interface PendingLeave {
  message: string;
  error: string | null;
  saving: boolean;
  canKeepDraft: boolean;
  onSave: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const failureText = (label: string, result: SyncResult): string =>
  `${label}：${isSyncSuccess(result) ? '成功' : result.message}`;

/**
 * Admin entry guard: initialises both resources from their drafts, watches for
 * remote changes on focus/visibility/online (the stores throttle to 60s and
 * merge duplicate requests), and owns the unsaved-changes dialog.
 */
export function useAdminSyncGuard(enabled: boolean) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);

  const navInit = useNavStore((s) => s.initAdmin);
  const navPush = useNavStore((s) => s.pushToRemote);
  const navCheck = useNavStore((s) => s.checkRemote);
  const navDiscard = useNavStore((s) => s.discardLocal);
  const navDirty = useNavStore((s) => s.dirty);
  const configInit = useConfigStore((s) => s.initAdmin);
  const configPush = useConfigStore((s) => s.pushToRemote);
  const configCheck = useConfigStore((s) => s.checkRemote);
  const configDiscard = useConfigStore((s) => s.discardLocal);
  const configDirty = useConfigStore((s) => s.dirty);
  const githubToken = useAuthStore((s) => s.githubToken);

  const initPromiseRef = useRef<Promise<void> | null>(null);

  const runInit = useCallback(async () => {
    if (!githubToken) {
      setStatus('error');
      setError('未配置 GitHub Token，请先在登录页授权');
      return;
    }
    setStatus('loading');
    setError(null);
    await Promise.all([navInit(githubToken), configInit(githubToken)]);

    const nav = useNavStore.getState();
    const config = useConfigStore.getState();
    const navFatal = nav.syncStatus === 'error' && !nav.baselineReady;
    const configFatal = config.syncStatus === 'error' && !config.baselineReady;

    if (navFatal || configFatal) {
      setStatus('error');
      setError(
        [navFatal ? `网站数据：${nav.syncError ?? '初始化失败'}` : '', configFatal ? `站点配置：${config.syncError ?? '初始化失败'}` : '']
          .filter(Boolean)
          .join('；')
      );
      return;
    }
    setStatus('ready');
  }, [githubToken, navInit, configInit]);

  // Duplicate effects (React Strict Mode) join the same init request.
  const runInitOnce = useCallback(() => {
    if (!initPromiseRef.current) {
      initPromiseRef.current = runInit().finally(() => {
        initPromiseRef.current = null;
      });
    }
    return initPromiseRef.current;
  }, [runInit]);

  useEffect(() => {
    if (enabled) void runInitOnce();
  }, [enabled, runInitOnce]);

  const retry = useCallback(() => runInit(), [runInit]);

  // Re-check remote when the tab becomes active again; no polling. The stores
  // merge duplicate checks and skip anything inside the 60s cooldown.
  useEffect(() => {
    if (!enabled || !githubToken) return undefined;
    const check = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void navCheck(githubToken);
      void configCheck(githubToken);
    };
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [enabled, githubToken, navCheck, configCheck]);

  // beforeunload is only a supplement; drafts are already persisted.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (navDirty || configDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [navDirty, configDirty]);

  const confirmLeave = useCallback(
    (navigate: () => void) => {
      if (!navDirty && !configDirty) {
        navigate();
        return;
      }

      const navState = useNavStore.getState();
      const configState = useConfigStore.getState();
      const canKeepDraft = !navState.draftIssue && !configState.draftIssue;

      setPendingLeave({
        message: '有未推送的改动，离开前如何处理？',
        error: null,
        saving: false,
        canKeepDraft,
        onSave: async () => {
          if (!githubToken) return;
          setPendingLeave((prev) => (prev ? { ...prev, saving: true, error: null } : prev));

          // Read dirtiness at click time: a retry after partial success must only
          // re-push the file that is still unsent.
          const currentNav = useNavStore.getState();
          const currentConfig = useConfigStore.getState();
          const failures: string[] = [];
          if (currentNav.dirty) {
            const result = await navPush(githubToken);
            if (!isSyncSuccess(result)) failures.push(failureText('网站数据', result));
          }
          if (currentConfig.dirty) {
            const result = await configPush(githubToken);
            if (!isSyncSuccess(result)) failures.push(failureText('站点配置', result));
          }

          if (failures.length === 0) {
            setPendingLeave(null);
            navigate();
            return;
          }
          // Partial success stays on the page; only the failed file is retried.
          setPendingLeave((prev) =>
            prev
              ? {
                  ...prev,
                  saving: false,
                  error: `未完全成功：${failures.join('；')}。草稿已保留，可重试失败项。`,
                }
              : prev
          );
        },
        onKeep: () => {
          const currentNav = useNavStore.getState();
          const currentConfig = useConfigStore.getState();
          if (currentNav.draftIssue || currentConfig.draftIssue) {
            setPendingLeave((prev) =>
              prev
                ? {
                    ...prev,
                    error: `草稿没有成功保存到本机：${currentNav.draftIssue ?? currentConfig.draftIssue}。请继续编辑并导出，或处理后重试。`,
                  }
                : prev
            );
            return;
          }
          setPendingLeave(null);
          navigate();
        },
        onDiscard: () => {
          if (navDirty) navDiscard();
          if (configDirty) configDiscard();
          setPendingLeave(null);
          navigate();
        },
        onCancel: () => setPendingLeave(null),
      });
    },
    [navDirty, configDirty, githubToken, navPush, configPush, navDiscard, configDiscard]
  );

  return { status, error, retry, confirmLeave, pendingLeave, setPendingLeave };
}

export function decideLeave(navDirty: boolean, configDirty: boolean): 'clean' | 'dirty' {
  return navDirty || configDirty ? 'dirty' : 'clean';
}
