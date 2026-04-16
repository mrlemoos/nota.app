import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashForScreen, parseAppNavFromLocation } from './app-navigation';

const SAMPLE_NOTE_ID = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

function stubWindowHash(hash: string): void {
  const prevWindow = globalThis.window;
  vi.stubGlobal('window', {
    ...prevWindow,
    location: {
      ...prevWindow.location,
      hash,
      href: `http://localhost/${hash}`,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseAppNavFromLocation', () => {
  it('returns landing when hash is empty', () => {
    // Arrange
    stubWindowHash('');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'landing' });
  });

  it('returns landing when hash is #/', () => {
    // Arrange
    stubWindowHash('#/');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'landing' });
  });

  it('returns landing when hash is #', () => {
    // Arrange
    stubWindowHash('#');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'landing' });
  });

  it('returns notFound when hash is #/404', () => {
    // Arrange
    stubWindowHash('#/404');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'notFound' });
  });

  it('hashForScreen maps notFound to canonical #/404', () => {
    // Act
    const href = hashForScreen({ kind: 'notFound' });

    // Assert
    expect(href).toBe('#/404');
  });

  it('hashForScreen maps login to Clerk hash #/sign-in', () => {
    expect(hashForScreen({ kind: 'login' })).toBe('#/sign-in');
  });

  it('hashForScreen maps signup to Clerk hash #/sign-up', () => {
    expect(hashForScreen({ kind: 'signup' })).toBe('#/sign-up');
  });

  it('returns login when hash is #/login', () => {
    // Arrange
    stubWindowHash('#/login');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'login' });
  });

  it('returns signup when hash is #/signup', () => {
    // Arrange
    stubWindowHash('#/signup');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'signup' });
  });

  it('returns notes list when hash is #/notes', () => {
    // Arrange
    stubWindowHash('#/notes');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({
      kind: 'notes',
      panel: 'list',
      noteId: null,
    });
  });

  it('returns notes graph when hash is #/notes/graph', () => {
    // Arrange
    stubWindowHash('#/notes/graph');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({
      kind: 'notes',
      panel: 'graph',
      noteId: null,
    });
  });

  it('returns note panel for #/notes/note/:uuid', () => {
    // Arrange
    stubWindowHash(`#/notes/note/${SAMPLE_NOTE_ID}`);

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({
      kind: 'notes',
      panel: 'note',
      noteId: SAMPLE_NOTE_ID,
    });
  });

  it('returns note panel for legacy #/notes/:uuid', () => {
    // Arrange
    stubWindowHash(`#/notes/${SAMPLE_NOTE_ID}`);

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({
      kind: 'notes',
      panel: 'note',
      noteId: SAMPLE_NOTE_ID,
    });
  });

  it('returns notFound when hash is #/typo', () => {
    // Arrange
    stubWindowHash('#/typo');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'notFound' });
  });

  it('returns notFound when hash is #/notes/nope', () => {
    // Arrange
    stubWindowHash('#/notes/nope');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'notFound' });
  });

  it('returns login when hash is #/login/extra (Clerk sub-steps)', () => {
    // Arrange
    stubWindowHash('#/login/extra');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'login' });
  });

  it('returns login when hash uses Clerk hyphenated #/sign-in', () => {
    stubWindowHash('#/sign-in');

    expect(parseAppNavFromLocation()).toEqual({ kind: 'login' });
  });

  it('returns login for #/sign-in/verify-email-code', () => {
    stubWindowHash('#/sign-in/verify-email-code');

    expect(parseAppNavFromLocation()).toEqual({ kind: 'login' });
  });

  it('returns signup when hash uses Clerk hyphenated #/sign-up', () => {
    stubWindowHash('#/sign-up');

    expect(parseAppNavFromLocation()).toEqual({ kind: 'signup' });
  });

  it('returns signup for #/sign-up/verify-email-address', () => {
    stubWindowHash('#/sign-up/verify-email-address');

    expect(parseAppNavFromLocation()).toEqual({ kind: 'signup' });
  });

  it('returns signup when hash has query after #/sign-up', () => {
    stubWindowHash('#/sign-up?redirect_url=%2F');

    expect(parseAppNavFromLocation()).toEqual({ kind: 'signup' });
  });

  it('returns notFound when note path has invalid uuid', () => {
    // Arrange
    stubWindowHash('#/notes/note/not-a-uuid');

    // Act
    const result = parseAppNavFromLocation();

    // Assert
    expect(result).toEqual({ kind: 'notFound' });
  });
});
