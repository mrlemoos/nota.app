/**
 * Allowlisted image URL for link-preview `<img src>` (defence in depth vs persisted attrs).
 */
export function safeOgImageSrcForPreview(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null;
    }
    return u.href;
  } catch {
    return null;
  }
}
