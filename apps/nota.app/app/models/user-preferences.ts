import type { UserPreferences } from '~/types/database.types';
import type { TypedSupabaseClient } from './notes';

export async function getUserPreferences(
  client: TypedSupabaseClient,
  userId: string,
): Promise<UserPreferences> {
  const { data, error } = await client
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user preferences: ${error.message}`);
  }

  if (data) {
    return data;
  }

  return {
    user_id: userId,
    open_todays_note_shortcut: false,
    show_note_backlinks: true,
    welcome_seeded: false,
    updated_at: new Date(0).toISOString(),
  };
}

export async function upsertUserPreferences(
  client: TypedSupabaseClient,
  userId: string,
  patch: {
    open_todays_note_shortcut?: boolean;
    show_note_backlinks?: boolean;
    welcome_seeded?: boolean;
  },
): Promise<UserPreferences> {
  const current = await getUserPreferences(client, userId);
  const row = {
    user_id: userId,
    open_todays_note_shortcut:
      patch.open_todays_note_shortcut !== undefined
        ? patch.open_todays_note_shortcut
        : current.open_todays_note_shortcut,
    show_note_backlinks:
      patch.show_note_backlinks !== undefined
        ? patch.show_note_backlinks
        : current.show_note_backlinks,
    welcome_seeded:
      patch.welcome_seeded !== undefined
        ? patch.welcome_seeded
        : current.welcome_seeded,
  };

  const { data, error } = await client
    .from('user_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save user preferences: ${error.message}`);
  }

  return data;
}
