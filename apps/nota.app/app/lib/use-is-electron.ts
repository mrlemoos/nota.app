import { useLayoutEffect, useState } from 'react';

export function useIsElectron() {
  const [isElectron, setIsElectron] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    setIsElectron(navigator.userAgent.toLowerCase().includes('electron'));
  }, []);

  return isElectron;
}
