import { useLayoutEffect, useState } from 'react';

/** Synchronous check for OAuth / shell behaviour (avoids a one-frame web-only flash in Electron). */
export function isElectronShellSync(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const hasShellBridge = typeof window.nota !== 'undefined';
  const uaSaysElectron = navigator.userAgent.toLowerCase().includes('electron');
  return hasShellBridge || uaSaysElectron;
}

export function useIsElectron() {
  const [isElectron, setIsElectron] = useState(false);

  useLayoutEffect(() => {
    setIsElectron(isElectronShellSync());
  }, []);

  return isElectron;
}
