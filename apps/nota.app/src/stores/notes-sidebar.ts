import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotesSidebarState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Folders the user has collapsed; absence from this list = expanded. */
  collapsedFolderIds: string[];
  toggleFolderCollapsed: (folderId: string) => void;
  /** Ensures a folder is expanded (e.g. when opening a note inside it). */
  expandFolder: (folderId: string) => void;
  /** Remove ids for deleted or unknown folders from persisted storage. */
  pruneCollapsedFolderIds: (validFolderIds: Iterable<string>) => void;
}

/** Exposed for tests: must stay aligned with `persist` `partialize` (reload safety). */
export function partializeNotesSidebarForStorage(
  state: NotesSidebarState,
): Pick<NotesSidebarState, 'open' | 'collapsedFolderIds'> {
  return {
    open: state.open,
    collapsedFolderIds: state.collapsedFolderIds,
  };
}

export const useNotesSidebarStore = create<NotesSidebarState>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => set({ open }),
      toggle: () => set((s) => ({ open: !s.open })),

      collapsedFolderIds: [],
      toggleFolderCollapsed: (folderId) =>
        set((s) => {
          const has = s.collapsedFolderIds.includes(folderId);
          return {
            collapsedFolderIds: has
              ? s.collapsedFolderIds.filter((id) => id !== folderId)
              : [...s.collapsedFolderIds, folderId],
          };
        }),
      expandFolder: (folderId) =>
        set((s) => ({
          collapsedFolderIds: s.collapsedFolderIds.filter(
            (id) => id !== folderId,
          ),
        })),
      pruneCollapsedFolderIds: (validFolderIds) => {
        const valid = new Set(validFolderIds);
        set((s) => ({
          collapsedFolderIds: s.collapsedFolderIds.filter((id) => valid.has(id)),
        }));
      },
    }),
    {
      name: 'nota-notes-sidebar',
      partialize: (state) => partializeNotesSidebarForStorage(state),
    },
  ),
);
