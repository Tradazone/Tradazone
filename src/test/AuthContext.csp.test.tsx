// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import {
  AUTH_CONTENT_SECURITY_POLICY,
  ensureContentSecurityPolicyMeta,
} from '../security/csp';

const INDEX_HTML_PATH = path.resolve(process.cwd(), 'index.html');

describe('AuthContext CSP baseline (Issue #106)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('upserts the shared CSP meta tag with the expected policy', () => {
    const meta = ensureContentSecurityPolicyMeta(document);

    expect(meta).toHaveAttribute('http-equiv', 'Content-Security-Policy');
    expect(meta).toHaveAttribute('content', AUTH_CONTENT_SECURITY_POLICY);
    expect(document.head.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')).toHaveLength(1);
  });

  it('ensures the CSP meta exists when AuthProvider mounts', () => {
    render(<AuthProvider><div>auth tree</div></AuthProvider>);

    const meta = document.head.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta).not.toBeNull();
    expect(meta).toHaveAttribute('content', AUTH_CONTENT_SECURITY_POLICY);
  });

  it('ships the CSP baseline in index.html for first paint', () => {
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("frame-ancestors 'none'");
  });
});
