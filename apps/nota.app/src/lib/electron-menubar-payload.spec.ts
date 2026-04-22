import { describe, expect, it } from 'vitest';
import { isNotaMenubarActionPayload } from './electron-menubar-payload';

describe('isNotaMenubarActionPayload', () => {
  it('accepts study-recording', () => {
    // Arrange
    const payload = { kind: 'study-recording' as const };

    // Act
    const ok = isNotaMenubarActionPayload(payload);

    // Assert
    expect(ok).toBe(true);
  });

  it('accepts clipboard text', () => {
    // Arrange
    const payload = {
      kind: 'clipboard-note' as const,
      clipboard: { kind: 'text' as const, text: 'hello' },
    };

    // Act
    const ok = isNotaMenubarActionPayload(payload);

    // Assert
    expect(ok).toBe(true);
  });

  it('accepts clipboard image', () => {
    // Arrange
    const payload = {
      kind: 'clipboard-note' as const,
      clipboard: {
        kind: 'image' as const,
        base64: 'abc',
        mimeType: 'image/png' as const,
      },
    };

    // Act
    const ok = isNotaMenubarActionPayload(payload);

    // Assert
    expect(ok).toBe(true);
  });

  it('rejects invalid shapes', () => {
    // Arrange
    const cases = [
      null,
      {},
      { kind: 'clipboard-note', clipboard: { kind: 'image' } },
    ];

    // Act & Assert
    for (const c of cases) {
      expect(isNotaMenubarActionPayload(c)).toBe(false);
    }
  });
});
