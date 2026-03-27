import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const NOTA_MOTION_EASE_OUT = 'power2.out';
export const NOTA_MOTION_EASE_IN = 'power2.in';
export const NOTA_MOTION_EASE_IN_OUT = 'power2.inOut';

export const NOTA_PALETTE_ENTER_S = 0.25;
export const NOTA_PALETTE_EXIT_S = 0.2;

export const NOTA_SIDEBAR_S = 0.28;
export const NOTA_SIDEBAR_WIDTH_PX = 288;

export const NOTA_BUTTON_PRESS_S = 0.08;
export const NOTA_BUTTON_RELEASE_S = 0.15;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (): void => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export { gsap, useGSAP };
