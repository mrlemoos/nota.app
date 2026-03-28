/**
 * By default, React Router will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx react-router reveal` ✨
 * For more information, see https://reactrouter.com/explanation/special-files#entryclienttsx
 */

import { PostHogProvider } from '@posthog/react'
import { HydratedRouter } from 'react-router/dom';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

const POSTHOG_OPTIONS = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const;

const POSTHOG_PROJECT_TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <PostHogProvider apiKey={POSTHOG_PROJECT_TOKEN} options={POSTHOG_OPTIONS}>
        <HydratedRouter />
      </PostHogProvider>
    </StrictMode>,
  );
});
