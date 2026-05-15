/**
 * E2E Flow 2: Create checkout link → open public payment page → verify UI
 *
 * Tests the public-facing MailCheckout page end-to-end without requiring a
 * real wallet or blockchain connection.
 */

import { test, expect } from '@playwright/test';

test.describe('Checkout link flow', () => {
  test('public payment page renders for a checkout ID', async ({ page }) => {
    // Stub Supabase checkout lookup so we don't need a real DB record
    await page.route('**/rest/v1/checkouts*', async (route) => {
      await route.fulfill({
        json: [{
          id:           'CHK-TEST',
          title:        'Test Product',
          description:  'E2E test checkout',
          amount:       '100',
          currency:     'USD',
          status:       'active',
          payment_link: 'https://tradazone.github.io/Tradazone/pay/CHK-TEST',
          views:        0,
          payments:     0,
          created_at:   new Date().toISOString(),
        }],
      });
    });

    // Stub price service
    await page.route('**/functions/v1/prices', async (route) => {
      await route.fulfill({
        json: {
          ETH:  { usd: 3000, eur: 2800, gbp: 2400, ngn: 4500000 },
          STRK: { usd: 1.5,  eur: 1.4,  gbp: 1.2,  ngn: 2250 },
          XLM:  { usd: 0.1,  eur: 0.093, gbp: 0.079, ngn: 150 },
        },
      });
    });

    await page.goto('/Tradazone/pay/CHK-TEST');

    // Logo should be in header
    await expect(page.locator('header')).toBeVisible({ timeout: 8_000 });

    // Title should appear
    await expect(page.getByText('Test Product')).toBeVisible({ timeout: 8_000 });

    // Email input is present
    await expect(page.getByPlaceholder(/your@email\.com/i)).toBeVisible();

    // Connect wallet button is present
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();

    // Confirm payment button is present and disabled (no wallet)
    const confirmBtn = page.getByRole('button', { name: /confirm payment/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();
  });

  test('QR code toggle works on payment page', async ({ page }) => {
    await page.route('**/rest/v1/checkouts*', async (route) => {
      await route.fulfill({
        json: [{
          id: 'CHK-QR', title: 'QR Test', description: 'QR', amount: '50',
          currency: 'USD', status: 'active',
          payment_link: 'https://tradazone.github.io/Tradazone/pay/CHK-QR',
          views: 0, payments: 0, created_at: new Date().toISOString(),
        }],
      });
    });

    await page.route('**/functions/v1/prices', async (route) => {
      await route.fulfill({ json: { ETH: { usd: 3000 }, STRK: { usd: 1.5 }, XLM: { usd: 0.1 } } });
    });

    await page.goto('/Tradazone/pay/CHK-QR');

    // QR code toggle should be visible
    const qrToggle = page.getByRole('button', { name: /show qr code/i });
    await expect(qrToggle).toBeVisible({ timeout: 8_000 });

    // Click it — QR image should appear
    await qrToggle.click();
    await expect(page.getByAltText(/qr code/i)).toBeVisible({ timeout: 5_000 });
  });

  test('checkout detail share sheet shows all share options', async ({ page }) => {
    // Set up a fake authenticated session
    await page.addInitScript(() => {
      localStorage.setItem('tradazone_supabase_session', JSON.stringify({
        access_token: 'fake-token', refresh_token: 'fake-refresh',
        user: { id: 'test-user', user_metadata: { wallet_address: '0x049d', wallet_type: 'starknet' } },
        expires_at: Date.now() / 1000 + 3600,
      }));

      // Pre-load a checkout in localStorage
      localStorage.setItem('tradazone_checkouts', JSON.stringify([{
        id: 'CHK-001', title: 'Design Package', description: 'Logo design',
        amount: '500', currency: 'USD', status: 'active',
        paymentLink: 'https://tradazone.github.io/Tradazone/pay/CHK-001',
        views: 5, payments: 0, createdAt: new Date().toISOString(),
      }]));
    });

    await page.route('**/rest/v1/**', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/Tradazone/checkout/CHK-001');

    // All share options should be present
    await expect(page.getByRole('button', { name: /qr code/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('link', { name: /whatsapp/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
  });
});
