// @ts-nocheck
/**
 * ISSUE: #106 (Missing CSP baseline for auth flows)
 * Category: Security & Compliance
 * Priority: Low
 * Affected Area: AuthContext / App Shell
 * Description: AuthContext depends on the document shell to provide CSP
 * protections. This helper keeps the SPA-aligned `<meta http-equiv>` policy in
 * sync during runtime, while index.html ships the same baseline for first
 * paint.
 */

export const AUTH_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

export function ensureContentSecurityPolicyMeta(doc = document) {
  if (!doc?.head) return null;

  let meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    doc.head.appendChild(meta);
  }

  meta.setAttribute('content', AUTH_CONTENT_SECURITY_POLICY);
  return meta;
}
