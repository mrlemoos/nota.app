import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type JSX,
} from 'react';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { NotaButton } from '@nota.app/web-design/button';
import {
  NotaTooltip,
  NotaTooltipPopup,
  NotaTooltipPortal,
  NotaTooltipPositioner,
  NotaTooltipTrigger,
} from '@nota.app/web-design/tooltip';
import { cn } from '@/lib/utils';
import type { Folder, Note, UserPreferences } from '~/types/database.types';
import type { NotesShellPanel } from '../lib/app-navigation';
import { noteHashHref } from './note-detail-panel';
import { clientCreateNote } from '../lib/create-note-client';
import { clientDeleteNoteById } from '../lib/delete-note-client';
import { clientMoveNoteToFolder } from '../lib/move-note-folder-client';
import {
  NOTA_RENAME_FOLDER_REQUEST_EVENT,
  type RenameFolderRequestDetail,
} from '../lib/folder-rename-request';
import { clientRenameFolder } from '../lib/rename-folder-client';
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
  patchNoteInList: (id: string, patch: Partial<Note>) => void;
  patchFolderInList: (id: string, patch: Partial<Folder>) => void;
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
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
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
    draggedNoteId,
    setDraggedNoteId,
    setDropTargetId,
  } = options;
  const noteLabel = note.title || 'Untitled Note';

  const noteIsDragged = draggedNoteId === note.id;

  return (
    <li className="list-none">
      <div
        className={cn(
          'flex transform-gpu items-center gap-0 rounded-md transition-[transform,colors,opacity] duration-300 ease-in-out hover:scale-[1.01]',
          isActive ? 'bg-muted' : 'text-foreground hover:bg-muted/60',
          noteIsDragged && 'opacity-60',
        )}
        draggable
        onDragStart={(event: DragEvent<HTMLDivElement>) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', note.id);
          setDraggedNoteId(note.id);
          setDropTargetId(null);
        }}
        onDragEnd={() => {
          setDraggedNoteId(null);
          setDropTargetId(null);
        }}
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
          <NotaTooltip>
            <NotaTooltipTrigger
              delay={750}
              render={
                <div className="min-w-0 truncate font-medium">{noteLabel}</div>
              }
            />
            <NotaTooltipPortal>
              <NotaTooltipPositioner side="top" sideOffset={6}>
                <NotaTooltipPopup>{noteLabel}</NotaTooltipPopup>
              </NotaTooltipPositioner>
            </NotaTooltipPortal>
          </NotaTooltip>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {new Date(note.updated_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </a>
        <div className="shrink-0 pr-1">
          <NotaTooltip>
            <NotaTooltipTrigger
              render={
                <NotaButton
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
                </NotaButton>
              }
            />
            <NotaTooltipPortal>
              <NotaTooltipPositioner side="left" sideOffset={6}>
                <NotaTooltipPopup>Delete note</NotaTooltipPopup>
              </NotaTooltipPositioner>
            </NotaTooltipPortal>
          </NotaTooltip>
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
  patchNoteInList,
  patchFolderInList,
  removeNoteFromList,
  removeFolderFromList,
  refreshNotesList,
}: NotesSidebarListProps): JSX.Element {
  const uid = userId ?? '';
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
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
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderRenameDraft, setFolderRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const validFolderIdList = useMemo(
    () => folders.map((f) => f.id),
    [folders],
  );
  useEffect(() => {
    pruneCollapsedFolderIds(validFolderIdList);
  }, [pruneCollapsedFolderIds, validFolderIdList]);

  useEffect(() => {
    if (!renamingFolderId || !renameInputRef.current) {
      return;
    }
    const input = renameInputRef.current;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [renamingFolderId]);

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

  const clearDragState = useCallback(() => {
    setDraggedNoteId(null);
    setDropTargetId(null);
  }, []);

  const moveDraggedNoteToFolder = useCallback(
    async (targetFolderId: string | null): Promise<void> => {
      if (!draggedNoteId) {
        return;
      }

      const note = notes.find((value) => value.id === draggedNoteId);
      if (!note) {
        clearDragState();
        return;
      }

      const previousFolderId = note.folder_id ?? null;
      if (previousFolderId === targetFolderId) {
        clearDragState();
        return;
      }

      patchNoteInList(note.id, { folder_id: targetFolderId });
      clearDragState();

      await clientMoveNoteToFolder({
        noteId: note.id,
        targetFolderId,
        previousFolderId,
        userId: uid,
        notaProEntitled,
        userPreferences,
        patchNoteInList,
        removeFolderFromList,
        refreshNotesList,
      });
    },
    [
      clearDragState,
      draggedNoteId,
      notes,
      notaProEntitled,
      patchNoteInList,
      refreshNotesList,
      removeFolderFromList,
      uid,
      userPreferences,
    ],
  );

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

  const startRenamingFolder = useCallback((folder: Folder): void => {
    expandFolder(folder.id);
    setRenamingFolderId(folder.id);
    setFolderRenameDraft(folder.name);
  }, [expandFolder]);

  const stopRenamingFolder = useCallback((): void => {
    setRenamingFolderId(null);
    setFolderRenameDraft('');
  }, []);

  const commitFolderRename = useCallback((folder: Folder): void => {
    const nextName = folderRenameDraft.trim();
    const previousName = folder.name;
    stopRenamingFolder();
    if (!nextName || nextName === previousName) {
      return;
    }
    void clientRenameFolder({
      folderId: folder.id,
      previousName,
      nextName,
      userId: uid,
      notaProEntitled,
      patchFolderInList,
    });
  }, [folderRenameDraft, notaProEntitled, patchFolderInList, stopRenamingFolder, uid]);

  useEffect(() => {
    const onRenameRequest = (event: Event): void => {
      const customEvent = event as CustomEvent<RenameFolderRequestDetail>;
      const folderId = customEvent.detail?.folderId;
      if (!folderId) {
        return;
      }
      const folder = folders.find((value) => value.id === folderId);
      if (!folder) {
        return;
      }
      startRenamingFolder(folder);
    };

    window.addEventListener(NOTA_RENAME_FOLDER_REQUEST_EVENT, onRenameRequest);
    return () => {
      window.removeEventListener(
        NOTA_RENAME_FOLDER_REQUEST_EVENT,
        onRenameRequest,
      );
    };
  }, [folders, startRenamingFolder]);

  if (vaultEmpty) {
    return (
      <div className="p-4 text-center">
        <p className="mb-3 text-sm text-muted-foreground">No notes yet.</p>
        <NotaButton type="button" variant="default" onClick={onCreateNote}>
          Create your first note
        </NotaButton>
      </div>
    );
  }

  return (
    <>
      <ul className="m-0 list-none space-y-1 p-0">
        {sections.map(({ folder, notes: fn }) => {
          const folderContentId = `sidebar-folder-${folder.id}`;
          const isCollapsed = collapsedFolderIds.includes(folder.id);
          const isDropTarget = dropTargetId === folder.id;
          return (
            <li key={folder.id} className="list-none">
              <div
                className={cn(
                  'flex items-center gap-1 rounded-md py-1 pr-1.5 pl-0.5 text-muted-foreground transition-colors duration-300 ease-in-out',
                  isDropTarget && 'bg-muted/70 text-foreground',
                )}
                onDragEnter={(event) => {
                  if (!draggedNoteId) {
                    return;
                  }
                  event.preventDefault();
                  setDropTargetId(folder.id);
                }}
                onDragOver={(event) => {
                  if (!draggedNoteId) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDropTargetId(folder.id);
                }}
                onDragLeave={(event) => {
                  if (
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  ) {
                    return;
                  }
                  setDropTargetId((current) =>
                    current === folder.id ? null : current,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void moveDraggedNoteToFolder(folder.id);
                }}
              >
                <NotaButton
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
                </NotaButton>
                <button
                  type="button"
                  className="flex items-center gap-0.5 flex-1 min-w-0 text-left"
                  onClick={() => {
                    toggleFolderCollapsed(folder.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'F2') {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    startRenamingFolder(folder);
                  }}
                >
                  {renamingFolderId === folder.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={folderRenameDraft}
                      onChange={(event) => {
                        setFolderRenameDraft(event.target.value);
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitFolderRename(folder);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          stopRenamingFolder();
                        }
                      }}
                      onBlur={() => {
                        commitFolderRename(folder);
                      }}
                      className="min-w-0 flex-1 rounded border border-input bg-background px-1 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={`Rename folder ${folder.name}`}
                    />
                  ) : (
                    <NotaTooltip>
                      <NotaTooltipTrigger
                        render={
                          <span
                            className="min-w-0 flex-1 cursor-text truncate font-medium text-foreground text-xs tracking-wide decoration-dotted underline-offset-2 hover:underline"
                            onDoubleClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              startRenamingFolder(folder);
                            }}
                          >
                            {folder.name}
                          </span>
                        }
                      />
                      <NotaTooltipPortal>
                        <NotaTooltipPositioner side="top" sideOffset={6}>
                          <NotaTooltipPopup>Double-click to rename</NotaTooltipPopup>
                        </NotaTooltipPositioner>
                      </NotaTooltipPortal>
                    </NotaTooltip>
                  )}
                </button>
                <NotaButton
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
                </NotaButton>
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
                        draggedNoteId={draggedNoteId}
                        setDraggedNoteId={setDraggedNoteId}
                        setDropTargetId={setDropTargetId}
                      />
                    ))}
                  </ul>
                )
              ) : null}
            </li>
          );
        })}

        <li
          className={cn(
            'list-none rounded-md transition-colors duration-300 ease-in-out',
            dropTargetId === 'root' && 'bg-muted/70',
          )}
          onDragEnter={(event) => {
            if (!draggedNoteId) {
              return;
            }
            event.preventDefault();
            setDropTargetId('root');
          }}
          onDragOver={(event) => {
            if (!draggedNoteId) {
              return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetId('root');
          }}
          onDragLeave={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.contains(event.relatedTarget)
            ) {
              return;
            }
            setDropTargetId((current) => (current === 'root' ? null : current));
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void moveDraggedNoteToFolder(null);
          }}
        >
          {rootNotes.length > 0 ? (
            <ul className="m-0 list-none space-y-0.5 p-0">
              {rootNotes.map((note) => (
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
                  draggedNoteId={draggedNoteId}
                  setDraggedNoteId={setDraggedNoteId}
                  setDropTargetId={setDropTargetId}
                />
              ))}
            </ul>
          ) : draggedNoteId ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Drop here to move to root.
            </p>
          ) : null}
        </li>
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
