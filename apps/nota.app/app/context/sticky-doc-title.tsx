import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

export type StickyDocTitleState = {
  visible: boolean;
  label: string;
};

const initialSticky: StickyDocTitleState = {
  visible: false,
  label: '',
};

type StickyDocTitleContextValue = {
  scrollRootRef: RefObject<HTMLElement | null>;
  scrollRootEpoch: number;
  registerScrollRoot: (el: HTMLElement | null) => void;
  sticky: StickyDocTitleState;
  setSticky: (partial: Partial<StickyDocTitleState>) => void;
  resetSticky: () => void;
};

const StickyDocTitleContext =
  createContext<StickyDocTitleContextValue | null>(null);

/** Used when `Layout` / `StickyDocTitleProvider` is not in the tree (e.g. route stubs in tests). */
const fallbackScrollRootRef: RefObject<HTMLElement | null> = { current: null };

function noopRegisterScrollRoot(_el: HTMLElement | null) {}

function noopSetSticky(_partial: Partial<StickyDocTitleState>) {}

function noopResetSticky() {}

const stickyDocTitleFallback: StickyDocTitleContextValue = {
  scrollRootRef: fallbackScrollRootRef,
  scrollRootEpoch: 0,
  registerScrollRoot: noopRegisterScrollRoot,
  sticky: initialSticky,
  setSticky: noopSetSticky,
  resetSticky: noopResetSticky,
};

export function StickyDocTitleProvider({ children }: { children: ReactNode }) {
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const [scrollRootEpoch, setScrollRootEpoch] = useState(0);
  const [sticky, setStickyState] = useState<StickyDocTitleState>(initialSticky);

  const registerScrollRoot = useCallback((el: HTMLElement | null) => {
    scrollRootRef.current = el;
    setScrollRootEpoch((e) => e + 1);
  }, []);

  const setSticky = useCallback((partial: Partial<StickyDocTitleState>) => {
    setStickyState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSticky = useCallback(() => {
    setStickyState(initialSticky);
  }, []);

  const value: StickyDocTitleContextValue = {
    scrollRootRef,
    scrollRootEpoch,
    registerScrollRoot,
    sticky,
    setSticky,
    resetSticky,
  };

  return (
    <StickyDocTitleContext.Provider value={value}>
      {children}
    </StickyDocTitleContext.Provider>
  );
}

export function useStickyDocTitle(): StickyDocTitleContextValue {
  const ctx = useContext(StickyDocTitleContext);
  return ctx ?? stickyDocTitleFallback;
}
