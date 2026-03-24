import { z } from 'zod';

const urlSchema = z.string().url();

const MAX_BODY_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export type OgPreviewResult = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost') return true;
  if (h.endsWith('.local')) return true;

  const m = h.match(IPV4_RE);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

/**
 * Validates URL for server-side OG fetch (SSRF-hardening baseline).
 */
export function assertUrlSafeForOgFetch(raw: string): URL {
  const parsed = urlSchema.parse(raw);
  const u = new URL(parsed);

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }

  if (isBlockedHostname(u.hostname)) {
    throw new Error('This URL is not allowed');
  }

  return u;
}

function decodeMetaContent(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function matchOgOrMeta(
  html: string,
  property: string,
): string | null {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const propFirst = new RegExp(
    `<meta[^>]*\\bproperty=["']${esc}["'][^>]*\\bcontent=["']([^"']*)["']`,
    'i',
  );
  const m1 = html.match(propFirst);
  if (m1?.[1]) return decodeMetaContent(m1[1].trim());

  const contentFirst = new RegExp(
    `<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bproperty=["']${esc}["']`,
    'i',
  );
  const m2 = html.match(contentFirst);
  if (m2?.[1]) return decodeMetaContent(m2[1].trim());

  return null;
}

function matchNameDescription(html: string): string | null {
  const re =
    /<meta[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i;
  const m = html.match(re);
  if (m?.[1]) return decodeMetaContent(m[1].trim());
  const re2 =
    /<meta[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["']/i;
  const m2 = html.match(re2);
  if (m2?.[1]) return decodeMetaContent(m2[1].trim());
  return null;
}

function matchTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,500})<\/title>/i);
  if (m?.[1]) return decodeMetaContent(m[1].trim());
  return null;
}

export function parseOgFromHtml(html: string, pageUrl: string): OgPreviewResult {
  const title =
    matchOgOrMeta(html, 'og:title') ?? matchTitleTag(html) ?? null;
  const description =
    matchOgOrMeta(html, 'og:description') ?? matchNameDescription(html) ?? null;
  let image = matchOgOrMeta(html, 'og:image');

  if (image) {
    try {
      image = new URL(image, pageUrl).href;
    } catch {
      image = null;
    }
  }

  return {
    url: pageUrl,
    title,
    description,
    image,
  };
}

async function readBodyWithCap(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  const decoder = new TextDecoder();
  let total = 0;
  const chunks: Uint8Array[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > maxBytes) {
      const keep = value.length - (total - maxBytes);
      if (keep > 0) {
        chunks.push(value.slice(0, keep));
      }
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }

  reader.releaseLock?.();

  let out = '';
  for (const c of chunks) {
    out += decoder.decode(c, { stream: true });
  }
  out += decoder.decode();
  return out;
}

export async function fetchOgPreview(rawUrl: string): Promise<OgPreviewResult> {
  const u = assertUrlSafeForOgFetch(rawUrl);
  const canonical = u.href;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(canonical, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent':
          'NotaOgPreview/1.0 (+https://nota.app; link preview for signed-in users)',
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      return {
        url: canonical,
        title: null,
        description: null,
        image: null,
      };
    }

    const html = await readBodyWithCap(response, MAX_BODY_BYTES);
    return parseOgFromHtml(html, canonical);
  } finally {
    clearTimeout(timer);
  }
}
