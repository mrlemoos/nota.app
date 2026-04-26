/** Apple-style hardware detection without `navigator.platform` (deprecated). */
export function navigatorLooksLikeApplePlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
