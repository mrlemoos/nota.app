import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  type MetaFunction,
  type LinksFunction,
  type LoaderFunctionArgs,
} from 'react-router';

import '../styles.css';

import { SignedInCommandPalette } from './signed-in-command-palette';
import { StickyDocTitleProvider } from './context/sticky-doc-title';
import { ThemeProvider } from './components/theme-provider';
import { getAuthUser } from './lib/supabase/auth';

export const meta: MetaFunction = () => [
  {
    title: 'Nota - Notes App',
  },
];

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Instrument+Serif:ital@0;1&display=swap',
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getAuthUser(request);
  return { user };
}

export function useRootLoaderData() {
  return useRouteLoaderData<typeof loader>('root');
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-sans">
        <ThemeProvider defaultTheme="system" storageKey="nota-ui-theme">
          <StickyDocTitleProvider>
            <SignedInCommandPalette />
            {children}
          </StickyDocTitleProvider>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
