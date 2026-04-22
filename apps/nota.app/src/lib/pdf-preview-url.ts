/** PDF open parameters for Chromium's built-in viewer (iframe fallback only). */
const PDF_VIEWER_FRAGMENT = 'toolbar=0&navpanes=0';

/**
 * Appends PDF viewer hash parameters without breaking an existing query string.
 * Merges with an existing `#fragment` if present.
 */
export function pdfPreviewSrc(url: string): string {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return `${url}#${PDF_VIEWER_FRAGMENT}`;
  }
  const base = url.slice(0, hashIndex);
  const raw = url.slice(hashIndex + 1);
  const params = new URLSearchParams(raw);
  params.set('toolbar', '0');
  params.set('navpanes', '0');
  return `${base}#${params.toString()}`;
}
