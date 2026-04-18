import { useEffect, useState, type ComponentType, type ReactNode } from 'react';

const POSTHOG_OPTIONS = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const;

type PostHogProviderProps = {
  apiKey: string;
  options: typeof POSTHOG_OPTIONS;
  children: ReactNode;
};

/**
 * Loads PostHog after first paint so Clerk/theme/fonts stay on the critical path
 * (`bundle-defer-third-party`).
 */
export function DeferredPostHogRoot({
  apiKey,
  children,
}: {
  apiKey: string | undefined;
  children: ReactNode;
}): ReactNode {
  const [PostHogProvider, setPostHogProvider] =
    useState<ComponentType<PostHogProviderProps> | null>(null);

  useEffect(() => {
    if (!apiKey) {
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(() => {
      void import('@posthog/react').then((mod) => {
        if (!cancelled) {
          setPostHogProvider(() => mod.PostHogProvider);
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [apiKey]);

  if (!apiKey || !PostHogProvider) {
    return children;
  }

  return (
    <PostHogProvider apiKey={apiKey} options={POSTHOG_OPTIONS}>
      {children}
    </PostHogProvider>
  );
}
