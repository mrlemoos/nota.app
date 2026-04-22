import { describe, expect, it } from 'vitest';
import { safeOgImageSrcForPreview } from './og-image-url';

describe('safeOgImageSrcForPreview', () => {
  it('accepts http and https URLs', () => {
    // Arrange
    const httpsUrl = 'https://cdn.example.com/a.png';
    const httpUrl = 'http://cdn.example.com/a.png';

    // Act
    const httpsResult = safeOgImageSrcForPreview(httpsUrl);
    const httpResult = safeOgImageSrcForPreview(httpUrl);

    // Assert
    expect(httpsResult).toBe('https://cdn.example.com/a.png');
    expect(httpResult).toBe('http://cdn.example.com/a.png');
  });

  it('rejects non-http(s) schemes', () => {
    // Arrange
    const jsUrl = 'javascript:alert(1)';
    const dataUrl = 'data:image/png;base64,abc';

    // Act
    const jsResult = safeOgImageSrcForPreview(jsUrl);
    const dataResult = safeOgImageSrcForPreview(dataUrl);

    // Assert
    expect(jsResult).toBeNull();
    expect(dataResult).toBeNull();
  });

  it('returns null for empty or invalid input', () => {
    // Arrange
    const empty = '';
    const whitespace = '   ';
    const notAUrl = 'not a url';

    // Act
    const emptyResult = safeOgImageSrcForPreview(empty);
    const wsResult = safeOgImageSrcForPreview(whitespace);
    const invalidResult = safeOgImageSrcForPreview(notAUrl);

    // Assert
    expect(emptyResult).toBeNull();
    expect(wsResult).toBeNull();
    expect(invalidResult).toBeNull();
  });
});
