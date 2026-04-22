import { useDeferredValue, useMemo, type JSX } from 'react';
import { buildNoteLinkGraph } from '../lib/note-link-graph';
import { notesToIdMap } from '../lib/notes-id-map';
import { cn } from '@/lib/utils';
import { useNotesDataVault } from '../context/notes-data-context';
import { useAppNavigationScreen } from '../hooks/use-app-navigation-screen';
import { noteHashHref } from './note-detail-panel';

export function NoteBacklinksPanel({ noteId }: { noteId: string }): JSX.Element {
  const { notes } = useNotesDataVault();
  const deferredNotes = useDeferredValue(notes);
  const screen = useAppNavigationScreen();

  const { backlinkIds, byId } = useMemo(() => {
    const { backlinks } = buildNoteLinkGraph(deferredNotes);
    const ids = [...(backlinks.get(noteId) ?? [])].sort();
    const map = notesToIdMap(deferredNotes);
    return { backlinkIds: ids, byId: map };
  }, [deferredNotes, noteId]);

  return (
    <section
      className="border-t border-border/40 pt-6"
      aria-labelledby="note-backlinks-heading"
    >
      <h2
        id="note-backlinks-heading"
        className="mb-3 text-sm font-medium text-foreground"
      >
        Backlinks
      </h2>
      {backlinkIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No other notes link here yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {backlinkIds.map((id) => {
            const note = byId.get(id);
            if (!note) return null;
            const label = note.title?.trim() ? note.title : 'Untitled Note';
            const isActive =
              screen.kind === 'notes' &&
              screen.panel === 'note' &&
              screen.noteId === id;
            return (
              <li key={id}>
                <a
                  href={noteHashHref(id)}
                  className={cn(
                    'block rounded-md px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
