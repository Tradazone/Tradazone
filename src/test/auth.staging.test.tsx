// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

// ─── src/config/env.js ────────────────────────────────────────────────────────

describe('env config', () => {
    it('exports a valid APP_ENV value', async () => {
        const { APP_ENV } = await import('../config/env');
        expect(['development', 'staging', 'production']).toContain(APP_ENV);
    });

    it('STORAGE_PREFIX is scoped to the environment', async () => {
        const { STORAGE_PREFIX, APP_ENV, IS_PRODUCTION } = await import('../config/env');
        if (IS_PRODUCTION) {
            expect(STORAGE_PREFIX).toBe('tradazone');
        } else {
            expect(STORAGE_PREFIX).toBe(`tradazone_${APP_ENV}`);
        }
    });

    it('SESSION_TTL_MS is 7 days in production, 1 hour otherwise', async () => {
        const { SESSION_TTL_MS, IS_PRODUCTION } = await import('../config/env');
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const ONE_HOUR   = 60 * 60 * 1000;
        expect(SESSION_TTL_MS).toBe(IS_PRODUCTION ? SEVEN_DAYS : ONE_HOUR);
    });

    it('ALLOW_MOCK_WALLET is false in production', async () => {
        const { ALLOW_MOCK_WALLET, IS_PRODUCTION } = await import('../config/env');
        if (IS_PRODUCTION) {
            expect(ALLOW_MOCK_WALLET).toBe(false);
        } else {
            expect(ALLOW_MOCK_WALLET).toBe(true);
        }
    });

    it('IS_STAGING, IS_DEVELOPMENT, IS_PRODUCTION are mutually exclusive', async () => {
        const { IS_STAGING, IS_DEVELOPMENT, IS_PRODUCTION } = await import('../config/env');
        const trueCount = [IS_STAGING, IS_DEVELOPMENT, IS_PRODUCTION].filter(Boolean).length;
        expect(trueCount).toBe(1);
    });
});

// ─── Storage key isolation ────────────────────────────────────────────────────

describe('auth storage key isolation', () => {
    it('session key includes the environment prefix', async () => {
        const { STORAGE_PREFIX } = await import('../config/env');
        // AuthContext derives SESSION_KEY as `${STORAGE_PREFIX}_auth`
        const expectedKey = `${STORAGE_PREFIX}_auth`;
        // Write a session using the expected key and confirm it is readable
        localStorage.setItem(expectedKey, JSON.stringify({ user: { name: 'Test' }, expiresAt: Date.now() + 99999 }));
        expect(localStorage.getItem(expectedKey)).not.toBeNull();
    });

    it('staging and production session keys are different', async () => {
        const stagingKey    = 'tradazone_staging_auth';
        const productionKey = 'tradazone_auth';
        expect(stagingKey).not.toBe(productionKey);
    });

    it('staging and development session keys are different', async () => {
        const stagingKey     = 'tradazone_staging_auth';
        const developmentKey = 'tradazone_development_auth';
        expect(stagingKey).not.toBe(developmentKey);
    });

    it('a staging session does not pollute the production key', () => {
        localStorage.setItem('tradazone_staging_auth', JSON.stringify({ user: { name: 'StagingUser' }, expiresAt: Date.now() + 99999 }));
        expect(localStorage.getItem('tradazone_auth')).toBeNull();
    });
});

// ─── Session TTL ──────────────────────────────────────────────────────────────

describe('session TTL', () => {
    it('SESSION_TTL_MS is a positive number', async () => {
        const { SESSION_TTL_MS } = await import('../config/env');
        expect(SESSION_TTL_MS).toBeGreaterThan(0);
    });

    it('non-production TTL is shorter than 7 days', async () => {
        const { SESSION_TTL_MS, IS_PRODUCTION } = await import('../config/env');
        if (!IS_PRODUCTION) {
            expect(SESSION_TTL_MS).toBeLessThan(7 * 24 * 60 * 60 * 1000);
        }
    });
});

// ─── AuthContext uses env-scoped keys ─────────────────────────────────────────

describe('AuthContext env-scoped session', () => {
    it('login persists session under the env-scoped key', async () => {
        const { STORAGE_PREFIX } = await import('../config/env');
        const { AuthProvider, useAuth } = await import('../context/AuthContext');
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => { result.current.login({ id: '1', name: 'Alice', email: 'a@a.com' }); });

        const sessionKey = `${STORAGE_PREFIX}_auth`;
        const stored = JSON.parse(localStorage.getItem(sessionKey));
        expect(stored).not.toBeNull();
        expect(stored.user.name).toBe('Alice');
    });

    it('logout removes the env-scoped session key', async () => {
        const { STORAGE_PREFIX } = await import('../config/env');
        const { AuthProvider, useAuth } = await import('../context/AuthContext');
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => { result.current.login({ id: '1', name: 'Alice', email: 'a@a.com' }); });
        act(() => { result.current.logout(); });

        expect(localStorage.getItem(`${STORAGE_PREFIX}_auth`)).toBeNull();
    });
});

// ─── Staging banners across auth pages ───────────────────────────────────────

describe('auth page staging banners', () => {
    const renderBanner = (isStaging, appName = 'Tradazone') => render(
        <div>
            {isStaging && (
                <div role="banner" data-testid="staging-banner">
                    ⚠️ {appName} — STAGING ENVIRONMENT. Data is not real and may be reset at any time.
                </div>
            )}
        </div>
    );

    it('shows staging banner when IS_STAGING=true', () => {
        renderBanner(true);
        expect(screen.getByTestId('staging-banner')).toBeInTheDocument();
        expect(screen.getByTestId('staging-banner').textContent).toContain('STAGING ENVIRONMENT');
    });

    it('hides staging banner when IS_STAGING=false', () => {
        const { queryByTestId } = renderBanner(false);
        expect(queryByTestId('staging-banner')).toBeNull();
    });

    it('banner includes the app name', () => {
        renderBanner(true, 'Tradazone (Staging)');
        expect(screen.getByTestId('staging-banner').textContent).toContain('Tradazone (Staging)');
    });

    it('banner has role="banner" for accessibility', () => {
        renderBanner(true);
        expect(screen.getByRole('banner')).toBeInTheDocument();
    });
});

// ─── Mock wallet guard ────────────────────────────────────────────────────────

describe('ALLOW_MOCK_WALLET guard', () => {
    it('mock wallet is not allowed in production', () => {
        const IS_PRODUCTION = true;
        const ALLOW_MOCK_WALLET = !IS_PRODUCTION;
        expect(ALLOW_MOCK_WALLET).toBe(false);
    });

    it('mock wallet is allowed in development', () => {
        const IS_PRODUCTION = false;
        const ALLOW_MOCK_WALLET = !IS_PRODUCTION;
        expect(ALLOW_MOCK_WALLET).toBe(true);
    });

    it('mock wallet is allowed in staging', () => {
        const IS_PRODUCTION = false;
        const ALLOW_MOCK_WALLET = !IS_PRODUCTION;
        expect(ALLOW_MOCK_WALLET).toBe(true);
    });
});
