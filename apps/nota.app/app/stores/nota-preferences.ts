import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '~/types/database.types';

interface NotaPreferencesState {
  openTodaysNoteShortcut: boolean;
  /** Local toggle not yet persisted to Supabase (or last attempt failed while offline). */
  preferencesPendingSync: boolean;
  lastServerUpdatedAt: string | null;
  /** Local calendar date (YYYY-MM-DD) → note id; device-local only. */
  dailyNoteIdByLocalDate: Record<string, string>;

  setOpenTodaysNoteShortcut: (value: boolean, options?: { pendingSync?: boolean }) => void;
  hydratePreferencesFromServer: (prefs: UserPreferences) => void;
  markPreferencesSynced: (prefs: UserPreferences) => void;
  setDailyNoteForLocalDate: (dateKey: string, noteId: string) => void;
  clearDailyNoteForLocalDate: (dateKey: string) => void;
}

export const useNotaPreferencesStore = create<NotaPreferencesState>()(
  persist(
    (set, get) => ({
      openTodaysNoteShortcut: false,
      preferencesPendingSync: false,
      lastServerUpdatedAt: null,
      dailyNoteIdByLocalDate: {},

      setOpenTodaysNoteShortcut: (value, options) =>
        set({
          openTodaysNoteShortcut: value,
          preferencesPendingSync:
            options?.pendingSync !== undefined ? options.pendingSync : true,
        }),

      hydratePreferencesFromServer: (prefs) => {
        if (get().preferencesPendingSync) {
          return;
        }
        set({
          openTodaysNoteShortcut: prefs.open_todays_note_shortcut,
          lastServerUpdatedAt: prefs.updated_at,
        });
      },

      markPreferencesSynced: (prefs) =>
        set({
          openTodaysNoteShortcut: prefs.open_todays_note_shortcut,
          preferencesPendingSync: false,
          lastServerUpdatedAt: prefs.updated_at,
        }),

      setDailyNoteForLocalDate: (dateKey, noteId) =>
        set((s) => ({
          dailyNoteIdByLocalDate: { ...s.dailyNoteIdByLocalDate, [dateKey]: noteId },
        })),

      clearDailyNoteForLocalDate: (dateKey) =>
        set((s) => {
          const next = { ...s.dailyNoteIdByLocalDate };
          delete next[dateKey];
          return { dailyNoteIdByLocalDate: next };
        }),
    }),
    {
      name: 'nota-preferences',
      partialize: (state) => ({
        openTodaysNoteShortcut: state.openTodaysNoteShortcut,
        preferencesPendingSync: state.preferencesPendingSync,
        lastServerUpdatedAt: state.lastServerUpdatedAt,
        dailyNoteIdByLocalDate: state.dailyNoteIdByLocalDate,
      }),
    },
  ),
);
