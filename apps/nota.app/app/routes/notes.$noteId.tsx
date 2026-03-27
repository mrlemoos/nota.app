import {
  useLoaderData,
  useRevalidator,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type ClientLoaderFunctionArgs,
  type ClientActionFunctionArgs,
  useParams,
} from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import { requireAuth } from '../lib/supabase/auth';
import { getNote, deleteNote } from '../models/notes';
import { listNoteAttachments } from '../models/note-attachments';
import { NoteEditor } from '../components/note-editor';
import { NoteBacklinksPanel } from '../components/note-backlinks-panel';
import { cn } from '@/lib/utils';
import {
  noteSurfaceClassNames,
  parseNoteEditorSettings,
} from '../lib/note-editor-settings';
import type { Note, NoteAttachment } from '~/types/database.types';
import { getBrowserClient } from '../lib/supabase/browser';
import {
  drainNotesOutbox,
  getStoredNote,
  isLikelyOnline,
  markPendingDelete,
  mergeNoteWithLocal,
  putServerNoteIfNotDirty,
  storedNoteToListRow,
} from '../lib/notes-offline';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase, headers } = await requireAuth(request);
  const { noteId } = params;

  if (!noteId) {
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: '/notes' },
    });
  }

  const note = await getNote(supabase, noteId);

  if (!note) {
    throw new Response('Note not found', { status: 404 });
  }

  const attachments = await listNoteAttachments(supabase, noteId);

  return { note, attachments, headers };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase, headers } = await requireAuth(request);
  const { noteId } = params;

  if (!noteId) {
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: '/notes' },
    });
  }

  await deleteNote(supabase, noteId);

  return new Response(null, {
    status: 302,
    headers: { ...headers, Location: '/notes' },
  });
}

export async function noteDetailClientLoader({
  serverLoader,
  params,
}: ClientLoaderFunctionArgs) {
  const { noteId } = params;

  let client: ReturnType<typeof getBrowserClient>;
  try {
    client = getBrowserClient();
  } catch {
    try {
      return await serverLoader();
    } catch {
      throw new Response('Note not found', { status: 404 });
    }
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  const userId = session?.user?.id;

  if (!noteId) {
    try {
      return await serverLoader();
    } catch {
      throw redirect('/notes');
    }
  }

  if (!userId) {
    try {
      return await serverLoader();
    } catch {
      throw new Response('Note not found', { status: 404 });
    }
  }

  try {
    const data = await serverLoader<typeof loader>();
    await putServerNoteIfNotDirty(userId, data.note);
    const local = await getStoredNote(userId, noteId);
    const note = mergeNoteWithLocal(data.note, local);
    return { ...data, note };
  } catch (e) {
    const local = await getStoredNote(userId, noteId);
    if (local && !local.pending_delete && local.pending_create) {
      const note = storedNoteToListRow(local);
      return {
        note,
        attachments: [] as NoteAttachment[],
        headers: new Headers(),
      };
    }
    if (isLikelyOnline()) {
      throw e;
    }
    if (!local || local.pending_delete) {
      throw new Response('Note not found', { status: 404 });
    }
    const note = storedNoteToListRow(local);
    return {
      note,
      attachments: [] as NoteAttachment[],
      headers: new Headers(),
    };
  }
}

export const clientLoader = Object.assign(noteDetailClientLoader, {
  hydrate: true,
});

export type NoteDetailLoaderData = Awaited<
  ReturnType<typeof noteDetailClientLoader>
>;

async function noteDetailClientAction({
  request,
  serverAction,
  params,
}: ClientActionFunctionArgs) {
  if (request.method !== 'POST') {
    return serverAction();
  }

  const { noteId } = params;

  const runLocalDelete = async () => {
    const c = getBrowserClient();
    const {
      data: { session },
    } = await c.auth.getSession();
    if (!session?.user || !noteId) {
      throw redirect('/login');
    }
    const stored = await getStoredNote(session.user.id, noteId);
    await markPendingDelete(session.user.id, noteId, !stored?.pending_create);
    void drainNotesOutbox(session.user.id);
    throw redirect('/notes');
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return runLocalDelete();
  }

  try {
    return await serverAction();
  } catch {
    return runLocalDelete();
  }
}

export const clientAction = noteDetailClientAction;

export default function NoteDetail() {
  const { noteId } = useParams();
  const { note: initialNote, attachments } =
    useLoaderData() as NoteDetailLoaderData;
  const { revalidate } = useRevalidator();
  const [note, setNote] = useState<Note>(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote.id]);

  const handleNoteUpdated = useCallback(
    (updatedNote: Note) => {
      setNote(updatedNote);
      revalidate();
    },
    [revalidate],
  );

  const layout = noteSurfaceClassNames(
    parseNoteEditorSettings(note.editor_settings),
  );

  return (
    <div className="px-4 py-8">
      <div
        className={cn(
          'mx-auto w-full transition-[max-width] duration-300 ease-in-out',
          layout.maxWidthClass,
        )}
      >
        <NoteEditor
          note={note}
          attachments={attachments}
          titleFontClassName={layout.titleFontClass}
          bodyFontClassName={layout.bodyFontClass}
          onNoteUpdated={handleNoteUpdated}
        />
        {noteId ? (
          <div className={layout.bodyFontClass}>
            <NoteBacklinksPanel noteId={noteId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
