import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () =>
  /Mac|iPhone|iPad|iPod/.test(
    (typeof navigator !== 'undefined' && (navigator.platform || navigator.userAgent)) || ''
  );
// The server uses the Mac label; the client corrects it without a render loop.
const getServerSnapshot = () => true;

export function useIsMac(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
