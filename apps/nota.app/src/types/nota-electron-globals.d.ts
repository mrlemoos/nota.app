export {};

declare global {
  interface Window {
    /** Present when running inside the Nota Electron shell (preload). */
    nota?: {
      subscribeMenubarActions(cb: (payload: unknown) => void): () => void;
    };
  }
}
