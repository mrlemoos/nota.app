import { describe, expect, it } from 'vitest';
import { isShellPathnameAllowed } from './pathname-policy';

describe('isShellPathnameAllowed', () => {
  it('allows the SPA shell and static prefixes', () => {
    // Arrange
    const paths = [
      '/',
      '/index.html',
      '/favicon.svg',
      '/assets/main-abc123.js',
      '/notes',
      '/notes/any',
      '/notes/',
    ];

    // Act
    const results = paths.map((p) => isShellPathnameAllowed(p));

    // Assert
    expect(results.every(Boolean)).toBe(true);
  });

  it('rejects unknown pathnames', () => {
    // Arrange
    const paths = ['/typo', '/blog/post', '/api'];

    // Act
    const results = paths.map((p) => isShellPathnameAllowed(p));

    // Assert
    expect(results.every((allowed) => !allowed)).toBe(true);
  });
});
