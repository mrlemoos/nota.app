import type { Json, Note } from '~/types/database.types';
import { getBrowserClient } from './supabase/browser';
import {
  getStoredNote,
  mergeNoteWithLocal,
  saveLocalNoteDraft,
  storedNoteToListRow,
} from './notes-offline';
import { getNote, updateNote } from '../models/notes';
import {
  noteAudioContentNode,
  studyNotesBlocksToTiptapNodes,
  studyNotesResultToTiptapDoc,
  type AudioNoteStudyResult,
} from './audio-note-blocks-to-doc';
import { formatStudyNoteTitle } from './study-note-title';

async function resolveNoteCreatedAtIso(
  noteId: string,
  userId: string,
): Promise<string> {
  const client = getBrowserClient();
  const row = await getNote(client, noteId);
  if (row?.created_at) {
    return row.created_at;
  }
  const local = await getStoredNote(userId, noteId);
  if (local?.created_at) {
    return local.created_at;
  }
  return new Date().toISOString();
}

function docContentNodes(content: Json): Record<string, unknown>[] {
  if (!content || typeof content !== 'object') {
    return [];
  }
  const doc = content as { type?: string; content?: unknown[] };
  if (doc.type === 'doc' && Array.isArray(doc.content)) {
    return doc.content as Record<string, unknown>[];
  }
  return [];
}

/**
 * Pure merge used by {@link applyAudioNoteStudyResult} (unit-tested).
 */
export function buildAudioNoteApplyPatch(options: {
  mode: 'replace' | 'append';
  existingTitle: string;
  existingContent: Json;
  noteCreatedAtIso: string;
  result: AudioNoteStudyResult;
  recording?: { attachmentId: string; filename: string };
}): { title: string; content: Json } {
  if (options.mode === 'replace') {
    return {
      title: formatStudyNoteTitle(
        options.noteCreatedAtIso,
        options.result.title,
      ),
      content: studyNotesResultToTiptapDoc(options.result, {
        recording: options.recording,
      }),
    };
  }

  const existing = docContentNodes(options.existingContent);
  const suffix: Record<string, unknown>[] = [];
  if (options.recording?.attachmentId) {
    suffix.push(noteAudioContentNode(options.recording));
  }
  suffix.push(...studyNotesBlocksToTiptapNodes(options.result));
  const merged = [...existing, ...suffix];
  return {
    title: options.existingTitle,
    content: {
      type: 'doc',
      content:
        merged.length > 0
          ? merged
          : [{ type: 'paragraph', content: [] }],
    } as Json,
  };
}

async function resolveMergedNoteRow(
  noteId: string,
  userId: string,
): Promise<Note | null> {
  const client = getBrowserClient();
  const row = await getNote(client, noteId);
  const local = await getStoredNote(userId, noteId);
  if (row) {
    return mergeNoteWithLocal(row, local);
  }
  if (local && !local.pending_delete) {
    return storedNoteToListRow(local);
  }
  return null;
}

export async function applyAudioNoteStudyResult(options: {
  noteId: string;
  userId: string;
  result: AudioNoteStudyResult;
  /** When upload succeeded; omitted if upload failed or skipped. */
  recording?: { attachmentId: string; filename: string };
  patchNoteInList: (id: string, patch: Partial<Note>) => void;
  refreshNotesList: (o?: { silent?: boolean }) => Promise<void>;
  /** Default `replace` (new study note). Use `append` for an existing note body + title. */
  mode?: 'replace' | 'append';
}): Promise<void> {
  const createdAtIso = await resolveNoteCreatedAtIso(
    options.noteId,
    options.userId,
  );
  const mode = options.mode ?? 'replace';
  const emptyDoc = { type: 'doc', content: [] } as Json;

  let patch: { title: string; content: Json };
  if (mode === 'append') {
    const merged = await resolveMergedNoteRow(options.noteId, options.userId);
    patch = buildAudioNoteApplyPatch({
      mode: 'append',
      existingTitle: merged?.title?.trim() ? merged.title : 'Untitled Note',
      existingContent: merged?.content ?? emptyDoc,
      noteCreatedAtIso: createdAtIso,
      result: options.result,
      recording: options.recording,
    });
  } else {
    patch = buildAudioNoteApplyPatch({
      mode: 'replace',
      existingTitle: '',
      existingContent: emptyDoc,
      noteCreatedAtIso: createdAtIso,
      result: options.result,
      recording: options.recording,
    });
  }

  const { title, content } = patch;
  const client = getBrowserClient();
  const row = await updateNote(client, options.noteId, {
    title,
    content,
  });
  options.patchNoteInList(options.noteId, row);
  await saveLocalNoteDraft(options.userId, {
    id: options.noteId,
    title,
    content,
  });
  await options.refreshNotesList({ silent: true });
}
