import { useEffect, useRef } from 'react';
import { useRootLoaderData } from '../context/session-context';
import { useNotesData } from '../context/notes-data-context';
import { clientCreateNote } from '../lib/create-note-client';
import { startStudyNotesFromRecording } from '../lib/audio-to-note-start';
import { createNoteFromMenubarClipboard } from '../lib/electron-clipboard-note';
import {
  dispatchMenubarMoveNoteRequest,
  dispatchMenubarNewFolderRequest,
} from '../lib/electron-menubar-events';
import {
  isNotaMenubarActionPayload,
  type NotaMenubarActionPayload,
} from '../lib/electron-menubar-payload';

/**
 * Subscribes to Electron menu IPC and runs the corresponding SPA flows.
 */
export function ElectronMenubarBridge(): null {
  const { user } = useRootLoaderData();
  const userId = user?.id ?? '';
  const {
    notes,
    notaProEntitled,
    refreshNotesList,
    insertNoteAtFront,
    patchNoteInList,
  } = useNotesData();

  const stableRef = useRef({
    userId,
    notaProEntitled,
    refreshNotesList,
    insertNoteAtFront,
    patchNoteInList,
    notes,
  });
  stableRef.current = {
    userId,
    notaProEntitled,
    refreshNotesList,
    insertNoteAtFront,
    patchNoteInList,
    notes,
  };

  useEffect(() => {
    const api = window.nota;
    if (typeof api?.subscribeMenubarActions !== 'function') {
      return;
    }
    return api.subscribeMenubarActions((payload: unknown) => {
      if (!isNotaMenubarActionPayload(payload)) {
        return;
      }
      const action: NotaMenubarActionPayload = payload;
      const s = stableRef.current;
      void (async () => {
        if (action.kind === 'create-note') {
          await clientCreateNote({
            userId: s.userId,
            insertNoteAtFront: s.insertNoteAtFront,
            refreshNotesList: s.refreshNotesList,
            notaProEntitled: s.notaProEntitled,
            notes: s.notes,
          });
          return;
        }
        if (action.kind === 'create-folder') {
          if (!s.notaProEntitled) {
            return;
          }
          dispatchMenubarNewFolderRequest();
          return;
        }
        if (action.kind === 'move-note') {
          if (!s.notaProEntitled) {
            return;
          }
          dispatchMenubarMoveNoteRequest();
          return;
        }
        if (action.kind === 'study-recording') {
          await startStudyNotesFromRecording({
            userId: s.userId,
            notaProEntitled: s.notaProEntitled,
            insertNoteAtFront: s.insertNoteAtFront,
            refreshNotesList: s.refreshNotesList,
          });
          return;
        }
        await createNoteFromMenubarClipboard({
          userId: s.userId,
          notaProEntitled: s.notaProEntitled,
          clipboard: action.clipboard,
          insertNoteAtFront: s.insertNoteAtFront,
          refreshNotesList: s.refreshNotesList,
          patchNoteInList: s.patchNoteInList,
          onError: (message) => {
            window.alert(message);
          },
        });
      })();
    });
  }, []);

  return null;
}
