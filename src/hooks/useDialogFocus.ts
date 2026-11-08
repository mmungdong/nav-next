'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Nested dialogs (e.g. the drawer holding the logout prompt) must react in the
// order they were opened, not the order their effects mounted.
const dialogStack: symbol[] = [];

export interface DialogFocusOptions {
  isOpen: boolean;
  dialogRef: React.RefObject<HTMLElement | null>;
  /** Runs on Escape and lets the dialog decide whether it may close. */
  onClose?: () => void;
  /** Element focused on open; defaults to the first focusable inside the dialog. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Locks page scrolling while open; defaults to true. */
  lockScroll?: boolean;
}

/**
 * Focus management shared by every dialog: initial focus, Tab trap, Escape,
 * scroll lock and focus restore. Mirrors the SearchModal reference behaviour.
 */
export function useDialogFocus({
  isOpen,
  dialogRef,
  onClose,
  initialFocusRef,
  lockScroll = true,
}: DialogFocusOptions): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const token = Symbol('dialog');
    dialogStack.push(token);
    const isTopMost = () => dialogStack[dialogStack.length - 1] === token;

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const target =
        initialFocusRef?.current ??
        dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        dialog;
      if (target === dialog && !dialog.hasAttribute('tabindex')) {
        dialog.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopMost()) return;
      if (event.key === 'Escape') {
        if (!onCloseRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      const index = dialogStack.lastIndexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      if (previousActive && previousActive.isConnected) {
        previousActive.focus({ preventScroll: true });
      }
    };
  }, [isOpen, dialogRef, initialFocusRef, lockScroll]);
}
