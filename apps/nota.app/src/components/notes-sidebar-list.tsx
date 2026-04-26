import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Folder01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Folder, Note, UserPreferences } from '~/types/database.types';
import type { NotesShellPanel } from '../lib/app-navigation';
import { noteHashHref } from './note-detail-panel';
import { clientCreateNote } from '../lib/create-note-client';
import { clientDeleteNoteById } from '../lib/delete-note-client';
import { useNotesSidebarStore } from '../stores/notes-sidebar';
import { buildSidebarFolderSections } from '../lib/note-sidebar-groups';
import { FolderDeleteDialog } from './folder-delete-dialog';

type NotesSidebarListProps = {
  notes: Note[];
  folders: Folder[];
  panel: NotesShellPanel;
  routeNoteId: string | null;
  userId: string | undefined;
  notaProEntitled: boolean;
  userPreferences: UserPreferences | null;
  insertNoteAtFront: (n: Note) => void;
  removeNoteFromList: (id: string) => void;
  removeFolderFromList: (id: string) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
};

function NoteRow(options: {
  note: Note;
  isActive: boolean;
  /** Nested under a folder row in the tree. */
  nested?: boolean;
  userId: string;
  notaProEntitled: boolean;
  userPreferences: UserPreferences | null;
  removeNoteFromList: (id: string) => void;
  removeFolderFromList: (id: string) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
}): JSX.Element {
  const {
    note,
    isActive,
    nested = false,
    userId,
    notaProEntitled,
    userPreferences,
    removeNoteFromList,
    removeFolderFromList,
    refreshNotesList,
  } = options;
  const noteLabel = note.title || 'Untitled Note';

  return (
    <li className="list-none">
      <div
        className={cn(
          'flex transform-gpu items-center gap-0 rounded-md transition-[transform,colors] duration-300 ease-in-out hover:scale-[1.01]',
          isActive ? 'bg-muted' : 'text-foreground hover:bg-muted/60',
        )}
      >
        <a
          href={noteHashHref(note.id)}
          className={cn(
            'min-w-0 flex-1 py-2 text-sm transition-colors duration-300 ease-in-out',
            nested ? 'pl-2 pr-1' : 'px-3',
            isActive ? 'font-medium text-foreground' : 'text-foreground',
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          <SimpleTooltip label={noteLabel} side="top" delay={750}>
            <div className="min-w-0 truncate font-medium">{noteLabel}</div>
          </SimpleTooltip>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {new Date(note.updated_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </a>
        <div className="shrink-0 pr-1">
          <SimpleTooltip label="Delete note" side="left">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-destructive"
              aria-label={`Delete note: ${noteLabel}`}
              onClick={() => {
                if (
                  !window.confirm(
                    'Are you sure you want to delete this note?',
                  )
                ) {
                  return;
                }
                void clientDeleteNoteById(note.id, {
                  userId,
                  removeNoteFromList,
                  removeFolderFromList,
                  refreshNotesList,
                  notaProEntitled,
                  noteFolderId: note.folder_id ?? null,
                  userPreferences,
                });
              }}
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
        </div>
      </div>
    </li>
  );
}

export function NotesSidebarList({
  notes,
  folders,
  panel,
  routeNoteId,
  userId,
  notaProEntitled,
  userPreferences,
  insertNoteAtFront,
  removeNoteFromList,
  removeFolderFromList,
  refreshNotesList,
}: NotesSidebarListProps): JSX.Element {
  const uid = userId ?? '';
  const { sections, rootNotes } = useMemo(
    () => buildSidebarFolderSections(notes, folders),
    [notes, folders],
  );

  const expandFolder = useNotesSidebarStore((s) => s.expandFolder);
  const collapsedFolderIds = useNotesSidebarStore(
    (s) => s.collapsedFolderIds,
  );
  const pruneCollapsedFolderIds = useNotesSidebarStore(
    (s) => s.pruneCollapsedFolderIds,
  );
  const toggleFolderCollapsed = useNotesSidebarStore(
    (s) => s.toggleFolderCollapsed,
  );

  const [folderDeleteTarget, setFolderDeleteTarget] = useState<Folder | null>(
    null,
  );

  const validFolderIdList = useMemo(
    () => folders.map((f) => f.id),
    [folders],
  );
  useEffect(() => {
    pruneCollapsedFolderIds(validFolderIdList);
  }, [pruneCollapsedFolderIds, validFolderIdList]);

  // Expand the folder when the user opens a note inside a collapsed section (e.g. palette, graph),
  // not when they manually collapse with the same note open—deps omit collapsed state on purpose.
  useEffect(() => {
    if (panel !== 'note' || !routeNoteId) {
      return;
    }
    const note = notes.find((n) => n.id === routeNoteId);
    const folderId = note?.folder_id ?? null;
    if (!folderId) {
      return;
    }
    if (useNotesSidebarStore.getState().collapsedFolderIds.includes(folderId)) {
      expandFolder(folderId);
    }
  }, [panel, routeNoteId, notes, expandFolder]);

  const vaultEmpty = notes.length === 0 && folders.length === 0;

  const onCreateNote = (): void => {
    if (!uid) {
      return;
    }
    void clientCreateNote({
      userId: uid,
      insertNoteAtFront,
      refreshNotesList,
      notaProEntitled,
      notes,
    });
  };

  if (vaultEmpty) {
    return (
      <div className="p-4 text-center">
        <p className="mb-3 text-sm text-muted-foreground">No notes yet.</p>
        <Button type="button" variant="default" onClick={onCreateNote}>
          Create your first note
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="m-0 list-none space-y-1 p-0">
        {sections.map(({ folder, notes: fn }) => {
          const folderContentId = `sidebar-folder-${folder.id}`;
          const isCollapsed = collapsedFolderIds.includes(folder.id);
          return (
            <li key={folder.id} className="list-none">
              <div className="flex items-center gap-0.5 rounded-md py-1 pr-1.5 pl-0.5 text-muted-foreground transition-colors duration-300 ease-in-out">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 bg-transparent text-muted-foreground"
                  aria-label={
                    isCollapsed
                      ? `Expand folder ${folder.name}`
                      : `Collapse folder ${folder.name}`
                  }
                  aria-expanded={!isCollapsed}
                  aria-controls={
                    isCollapsed ? undefined : folderContentId
                  }
                  onClick={() => {
                    toggleFolderCollapsed(folder.id);
                  }}
                >
                  <HugeiconsIcon
                    icon={isCollapsed ? ArrowRight01Icon : ArrowDown01Icon}
                    size={14}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </Button>
                <span
                  className="inline-flex shrink-0 pl-0.5 text-muted-foreground/80"
                  aria-hidden
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground text-xs tracking-wide">
                  {folder.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete folder ${folder.name}`}
                  onClick={() => {
                    setFolderDeleteTarget(folder);
                  }}
                >
                  <span className="sr-only">Delete folder</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </Button>
              </div>
              {!isCollapsed ? (
                fn.length === 0 ? (
                  <p
                    id={folderContentId}
                    className="ml-5 border-border/35 border-l py-1 pl-2.5 text-muted-foreground text-xs"
                  >
                    No notes in this folder.
                  </p>
                ) : (
                  <ul
                    id={folderContentId}
                    className="m-0 ml-2.5 list-none space-y-0.5 border-border/35 border-l py-0.5 pl-2"
                  >
                    {fn.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        nested
                        isActive={panel === 'note' && routeNoteId === note.id}
                        userId={uid}
                        notaProEntitled={notaProEntitled}
                        userPreferences={userPreferences}
                        removeNoteFromList={removeNoteFromList}
                        removeFolderFromList={removeFolderFromList}
                        refreshNotesList={refreshNotesList}
                      />
                    ))}
                  </ul>
                )
              ) : null}
            </li>
          );
        })}

        {rootNotes.length > 0
          ? rootNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                isActive={panel === 'note' && routeNoteId === note.id}
                userId={uid}
                notaProEntitled={notaProEntitled}
                userPreferences={userPreferences}
                removeNoteFromList={removeNoteFromList}
                removeFolderFromList={removeFolderFromList}
                refreshNotesList={refreshNotesList}
              />
            ))
          : null}
      </ul>

      <FolderDeleteDialog
        folder={folderDeleteTarget}
        allFolders={folders}
        open={folderDeleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setFolderDeleteTarget(null);
          }
        }}
        removeNoteFromList={removeNoteFromList}
        removeFolderFromList={removeFolderFromList}
        refreshNotesList={refreshNotesList}
      />
    </>
  );
}
