'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FlashMessage {
  type: 'success' | 'error' | 'loading';
  text: string;
}

/**
 * Dismisses a message after a delay, cancels the pending timer on a new message
 * and on unmount so a stale timer cannot clear a newer message.
 */
export function useFlashMessage(timeoutMs = 3000) {
  const [message, setMessage] = useState<FlashMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flash = useCallback(
    (type: FlashMessage['type'], text: string) => {
      clearTimer();
      setMessage({ type, text });
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMessage(null);
      }, timeoutMs);
    },
    [clearTimer, timeoutMs]
  );

  /** Shows a message that stays until replaced or dismissed by the user. */
  const showPersistent = useCallback(
    (next: FlashMessage | null) => {
      clearTimer();
      setMessage(next);
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { message, flash, showPersistent };
}
