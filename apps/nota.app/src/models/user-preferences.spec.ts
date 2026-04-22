import { describe, expect, it } from 'vitest';
import type { TypedSupabaseClient } from './notes';
import { getUserPreferences } from './user-preferences';

describe('getUserPreferences', () => {
  it('defaults show_note_backlinks to true when no row exists', async () => {
    // Arrange
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
    const userId = 'user-1';

    // Act
    const prefs = await getUserPreferences(client, userId);

    // Assert
    expect(prefs.show_note_backlinks).toBe(true);
  });
});
