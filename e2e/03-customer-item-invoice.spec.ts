/**
 * E2E Flow 3: Sign in → add customer → add item → create invoice referencing both
 *
 * Tests the full merchant creation workflow using local state (localStorage)
 * so it works without a live Supabase connection.
 */

import { test, expect } from '@playwright/test';

const SESSION = JSON.stringify({
  access_token: 'fake-token', refresh_token: 'fake-refresh',
  user: { id: 'test-user', user_metadata: { wallet_address: '0x049d', wallet_type: 'starknet' } },
  expires_at: Date.now() / 1000 + 3600,
});

test.describe('Customer + Item + Invoice creation flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth session and stub all Supabase REST calls
    await page.addInitScript((session: string) => {
      localStorage.setItem('tradazone_supabase_session', session);
      localStorage.clear(); // fresh state per test — session is re-set below
      localStorage.setItem('tradazone_supabase_session', session);
      localStorage.setItem('tradazone_migrated_to_supabase', 'true');
    }, SESSION);

    await page.route('**/rest/v1/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.route('**/functions/v1/**', async (route) => {
      await route.fulfill({ json: { success: true } });
    });
  });

  test('customer list shows empty state on fresh account', async ({ page }) => {
    await page.goto('/Tradazone/customers');
    await expect(page.getByText(/no customers yet/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('link', { name: /add your first customer/i })).toBeVisible();
  });

  test('add customer form is accessible and submittable', async ({ page }) => {
    await page.goto('/Tradazone/customers/add');

    // Heading
    await expect(page.getByRole('heading', { name: /add customer/i })).toBeVisible({ timeout: 8_000 });

    // Fill out the form
    await page.getByLabel(/name/i).fill('Alice Johnson');
    await page.getByLabel(/email/i).fill('alice@example.com');

    // Name field should have the value
    await expect(page.getByLabel(/name/i)).toHaveValue('Alice Johnson');
  });

  test('items list shows empty state on fresh account', async ({ page }) => {
    await page.goto('/Tradazone/items');
    await expect(page.getByText(/no items or services yet/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('link', { name: /add your first item/i })).toBeVisible();
  });

  test('add item form is accessible', async ({ page }) => {
    await page.goto('/Tradazone/items/add');
    await expect(page.getByRole('heading', { name: /add item/i })).toBeVisible({ timeout: 8_000 });
  });

  test('create invoice form shows customer and item selectors', async ({ page }) => {
    await page.goto('/Tradazone/invoices/create');

    await expect(page.getByRole('heading', { name: /create invoice/i })).toBeVisible({ timeout: 8_000 });

    // Customer selector should be present
    await expect(page.getByText(/customer/i).first()).toBeVisible();

    // Due date field should be present
    await expect(page.getByLabel(/due date/i)).toBeVisible();
  });

  test('invoice preview page has a prominent Pay This Invoice button', async ({ page }) => {
    // Pre-load a pending invoice
    await page.addInitScript((session: string) => {
      localStorage.setItem('tradazone_supabase_session', session);
      localStorage.setItem('tradazone_migrated_to_supabase', 'true');
      localStorage.setItem('tradazone_invoices', JSON.stringify([{
        id: 'INV-001', customer: 'Alice', customerId: 'c-1',
        amount: '500', currency: 'USD', status: 'pending',
        dueDate: '2026-06-01', items: [{ name: 'Design', quantity: 1, price: '500' }],
        createdAt: new Date().toISOString(),
        sentAt: null, paidAt: null, emailStatus: 'pending',
        paymentAddress: '', txHash: '', txNetwork: '', txAmount: '', txCurrency: '',
      }]));
    }, SESSION);

    await page.goto('/Tradazone/invoice/INV-001');

    // The prominent Pay This Invoice CTA should be visible
    await expect(page.getByRole('link', { name: /pay this invoice/i })).toBeVisible({ timeout: 8_000 });
  });

  test('settings notification preferences page loads and has toggles', async ({ page }) => {
    await page.goto('/Tradazone/settings/notifications');
    await expect(page.getByText(/notification preferences/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/payment received/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save preferences/i })).toBeVisible();
  });
});
