import { describe, expect, it } from 'vitest';
import {
  assertUrlSafeForOgFetch,
  parseOgFromHtml,
} from './og-preview.server';

describe('parseOgFromHtml', () => {
  it('extracts og tags and resolves relative image', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Hello &amp; world" />
        <meta property="og:description" content="Desc" />
        <meta property="og:image" content="/pic.png" />
      </head></html>
    `;
    const r = parseOgFromHtml(html, 'https://example.com/page');
    expect(r.title).toBe('Hello & world');
    expect(r.description).toBe('Desc');
    expect(r.image).toBe('https://example.com/pic.png');
  });

  it('falls back to title tag and meta description', () => {
    const html =
      '<html><head><title>  Plain title  </title>' +
      '<meta name="description" content="From name" /></head></html>';
    const r = parseOgFromHtml(html, 'https://x.test/');
    expect(r.title).toBe('Plain title');
    expect(r.description).toBe('From name');
  });
});

describe('assertUrlSafeForOgFetch', () => {
  it('accepts public https URLs', () => {
    const u = assertUrlSafeForOgFetch('https://example.com/path?q=1');
    expect(u.hostname).toBe('example.com');
  });

  it('rejects localhost', () => {
    expect(() => assertUrlSafeForOgFetch('http://localhost:3000/')).toThrow();
  });
});
