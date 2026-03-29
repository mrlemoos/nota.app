import { PostHogProvider } from '@posthog/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { ThemeProvider } from './components/theme-provider';
import { RevenueCatBootstrap } from './components/revenuecat-bootstrap';
import { NoteEditorCommandsProvider } from './context/note-editor-commands';
import { StickyDocTitleProvider } from './context/sticky-doc-title';
import { SpaSessionProvider } from './context/spa-session-context';
import { SpaApp } from './spa-app';

const POSTHOG_OPTIONS = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const;

const POSTHOG_PROJECT_TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}

createRoot(rootEl).render(
  <StrictMode>
    <PostHogProvider apiKey={POSTHOG_PROJECT_TOKEN} options={POSTHOG_OPTIONS}>
      <ThemeProvider defaultTheme="system" storageKey="nota-ui-theme">
        <SpaSessionProvider>
          <RevenueCatBootstrap>
            <StickyDocTitleProvider>
              <NoteEditorCommandsProvider>
                <SpaApp />
              </NoteEditorCommandsProvider>
            </StickyDocTitleProvider>
          </RevenueCatBootstrap>
        </SpaSessionProvider>
      </ThemeProvider>
    </PostHogProvider>
  </StrictMode>,
);
