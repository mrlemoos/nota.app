type OnlineListener = () => void;

let onlineListenerAttached = false;
const onlineListeners = new Set<OnlineListener>();

function dispatchOnline(): void {
  for (const listener of onlineListeners) {
    listener();
  }
}

/**
 * Single `window` `online` subscription shared by hooks (client-event-listeners).
 */
export function subscribeOnline(listener: OnlineListener): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  onlineListeners.add(listener);
  if (!onlineListenerAttached) {
    onlineListenerAttached = true;
    window.addEventListener('online', dispatchOnline);
  }
  return () => {
    onlineListeners.delete(listener);
    if (onlineListeners.size === 0) {
      window.removeEventListener('online', dispatchOnline);
      onlineListenerAttached = false;
    }
  };
}
