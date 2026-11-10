/**
 * Only allow redirects to pages inside this app. Anything else (other sites,
 * protocol-relative "//evil.com", "/\evil.com", "javascript:") is rejected.
 */
export function safeRedirectPath(target: string | null | undefined): string | null {
  if (!target) return null;
  if (!target.startsWith('/')) return null;
  if (target.startsWith('//') || target.startsWith('/\\')) return null;
  // Reject control characters (browsers strip tabs/newlines, which can turn
  // "/<tab>/evil.com" into "//evil.com").
  for (let i = 0; i < target.length; i++) {
    if (target.charCodeAt(i) < 0x20) return null;
  }
  return target;
}
