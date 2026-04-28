import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
  type ReactNode,
  type JSX,
} from 'react';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Folder01Icon,
  FolderAddIcon,
  Home01Icon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createTranslator } from '@nota.app/i18n';
import { NotaButton } from '@nota.app/web-design/button';
import {
  NotaContextMenu,
  NotaContextMenuItem,
  NotaContextMenuPortal,
  NotaContextMenuPositioner,
  NotaContextMenuPopup,
  NotaContextMenuSeparator,
  NotaContextMenuSubmenuRoot,
  NotaContextMenuSubmenuTrigger,
  NotaContextMenuTrigger,
  NotaContextMenuViewport,
} from '@nota.app/web-design/context-menu';
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
import { useNotaPreferencesStore } from '../stores/nota-preferences';
import { buildSidebarFolderSections } from '../lib/note-sidebar-groups';
import { FolderCreateDialog } from './folder-create-dialog';
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
  insertFolderSorted: (f: Folder) => void;
  patchNoteInList: (id: string, patch: Partial<Note>) => void;
  patchFolderInList: (id: string, patch: Partial<Folder>) => void;
  removeNoteFromList: (id: string) => void;
  removeFolderFromList: (id: string) => void;
  refreshNotesList: (options?: { silent?: boolean }) => Promise<void>;
};

