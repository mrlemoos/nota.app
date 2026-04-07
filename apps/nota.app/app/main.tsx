import { ClerkProvider } from '@clerk/clerk-react';
import { PostHogProvider } from '@posthog/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import './lib/app-navigation';
import { SpaErrorBoundary } from './components/spa-error-boundary';
import { ThemeProvider } from './components/theme-provider';
import { ClerkSupabaseBridge } from './context/clerk-supabase-bridge';
import { NoteEditorCommandsProvider } from './context/note-editor-commands';
import { StickyDocTitleProvider } from './context/sticky-doc-title';
import { SpaSessionProvider } from './context/spa-session-context';
import {
  clerkFullNotesUrl,
  clerkFullSignInUrl,
  clerkFullSignUpUrl,
  clerkRouterPush,
  clerkRouterReplace,
} from './lib/clerk-hash-navigation';
import { ClerkSsoCallbackRoute } from './components/clerk-sso-callback-route';
import { SpaApp } from './spa-app';

const POSTHOG_OPTIONS = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const;

const POSTHOG_PROJECT_TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

const clerkPublishableKey =
  typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === 'string'
    ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY.trim()
    : '';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

createRoot(rootEl).render(
  <ClerkProvider
    publishableKey={clerkPublishableKey}
    signInUrl={clerkFullSignInUrl()}
    signUpUrl={clerkFullSignUpUrl()}
    signInForceRedirectUrl={clerkFullNotesUrl()}
    signUpForceRedirectUrl={clerkFullNotesUrl()}
    routerPush={clerkRouterPush}
    routerReplace={clerkRouterReplace}
    allowedRedirectProtocols={['nota:']}
  >
    <StrictMode>
      <PostHogProvider apiKey={POSTHOG_PROJECT_TOKEN} options={POSTHOG_OPTIONS}>
        <ClerkSupabaseBridge>
          <ClerkSsoCallbackRoute />
          <ThemeProvider defaultTheme="system" storageKey="nota-ui-theme">
            <SpaSessionProvider>
              <StickyDocTitleProvider>
                <NoteEditorCommandsProvider>
                  <SpaErrorBoundary>
                    <SpaApp />
                  </SpaErrorBoundary>
                </NoteEditorCommandsProvider>
              </StickyDocTitleProvider>
            </SpaSessionProvider>
          </ThemeProvider>
        </ClerkSupabaseBridge>
      </PostHogProvider>
    </StrictMode>
  </ClerkProvider>,
);
