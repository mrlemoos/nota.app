import { describe, expect, it } from 'vitest';
import type { TypedSupabaseClient } from './notes';
import { getUserPreferences } from './user-preferences';

describe('getUserPreferences', () => {
  it('defaults show_note_backlinks to true when no row exists', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as TypedSupabaseClient;

    const prefs = await getUserPreferences(client, 'user-1');
    expect(prefs.show_note_backlinks).toBe(true);
  });
});
