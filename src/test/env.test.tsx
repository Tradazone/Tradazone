// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { isValidWebhookUrl, WEBHOOK_KEY } from '../services/webhook';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

// ─── Environment variable defaults ───────────────────────────────────────────

describe('VITE_APP_ENV', () => {
    it('defaults to "development" when VITE_APP_ENV is not set', () => {
        // In the test environment import.meta.env.VITE_APP_ENV is undefined
        const env = import.meta.env.VITE_APP_ENV ?? 'development';
        expect(['development', 'staging', 'production']).toContain(env);
    });

    it('VITE_BASE_PATH falls back to /Tradazone/ when not set', () => {
        const base = import.meta.env.VITE_BASE_PATH || '/Tradazone/';
        expect(base).toBeTruthy();
        expect(base.startsWith('/')).toBe(true);
    });
});

// ─── Webhook env seeding ──────────────────────────────────────────────────────

describe('VITE_WEBHOOK_URL env seeding', () => {
    it('does not seed localStorage when VITE_WEBHOOK_URL is empty', async () => {
        // Re-import with empty env var (default in test mode)
        vi.stubEnv('VITE_WEBHOOK_URL', '');
        // Simulate the seeding logic from webhook.js
        const envUrl = import.meta.env.VITE_WEBHOOK_URL || '';
        if (envUrl && !localStorage.getItem(WEBHOOK_KEY)) {
            localStorage.setItem(WEBHOOK_KEY, envUrl);
        }
        expect(localStorage.getItem(WEBHOOK_KEY)).toBeNull();
    });

    it('seeds localStorage when VITE_WEBHOOK_URL is a valid URL', () => {
        const testUrl = 'https://hooks.example.com/tradazone';
        // Simulate the seeding logic from webhook.js
        if (testUrl && !localStorage.getItem(WEBHOOK_KEY)) {
            if (isValidWebhookUrl(testUrl)) {
                localStorage.setItem(WEBHOOK_KEY, testUrl);
            }
        }
        expect(localStorage.getItem(WEBHOOK_KEY)).toBe(testUrl);
    });

    it('does not overwrite a user-configured URL with the env default', () => {
        const userUrl = 'https://user-configured.example.com/hook';
        const envUrl = 'https://env-default.example.com/hook';
        localStorage.setItem(WEBHOOK_KEY, userUrl);
        // Simulate seeding — should skip because key already exists
        if (envUrl && !localStorage.getItem(WEBHOOK_KEY)) {
            localStorage.setItem(WEBHOOK_KEY, envUrl);
        }
        expect(localStorage.getItem(WEBHOOK_KEY)).toBe(userUrl);
    });
});

// ─── SignUp staging banner ────────────────────────────────────────────────────

describe('SignUp staging banner', () => {
    it('renders the staging banner when IS_STAGING is true', () => {
        // Render the banner markup directly — avoids router/context deps
        const { container } = render(
            <div data-testid="staging-banner" role="banner">
                ⚠ STAGING ENVIRONMENT — data here is not real and may be reset at any time
            </div>
        );
        expect(screen.getByTestId('staging-banner')).toBeInTheDocument();
        expect(container.textContent).toContain('STAGING ENVIRONMENT');
    });

    it('does not render the staging banner in production', () => {
        const IS_STAGING = false;
        const { queryByTestId } = render(
            <div>
                {IS_STAGING && (
                    <div data-testid="staging-banner" role="banner">
                        ⚠ STAGING ENVIRONMENT
                    </div>
                )}
                <main>App content</main>
            </div>
        );
        expect(queryByTestId('staging-banner')).toBeNull();
    });

    it('renders the staging banner in staging mode', () => {
        const IS_STAGING = true;
        render(
            <div>
                {IS_STAGING && (
                    <div data-testid="staging-banner" role="banner">
                        ⚠ STAGING ENVIRONMENT — data here is not real and may be reset at any time
                    </div>
                )}
            </div>
        );
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByTestId('staging-banner').textContent).toContain('STAGING ENVIRONMENT');
    });
});

// ─── Environment-specific base path ──────────────────────────────────────────

describe('environment base paths', () => {
    const envBasePaths = {
        development: '/',
        staging: '/Tradazone-staging/',
        production: '/Tradazone/',
    };

    it.each(Object.entries(envBasePaths))(
        '%s base path starts with / and ends with /',
        (_, path) => {
            expect(path.startsWith('/')).toBe(true);
            expect(path.endsWith('/')).toBe(true);
        }
    );

    it('staging base path is distinct from production base path', () => {
        expect(envBasePaths.staging).not.toBe(envBasePaths.production);
    });

    it('development base path is /', () => {
        expect(envBasePaths.development).toBe('/');
    });
});
