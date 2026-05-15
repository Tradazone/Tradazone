import { Page } from '@playwright/test';

// Inject a mock Starknet wallet so tests don't require a real browser extension.
// The mock auto-approves connect + sign calls and returns deterministic addresses.
export async function injectMockWallet(page: Page) {
  await page.addInitScript(() => {
    const MOCK_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

    const mockProvider = {
      id:              'mock-starknet',
      name:            'Mock Wallet',
      isConnected:     false,
      selectedAddress: '',
      account:         null as unknown,
      chainId:         'SN_MAIN',
      enable: async () => {
        mockProvider.isConnected     = true;
        mockProvider.selectedAddress = MOCK_ADDRESS;
        mockProvider.account         = { address: MOCK_ADDRESS, signMessage: async () => ['0xsig'] };
        return [MOCK_ADDRESS];
      },
      on:  () => {},
      off: () => {},
    };

    (window as unknown as Record<string, unknown>).starknet            = mockProvider;
    (window as unknown as Record<string, unknown>).starknet_argentX   = mockProvider;
  });
}

// Bypass the real Supabase auth Edge Function call during tests by stubbing the
// fetch for auth-wallet so it returns a fake session token.
export async function stubSupabaseAuth(page: Page) {
  await page.route('**/functions/v1/auth-wallet', async (route) => {
    const body = route.request().postDataJSON() as { action?: string };
    if (body?.action === 'nonce') {
      await route.fulfill({ json: { nonce: 'test-nonce-12345' } });
    } else {
      await route.fulfill({ json: { access_token: 'fake-jwt-token', refresh_token: 'fake-refresh' } });
    }
  });

  // Stub the setSession call so Supabase doesn't try to validate the fake token
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({ json: { access_token: 'fake-jwt', refresh_token: 'fake-refresh', user: { id: 'test-user' } } });
  });
}

// Connect the mock wallet through the UI connect modal
export async function connectMockWallet(page: Page) {
  // Look for any connect wallet button
  const connectBtn = page.getByRole('button', { name: /connect wallet/i }).first();
  if (await connectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await connectBtn.click();
    // Select Argent (which maps to the mock starknet provider)
    await page.getByRole('button', { name: /argent/i }).click();
    // Wait for authentication to complete
    await page.waitForURL('/', { timeout: 10_000 });
  }
}
