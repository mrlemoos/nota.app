import { ClerkProvider } from '@clerk/react';
import { ui } from '@clerk/ui';
import { PostHogProvider } from '@posthog/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/* Import via the JS graph so Vite emits `url(./files/*.woff2)` assets. `@import` inside
 * `styles.css` is handled only by PostCSS/Tailwind and does not attach font files to the bundle,
 * which left `/assets/files/*.woff2` missing in production (SPA rewrite returned HTML → OTS errors). */
import '@fontsource-variable/inter/index.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/source-serif-4/index.css';
import '@fontsource/geist-sans/latin.css';
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
  repairClerkAuthLocationHash,
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

repairClerkAuthLocationHash();

createRoot(rootEl).render(
  <ClerkProvider
    ui={ui}
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
