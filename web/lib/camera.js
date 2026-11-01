/**
 * Camera & device detection helper utilities
 */

export function isMobileOrTablet() {
  if (typeof window === "undefined" || !navigator) return false;

  const ua = navigator.userAgent || "";
  // Check common mobile/tablet user agents
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // Modern iPads often report as Macintosh; check for multi-touch support
  const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);

  return isMobileUA || isIPadOS;
}
