import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotesSidebarState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useNotesSidebarStore = create<NotesSidebarState>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => set({ open }),
      toggle: () => set((state) => ({ open: !state.open })),
    }),
    {
      name: 'nota-notes-sidebar',
      partialize: (state) => ({ open: state.open }),
    },
  ),
);
