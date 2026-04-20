import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWelcomeSeedCacheForTests,
  runWelcomeNoteSeedIfNeeded,
} from './welcome-note-seed';
import { createLocalOnlyNote } from './notes-offline';
import { WELCOME_NOTE_CONTENT, WELCOME_NOTE_TITLE } from './welcome-note-doc';
import * as userPreferences from '../models/user-preferences';

vi.mock('./supabase/browser', () => ({
  getBrowserClient: () => ({}),
}));

vi.mock('../models/user-preferences', () => ({
  getUserPreferences: vi.fn(() =>
    Promise.resolve({
      user_id: 'user-1',
      open_todays_note_shortcut: false,
      show_note_backlinks: true,
      welcome_seeded: false,
      updated_at: '',
    }),
  ),
  upsertUserPreferences: vi.fn(() => Promise.resolve()),
}));

vi.mock('./notes-offline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./notes-offline')>();
  return {
    ...actual,
    createLocalOnlyNote: vi.fn(() => Promise.resolve('welcome-note-id')),
  };
});

describe('runWelcomeNoteSeedIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearWelcomeSeedCacheForTests();
  });

  it('returns null when welcome_seeded is already true', async () => {
    await expect(
      runWelcomeNoteSeedIfNeeded({
        userId: 'user-1',
        welcomeSeeded: true,
        notesCount: 0,
      }),
    ).resolves.toBeNull();
    expect(createLocalOnlyNote).not.toHaveBeenCalled();
    expect(userPreferences.upsertUserPreferences).not.toHaveBeenCalled();
  });

  it('returns null when the vault already has notes', async () => {
    await expect(
      runWelcomeNoteSeedIfNeeded({
        userId: 'user-1',
        welcomeSeeded: false,
        notesCount: 3,
      }),
    ).resolves.toBeNull();
    expect(createLocalOnlyNote).not.toHaveBeenCalled();
    expect(userPreferences.upsertUserPreferences).not.toHaveBeenCalled();
  });

  it('creates the welcome note and sets welcome_seeded when the vault is empty', async () => {
    await expect(
      runWelcomeNoteSeedIfNeeded({
        userId: 'user-1',
        welcomeSeeded: false,
        notesCount: 0,
      }),
    ).resolves.toBe('welcome-note-id');

    expect(createLocalOnlyNote).toHaveBeenCalledTimes(1);
    expect(createLocalOnlyNote).toHaveBeenCalledWith(
      'user-1',
      WELCOME_NOTE_TITLE,
      WELCOME_NOTE_CONTENT,
    );
    expect(userPreferences.getUserPreferences).toHaveBeenCalled();
    expect(userPreferences.upsertUserPreferences).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ welcome_seeded: true }),
    );
  });

  it('singleflights concurrent calls for the same user', async () => {
    vi.mocked(createLocalOnlyNote).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('welcome-note-id'), 20);
        }),
    );

    const a = runWelcomeNoteSeedIfNeeded({
      userId: 'user-1',
      welcomeSeeded: false,
      notesCount: 0,
    });
    const b = runWelcomeNoteSeedIfNeeded({
      userId: 'user-1',
      welcomeSeeded: false,
      notesCount: 0,
    });
    await expect(Promise.all([a, b])).resolves.toEqual([
      'welcome-note-id',
      'welcome-note-id',
    ]);
    expect(createLocalOnlyNote).toHaveBeenCalledTimes(1);
    expect(userPreferences.upsertUserPreferences).toHaveBeenCalledTimes(1);
  });

  it('reuses the settled promise on a sequential second call', async () => {
    await expect(
      runWelcomeNoteSeedIfNeeded({
        userId: 'user-1',
        welcomeSeeded: false,
        notesCount: 0,
      }),
    ).resolves.toBe('welcome-note-id');
    await expect(
      runWelcomeNoteSeedIfNeeded({
        userId: 'user-1',
        welcomeSeeded: false,
        notesCount: 0,
      }),
    ).resolves.toBe('welcome-note-id');
    expect(createLocalOnlyNote).toHaveBeenCalledTimes(1);
    expect(userPreferences.upsertUserPreferences).toHaveBeenCalledTimes(1);
  });
});
