import {
  useLoaderData,
  useRevalidator,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import { requireAuth } from '../lib/supabase/auth';
import { getNote, deleteNote } from '../models/notes';
import { listNoteAttachments } from '../models/note-attachments';
import { NoteEditor } from '../components/note-editor';
import type { Note } from '~/types/database.types';

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

export default function NoteDetail() {
  const { note: initialNote, attachments } = useLoaderData<typeof loader>();
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

  return (
    <div className="px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <NoteEditor
          note={note}
          attachments={attachments}
          onNoteUpdated={handleNoteUpdated}
        />
      </div>
    </div>
  );
}
