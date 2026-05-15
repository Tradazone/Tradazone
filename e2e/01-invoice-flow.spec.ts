/**
 * E2E Flow 1: Connect wallet → view dashboard → create invoice → send to customer
 *
 * Uses a mock Starknet wallet (no real extension required) and stubs the
 * Supabase auth Edge Function so tests run offline.
 */

import { test, expect } from '@playwright/test';
import { injectMockWallet, stubSupabaseAuth } from './helpers';

test.describe('Invoice creation flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockWallet(page);
    await stubSupabaseAuth(page);

    // Stub Supabase data endpoints so tests are isolated from the real DB
    await page.route('**/rest/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('customers')) {
        await route.fulfill({ json: [] });
      } else if (url.includes('invoices')) {
        await route.fulfill({ json: [] });
      } else if (url.includes('items')) {
        await route.fulfill({ json: [] });
      } else if (url.includes('checkouts')) {
        await route.fulfill({ json: [] });
      } else {
        await route.continue();
      }
    });
  });

  test('dashboard loads and shows quick action buttons', async ({ page }) => {
    await page.goto('/Tradazone/');

    // If redirected to sign-in, connect wallet
    if (page.url().includes('signin')) {
      // With mock wallet injected, the sign-in page should show wallet options
      await page.waitForSelector('text=Connect', { timeout: 5000 });
    }

    // Dashboard should show Quick action section
    await expect(page.getByText('Quick action')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /invoice/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /checkout/i })).toBeVisible();
  });

  test('navigate to create invoice page', async ({ page }) => {
    // Stub auth session so we start authenticated
    await page.addInitScript(() => {
      localStorage.setItem('tradazone_supabase_session', JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        user: {
          id: 'test-user',
          user_metadata: { wallet_address: '0x049d3657', wallet_type: 'starknet' },
        },
        expires_at: Date.now() / 1000 + 3600,
      }));
    });

    await page.goto('/Tradazone/invoices/create');

    // Create Invoice form should be visible
    await expect(page.getByRole('heading', { name: /create invoice/i })).toBeVisible({ timeout: 8_000 });
  });

  test('invoice list shows empty state with CTA', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tradazone_supabase_session', JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        user: { id: 'test-user', user_metadata: { wallet_address: '0x049d', wallet_type: 'starknet' } },
        expires_at: Date.now() / 1000 + 3600,
      }));
    });

    await page.goto('/Tradazone/invoices');

    // Empty state should show a call-to-action
    await expect(page.getByText(/no invoices yet/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('link', { name: /create your first invoice/i })).toBeVisible();
  });
});
