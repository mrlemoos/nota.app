import { useEffect } from 'react';
import {
  NavLink,
  Outlet,
  useLoaderData,
  useParams,
  Form,
  redirect,
  useRevalidator,
} from 'react-router';
import { requireAuth } from '../lib/supabase/auth';
import { listNotes, createNote } from '../models/notes';
import {
  getUserPreferences,
  upsertUserPreferences,
} from '../models/user-preferences';
import { updateUserPreferencesFormSchema } from '../lib/validation/user-preferences';
import { useNotesSidebarStore } from '../stores/notes-sidebar';
import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  ClientLoaderFunctionArgs,
  ClientActionFunctionArgs,
} from 'react-router';
import { Flowchart01Icon, Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRootLoaderData } from '../root';
import { useStickyDocTitle } from '../context/sticky-doc-title';
import { useIsElectron } from '../lib/use-is-electron';
import { getBrowserClient } from '../lib/supabase/browser';
import {
  createLocalOnlyNote,
  isLikelyOnline,
  listStoredNotes,
  mergeNoteLists,
  putServerNoteIfNotDirty,
  storedNoteToListRow,
} from '../lib/notes-offline';
import { useNotesOfflineSync } from '../lib/use-notes-offline-sync';
import { useTodaysNoteShortcut } from '../lib/use-todays-note-shortcut';
import { useSyncUserPreferences } from '../lib/use-sync-user-preferences';
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import type { Note, UserPreferences } from '~/types/database.types';

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers, user } = await requireAuth(request);

  let notes: Note[] = [];
  let error: string | undefined;
  try {
    notes = await listNotes(supabase);
  } catch (e) {
    console.error('Failed to load notes:', e);
    error = 'Failed to load notes';
  }

  let userPreferences: UserPreferences;
  try {
    userPreferences = await getUserPreferences(supabase, user.id);
  } catch (e) {
    console.error('Failed to load user preferences:', e);
    userPreferences = {
      user_id: user.id,
      open_todays_note_shortcut: false,
      updated_at: new Date(0).toISOString(),
    };
  }

  return {
    notes,
    userPreferences,
    headers,
    ...(error ? { error } : {}),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'updateUserPreferences') {
    const parsed = updateUserPreferencesFormSchema.safeParse({
      intent: 'updateUserPreferences',
      openTodaysNoteShortcut: formData.get('openTodaysNoteShortcut'),
    });
    if (!parsed.success) {
      return Response.json(
        { ok: false as const, error: 'Invalid preferences form' },
        { status: 400, headers },
      );
    }
    const row = await upsertUserPreferences(supabase, user.id, {
      open_todays_note_shortcut: parsed.data.openTodaysNoteShortcut,
    });
    return Response.json({ ok: true as const, userPreferences: row }, { headers });
  }

  const newNote = await createNote(supabase, user.id);

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      Location: `/notes/${newNote.id}`,
    },
  });
}

export async function notesLayoutClientLoader({
  serverLoader,
}: ClientLoaderFunctionArgs) {
  let client: ReturnType<typeof getBrowserClient>;
  try {
    client = getBrowserClient();
  } catch {
    try {
      return await serverLoader();
    } catch {
      return {
        notes: [],
        userPreferences: null,
        headers: new Headers(),
      };
    }
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    try {
      return await serverLoader();
    } catch {
      return {
        notes: [],
        userPreferences: null,
        headers: new Headers(),
      };
    }
  }

  try {
    const data = await serverLoader<typeof loader>();
    for (const n of data.notes) {
      await putServerNoteIfNotDirty(userId, n);
    }
    const stored = await listStoredNotes(userId);
    const notes = mergeNoteLists(data.notes, stored);
    return { ...data, notes };
  } catch (e) {
    if (isLikelyOnline()) {
      throw e;
    }
    const stored = await listStoredNotes(userId);
    const active = stored.filter((r) => !r.pending_delete);
    const notes = active
      .map(storedNoteToListRow)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return {
      notes,
      userPreferences: null,
      headers: new Headers(),
    };
  }
}

export const clientLoader = Object.assign(notesLayoutClientLoader, {
  hydrate: true,
});

export type NotesLayoutLoaderData = {
  notes: Note[];
  headers: Headers;
  error?: string;
  /** Null when the client loader could not reach the server (fully offline bootstrap). */
  userPreferences: UserPreferences | null;
};

async function notesLayoutClientAction({
  request,
  serverAction,
}: ClientActionFunctionArgs) {
  if (request.method !== 'POST') {
    return serverAction();
  }

  const formData = await request.clone().formData();
  if (formData.get('intent') === 'updateUserPreferences') {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { offline: true as const };
    }
    try {
      return await serverAction();
    } catch {
      return { offline: true as const };
    }
  }

  const runLocalCreate = async () => {
    const c = getBrowserClient();
    const {
      data: { session },
    } = await c.auth.getSession();
    if (!session?.user) {
      throw redirect('/login');
    }
    const id = await createLocalOnlyNote(session.user.id);
    throw redirect(`/notes/${id}`);
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return runLocalCreate();
  }

  try {
    return await serverAction();
  } catch {
    return runLocalCreate();
  }
}

export const clientAction = notesLayoutClientAction;

function SidebarToggle({ className }: { className?: string }) {
  const { open, toggle } = useNotesSidebarStore();

  return (
    <Button
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
    </Button>
  );
}