function NoteRow(options: {
  note: Note;
  folders: Folder[];
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
  onMoveNoteToFolder: (
    noteId: string,
    targetFolderId: string | null,
    options?: { clearDragStateAfter?: boolean },
  ) => Promise<void>;
  onMoveNoteToNewFolder: (note: Note) => void;
}): JSX.Element {
  const locale = useNotaPreferencesStore((s) => s.locale);
  const { t } = createTranslator(locale);
  const {
    note,
    folders,
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
    onMoveNoteToFolder,
    onMoveNoteToNewFolder,
  } = options;
  const noteLabel = note.title || 'Untitled Note';

  const noteIsDragged = draggedNoteId === note.id;

  return (
    <li className="list-none">
      <NotaContextMenu>
        <NotaContextMenuTrigger
          render={
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
                      <div className="min-w-0 truncate font-medium">
                        {noteLabel}
                      </div>
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
            </div>
          }
        />
        <NotaContextMenuPortal>
          <NotaContextMenuPositioner side="right" align="start" sideOffset={4}>
            <NotaContextMenuPopup>
              <NotaContextMenuViewport>
                <NotaContextMenuSubmenuRoot>
                  <NotaContextMenuSubmenuTrigger label="Move to">
                    <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                      <HugeiconsIcon
                        icon={Folder01Icon}
                        size={16}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="min-w-0 flex-1">Move to</span>
                    </span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                  </NotaContextMenuSubmenuTrigger>
                  <NotaContextMenuPortal>
                    <NotaContextMenuPositioner side="right" align="start" sideOffset={4}>
                      <NotaContextMenuPopup>
                        <NotaContextMenuViewport>
                          <NotaContextMenuItem
                            label="Root"
                            onClick={() => {
                              void onMoveNoteToFolder(note.id, null);
                            }}
                          >
                            <HugeiconsIcon
                              icon={Home01Icon}
                              size={16}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span>Root</span>
                          </NotaContextMenuItem>
                          {folders.map((folder) => (
                            <NotaContextMenuItem
                              key={folder.id}
                              label={folder.name}
                              onClick={() => {
                                void onMoveNoteToFolder(note.id, folder.id);
                              }}
                            >
                              <HugeiconsIcon
                                icon={Folder01Icon}
                                size={16}
                                className="shrink-0 text-muted-foreground"
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {folder.name}
                              </span>
                            </NotaContextMenuItem>
                          ))}
                          <NotaContextMenuSeparator />
                          <NotaContextMenuItem
                            label={t('New folder')}
                            onClick={() => {
                              onMoveNoteToNewFolder(note);
                            }}
                          >
                            <HugeiconsIcon
                              icon={FolderAddIcon}
                              size={16}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span>{t('New folder')}</span>
                          </NotaContextMenuItem>
                        </NotaContextMenuViewport>
                      </NotaContextMenuPopup>
                    </NotaContextMenuPositioner>
                  </NotaContextMenuPortal>
                </NotaContextMenuSubmenuRoot>
                <NotaContextMenuSeparator />
                <NotaContextMenuItem
                  label={`Delete note: ${noteLabel}`}
                  onClick={() => {
                    if (
                      !window.confirm('Are you sure you want to delete this note?')
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
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={16}
                    className="shrink-0 text-destructive"
                  />
                  <span className="text-destructive">Delete note</span>
                </NotaContextMenuItem>
              </NotaContextMenuViewport>
            </NotaContextMenuPopup>
          </NotaContextMenuPositioner>
        </NotaContextMenuPortal>
      </NotaContextMenu>
    </li>
  );
}

function FolderRow(options: {
  folder: Folder;
  folderContentId: string;
  isCollapsed: boolean;
  isDropTarget: boolean;
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
  toggleFolderCollapsed: (folderId: string) => void;
  renamingFolderId: string | null;
  folderRenameDraft: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  setFolderRenameDraft: (value: string) => void;
  commitFolderRename: (folder: Folder) => void;
  stopRenamingFolder: () => void;
  startRenamingFolder: (folder: Folder) => void;
  setFolderDeleteTarget: (folder: Folder) => void;
  moveDraggedNoteToFolder: (folderId: string) => Promise<void>;
  children: ReactNode;
}): JSX.Element {
  const {
    folder,
    folderContentId,
    isCollapsed,
    isDropTarget,
    draggedNoteId,
    setDraggedNoteId,
    setDropTargetId,
    toggleFolderCollapsed,
    renamingFolderId,
    folderRenameDraft,
    renameInputRef,
    setFolderRenameDraft,
    commitFolderRename,
    stopRenamingFolder,
    startRenamingFolder,
    setFolderDeleteTarget,
    moveDraggedNoteToFolder,
    children,
  } = options;

  return (
    <li className="list-none">
      <NotaContextMenu>
        <NotaContextMenuTrigger
          render={
            <div
              className={cn(
                'flex transform-gpu items-center gap-1 rounded-md py-1 pr-1.5 pl-0.5 text-muted-foreground transition-[background-color,box-shadow,transform,color] duration-200 ease-out',
                isDropTarget &&
                  'scale-[1.01] bg-muted/90 text-foreground ring-1 ring-border/50 shadow-sm',
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
                aria-controls={isCollapsed ? undefined : folderContentId}
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
                className="flex min-w-0 flex-1 items-center gap-0.5 text-left"
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
                        <NotaTooltipPopup>
                          Double-click to rename
                        </NotaTooltipPopup>
                      </NotaTooltipPositioner>
                    </NotaTooltipPortal>
                  </NotaTooltip>
                )}
              </button>
            </div>
          }
        />
        <NotaContextMenuPortal>
          <NotaContextMenuPositioner side="right" align="start" sideOffset={4}>
            <NotaContextMenuPopup>
              <NotaContextMenuViewport>
                <NotaContextMenuItem
                  label={`Rename folder ${folder.name}`}
                  onClick={() => {
                    startRenamingFolder(folder);
                  }}
                >
                  <HugeiconsIcon
                    icon={PencilEdit01Icon}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span>Rename</span>
                </NotaContextMenuItem>
                <NotaContextMenuItem
                  label={`Delete folder ${folder.name}`}
                  onClick={() => {
                    setFolderDeleteTarget(folder);
                  }}
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={16}
                    className="shrink-0 text-destructive"
                  />
                  <span className="text-destructive">Delete folder</span>
                </NotaContextMenuItem>
              </NotaContextMenuViewport>
            </NotaContextMenuPopup>
          </NotaContextMenuPositioner>
        </NotaContextMenuPortal>
      </NotaContextMenu>
      {children}
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
  insertFolderSorted,
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
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [pendingNewFolderNote, setPendingNewFolderNote] = useState<{
    noteId: string;
  } | null>(null);
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

  const moveNoteToFolder = useCallback(
    async (
      noteId: string,
      targetFolderId: string | null,
      options?: { clearDragStateAfter?: boolean },
    ): Promise<void> => {
      const note = notes.find((value) => value.id === noteId);
      if (!note) {
        if (options?.clearDragStateAfter) {
          clearDragState();
        }
        return;
      }

      const previousFolderId = note.folder_id ?? null;
      if (previousFolderId === targetFolderId) {
        if (options?.clearDragStateAfter) {
          clearDragState();
        }
        return;
      }

      patchNoteInList(note.id, { folder_id: targetFolderId });

      if (options?.clearDragStateAfter) {
        clearDragState();
      }

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
      notes,
      notaProEntitled,
      patchNoteInList,
      refreshNotesList,
      removeFolderFromList,
      uid,
      userPreferences,
    ],
  );

  const moveDraggedNoteToFolder = useCallback(
    async (targetFolderId: string | null): Promise<void> => {
      if (!draggedNoteId) {
        return;
      }
      await moveNoteToFolder(draggedNoteId, targetFolderId, {
        clearDragStateAfter: true,
      });
    },
    [draggedNoteId, moveNoteToFolder],
  );

  const startCreatingFolderForNote = useCallback((note: Note): void => {
    setPendingNewFolderNote({
      noteId: note.id,
    });
    setFolderCreateOpen(true);
  }, []);

  const handleNewFolderCreated = useCallback(
    async (folder: Folder): Promise<void> => {
      const pending = pendingNewFolderNote;
      setPendingNewFolderNote(null);
      if (!pending) {
        return;
      }
      await moveNoteToFolder(pending.noteId, folder.id);
    },
    [moveNoteToFolder, pendingNewFolderNote],
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
      <div className="p-4 text-center text-sm text-muted-foreground">
        ⌘K to start
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
            <FolderRow
              key={folder.id}
              folder={folder}
              folderContentId={folderContentId}
              isCollapsed={isCollapsed}
              isDropTarget={isDropTarget}
              draggedNoteId={draggedNoteId}
              setDraggedNoteId={setDraggedNoteId}
              setDropTargetId={setDropTargetId}
              toggleFolderCollapsed={toggleFolderCollapsed}
              renamingFolderId={renamingFolderId}
              folderRenameDraft={folderRenameDraft}
              renameInputRef={renameInputRef}
              setFolderRenameDraft={setFolderRenameDraft}
              commitFolderRename={commitFolderRename}
              stopRenamingFolder={stopRenamingFolder}
              startRenamingFolder={startRenamingFolder}
              setFolderDeleteTarget={(value) => {
                setFolderDeleteTarget(value);
              }}
              moveDraggedNoteToFolder={moveDraggedNoteToFolder}
            >
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
                        folders={folders}
                        onMoveNoteToFolder={moveNoteToFolder}
                        onMoveNoteToNewFolder={startCreatingFolderForNote}
                      />
                    ))}
                  </ul>
                )
              ) : null}
            </FolderRow>
          );
        })}

        <li
          className={cn(
            'list-none rounded-md transition-[background-color,box-shadow,transform] duration-200 ease-out',
            dropTargetId === 'root' &&
              'scale-[1.005] bg-muted/80 ring-1 ring-border/40 shadow-sm',
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
                  folders={folders}
                  onMoveNoteToFolder={moveNoteToFolder}
                  onMoveNoteToNewFolder={startCreatingFolderForNote}
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

      <FolderCreateDialog
        open={folderCreateOpen}
        onOpenChange={(next) => {
          setFolderCreateOpen(next);
          if (!next) {
            setPendingNewFolderNote(null);
          }
        }}
        userId={uid}
        insertFolderSorted={insertFolderSorted}
        refreshNotesList={refreshNotesList}
        onCreated={handleNewFolderCreated}
      />

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
