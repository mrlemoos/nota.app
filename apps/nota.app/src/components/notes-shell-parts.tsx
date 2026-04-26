import { NotaButton } from '@nota.app/web-design/button';
import { NotaLoadingStatus } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useNotesSidebarStore } from '../stores/notes-sidebar';
import type { JSX, ReactNode } from 'react';

/** Avoid `fallback={null}`: paywall redirect hits Settings before the chunk loads; Electron notes root is transparent so an empty main reads as a blank screen. */
export function LazyNotesRouteFallback({ label }: { label: string }): JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center px-4',
        'bg-background/80 text-sm text-muted-foreground',
      )}
    >
      <NotaLoadingStatus label={label} />
    </div>
  );
}

export function SidebarToggle({ className }: { className?: string }): JSX.Element {
  const { open, toggle } = useNotesSidebarStore();

  return (
    <NotaButton
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={toggle}
      className={cn('text-foreground', className)}
      aria-label={open ? 'Close sidebar' : 'Open sidebar'}
      aria-expanded={open}
    >
      {open ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      )}
    </NotaButton>
  );
}

export function ShellPanel({
  active,
  panelId,
  children,
}: {
  active: boolean;
  panelId: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      id={panelId}
      className={cn(!active && 'hidden')}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
}

export function NotesIndexPanel({ onCreate }: { onCreate: () => void }): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="h-16 w-16 text-muted-foreground"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-serif text-xl font-semibold tracking-normal text-foreground">
          Select a note
        </h2>
        <p className="mb-6 text-muted-foreground">
          Choose a note from the sidebar or create a new one.
        </p>
        <NotaButton
          type="button"
          size="lg"
          className="min-h-10 px-6"
          onClick={onCreate}
        >
          Create New Note
        </NotaButton>
      </div>
    </div>
  );
}