export default function NotesLayout() {
  const { notes, error, userPreferences } = useLoaderData() as unknown as NotesLayoutLoaderData;
  const { noteId } = useParams();
  const { open } = useNotesSidebarStore();
  const { user } = useRootLoaderData() ?? { user: null };
  const { registerScrollRoot, resetSticky, sticky } = useStickyDocTitle();
  const isElectron = useIsElectron();
  const { revalidate } = useRevalidator();
  const openTodaysNoteShortcut = useNotaPreferencesStore(
    (s) => s.openTodaysNoteShortcut,
  );

  useSyncUserPreferences(userPreferences);
  useTodaysNoteShortcut(notes, user?.id, openTodaysNoteShortcut);

  useNotesOfflineSync(user?.id);

  useEffect(() => {
    if (!user?.id || !isLikelyOnline()) {
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (!cancelled) {
        revalidate();
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [user?.id, revalidate]);

  useEffect(() => {
    return () => {
      registerScrollRoot(null);
      resetSticky();
    };
  }, [registerScrollRoot, resetSticky]);

  const notesChrome =
    'bg-background/55 backdrop-blur-xl backdrop-saturate-150 text-foreground';

  return (
    <>
      {sticky.visible && sticky.label ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]"
          aria-hidden
        >
          <span className="max-w-[min(20rem,calc(100%-2rem))] truncate rounded-md bg-background/80 px-3 py-1 text-center text-sm font-medium text-foreground backdrop-blur-sm">
            {sticky.label}
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          'nota-notes-root flex h-dvh min-h-0 bg-linear-to-b from-muted/25 to-background',
        )}
      >
        {!open ? (
          <div
            className={cn(
              'fixed z-40 flex items-center',
              isElectron
                ? 'pointer-events-none top-0 left-0 min-h-[52px] pl-20 pt-[env(safe-area-inset-top)]'
                : 'left-4 top-4',
            )}
          >
            <SidebarToggle
              className={cn(
                'text-foreground',
                isElectron && 'pointer-events-auto',
              )}
            />
          </div>
        ) : null}
        <aside
          className={cn(
            'flex h-full min-h-0 flex-col transition-all duration-300 ease-in-out',
            notesChrome,
            open ? 'w-72 opacity-100' : 'w-0 overflow-hidden opacity-0',
          )}
          aria-hidden={!open}
        >
          <TooltipProvider>
            <div
              className={cn(
                'flex shrink-0 items-center justify-between pr-4 pb-4',
                isElectron
                  ? 'pl-20 pt-[max(1rem,env(safe-area-inset-top))]'
                  : 'pl-4 pt-4',
              )}
            >
              <h2 className="font-serif text-lg font-semibold tracking-normal">
                Notes
              </h2>
              <div className="flex items-center gap-3">
                <Form method="post" action="/notes">
                  <Button
                    type="submit"
                    size="icon-lg"
                    variant="default"
                    aria-label="Create new note"
                  >
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
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </Button>
                </Form>
                <SidebarToggle />
              </div>
            </div>

            {error && (
              <div
                className="m-4 shrink-0 rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Note List */}
            <nav className="min-h-0 flex-1 overflow-y-auto p-2">
              {notes.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    No notes yet.
                  </p>
                  <Form method="post" action="/notes">
                    <Button type="submit" variant="default">
                      Create your first note
                    </Button>
                  </Form>
                </div>
              ) : (
                <ul className="space-y-1">
                  {notes.map((note: Note) => {
                    const isActive = noteId === note.id;
                    const noteLabel = note.title || 'Untitled Note';
                    return (
                      <li key={note.id}>
                        <div
                          className={cn(
                            'flex items-center gap-0 rounded-md transition-colors',
                            isActive
                              ? 'bg-muted'
                              : 'text-foreground hover:bg-muted/60',
                          )}
                        >
                          <NavLink
                            to={`/notes/${note.id}`}
                            className={cn(
                              'min-w-0 flex-1 px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'font-medium text-foreground'
                                : 'text-foreground',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <div className="font-medium">{noteLabel}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {new Date(note.updated_at).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                },
                              )}
                            </div>
                          </NavLink>
                          <Form
                            method="post"
                            action={`/notes/${note.id}`}
                            className="shrink-0 pr-1"
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  'Are you sure you want to delete this note?',
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <SimpleTooltip label="Delete note" side="left">
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-destructive"
                                aria-label={`Delete note: ${noteLabel}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="h-4 w-4"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                  />
                                </svg>
                              </Button>
                            </SimpleTooltip>
                          </Form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>

            {user ? (
              <footer className="mt-auto shrink-0 border-t border-border/40 p-3">
                <div className="flex flex-col gap-3">
                  <NavLink
                    to="/notes/graph"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )
                    }
                  >
                    <span className="inline-flex shrink-0" aria-hidden>
                      <HugeiconsIcon icon={Flowchart01Icon} size={16} />
                    </span>
                    Note Graph
                  </NavLink>
                  <NavLink
                    to="/notes/settings"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )
                    }
                  >
                    <span className="inline-flex shrink-0" aria-hidden>
                      <HugeiconsIcon icon={Settings01Icon} size={16} />
                    </span>
                    Settings
                  </NavLink>
                </div>
              </footer>
            ) : null}
          </TooltipProvider>
        </aside>

        <main
          ref={registerScrollRoot}
          className={cn(
            'min-h-0 flex-1 overflow-auto',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            notesChrome,
            // Stable top inset so sidebar toggle does not shift scroll layout.
            isElectron
              ? 'pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))]'
              : 'pt-16',
          )}
        >
          <Outlet />
        </main>
      </div>
    </>
  );
}
