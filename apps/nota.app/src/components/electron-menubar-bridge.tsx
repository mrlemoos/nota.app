import { useEffect, useRef } from 'react';
import { useRootLoaderData } from '../context/session-context';
import { useNotesData } from '../context/notes-data-context';
import { startStudyNotesFromRecording } from '../lib/audio-to-note-start';
import { createNoteFromMenubarClipboard } from '../lib/electron-clipboard-note';
import {
  isNotaMenubarActionPayload,
  type NotaMenubarActionPayload,
} from '../lib/electron-menubar-payload';

/**
 * Subscribes to Electron tray IPC and runs the corresponding SPA flows (clipboard note, study recording).
 */
export function ElectronMenubarBridge(): null {
  const { user } = useRootLoaderData();
  const userId = user?.id ?? '';
  const {
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
  });
  stableRef.current = {
    userId,
    notaProEntitled,
    refreshNotesList,
    insertNoteAtFront,
    patchNoteInList,
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
