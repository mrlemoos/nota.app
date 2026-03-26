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
    updated_at: new Date(0).toISOString(),
  };
}

export async function upsertUserPreferences(
  client: TypedSupabaseClient,
  userId: string,
  patch: { open_todays_note_shortcut: boolean },
): Promise<UserPreferences> {
  const { data, error } = await client
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        open_todays_note_shortcut: patch.open_todays_note_shortcut,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save user preferences: ${error.message}`);
  }

  return data;
}
