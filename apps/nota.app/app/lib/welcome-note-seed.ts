import { createLocalOnlyNote } from './notes-offline';
import { getBrowserClient } from './supabase/browser';
import { WELCOME_NOTE_CONTENT, WELCOME_NOTE_TITLE } from './welcome-note-doc';
import { getUserPreferences, upsertUserPreferences } from '../models/user-preferences';

/**
 * One promise per user for the welcome seed. Kept after settle so Strict Mode
 * (unmount/remount) cannot start a second `createLocalOnlyNote` while React
 * still shows `notesCount === 0` and stale preferences.
 */
const welcomeSeedByUserId = new Map<string, Promise<string | null>>();

/** Vitest-only: clears the per-tab seed cache between tests. */
export function clearWelcomeSeedCacheForTests(): void {
  welcomeSeedByUserId.clear();
}

export type WelcomeNoteSeedArgs = {
  userId: string;
  welcomeSeeded: boolean;
  notesCount: number;
};

/**
 * Ensures a one-time welcome note exists for accounts with an empty vault.
 *
 * Idempotent via `user_preferences.welcome_seeded`.
 */
export async function runWelcomeNoteSeedIfNeeded(
  args: WelcomeNoteSeedArgs,
): Promise<string | null> {
  const { userId, welcomeSeeded, notesCount } = args;

  if (welcomeSeeded) {
    return null;
  }
  if (notesCount > 0) {
    return null;
  }

  const existing = welcomeSeedByUserId.get(userId);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<string | null> => {
    try {
      const id = await createLocalOnlyNote(
        userId,
        WELCOME_NOTE_TITLE,
        WELCOME_NOTE_CONTENT,
      );
      const client = getBrowserClient();
      const prefs = await getUserPreferences(client, userId);
      try {
        await upsertUserPreferences(client, userId, {
          open_todays_note_shortcut: prefs.open_todays_note_shortcut,
          welcome_seeded: true,
        });
      } catch (e) {
        console.error('Welcome note: failed to set welcome_seeded preference', e);
      }
      return id;
    } catch (e) {
      console.error('Welcome note seed failed', e);
      welcomeSeedByUserId.delete(userId);
      return null;
    }
  })();

  welcomeSeedByUserId.set(userId, promise);
  return promise;
}
