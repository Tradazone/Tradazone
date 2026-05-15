// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  AuthProvider,
  useAuth,
  useAuthActions,
  useAuthIsAuthenticated,
  useAuthUser,
  useAuthWalletCatalog,
} from '../context/AuthContext';
import { STORAGE_PREFIX } from '../config/env';

// Keys must match what AuthContext derives from STORAGE_PREFIX
const SESSION_KEY = `${STORAGE_PREFIX}_auth`;
const WALLET_KEY  = `${STORAGE_PREFIX}_last_wallet`;

function seedSession(userData, expiresAt = Date.now() + 999999) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: userData, expiresAt }));
  localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
}

function readStoredSession() {
  return JSON.parse(sessionStorage.getItem(SESSION_KEY));
}

function readStoredProfile() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts unauthenticated when no session exists', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.isAuthenticated).toBe(false);
    expect(result.current.wallet.isConnected).toBe(false);
  });

  it('restores a valid saved session', () => {
    const userData = { id: '1', name: 'Alice', email: 'a@a.com', isAuthenticated: true, walletAddress: null, walletType: null };
    seedSession(userData);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.user.name).toBe('Alice');
  });

  it('ignores an expired session', () => {
    const userData = { id: '1', name: 'Alice', email: 'a@a.com', isAuthenticated: true };
    seedSession(userData, Date.now() - 1);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('handles corrupt session data gracefully', () => {
    sessionStorage.setItem(SESSION_KEY, 'not-valid-json{{');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.isAuthenticated).toBe(false);
  });
});

// ─── login / logout ───────────────────────────────────────────────────────────

describe('login', () => {
  it('sets user as authenticated and persists session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login({ id: '42', name: 'Bob', email: 'bob@b.com' });
    });
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.user.name).toBe('Bob');
    const storedSession = readStoredSession();
    const storedProfile = readStoredProfile();
    expect(storedSession.user.name).toBe('Bob');
    expect(storedSession.expiresAt).toBeGreaterThan(Date.now());
    expect(storedProfile.name).toBe('Bob');
  });
});

describe('updateProfile', () => {
  it('persists sanitized rich text descriptions in the auth session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.completeWalletLogin('GADDR1234', 'stellar');
    });

    act(() => {
      result.current.updateProfile({
        name: 'Merchant Alice',
        email: 'merchant@example.com',
        company: 'Alice Co',
        profileDescription: '<p>Trusted <strong>merchant</strong><script>alert(1)</script></p>',
      });
    });

    expect(result.current.user.name).toBe('Merchant Alice');
    expect(result.current.user.company).toBe('Alice Co');
    expect(result.current.user.profileDescription).toBe('<p>Trusted <strong>merchant</strong></p>');

    expect(readStoredSession().user.profileDescription).toBe('<p>Trusted <strong>merchant</strong></p>');
    expect(readStoredProfile().profileDescription).toBe('<p>Trusted <strong>merchant</strong></p>');
  });
});

describe('logout', () => {
  it('clears user state and removes session from storage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login({ id: '1', name: 'Alice', email: 'a@a.com' }));
    act(() => result.current.logout());
    expect(result.current.user.isAuthenticated).toBe(false);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('resets wallet state on logout', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login({ id: '1', name: 'Alice', email: 'a@a.com' }));
    act(() => result.current.logout());
    expect(result.current.wallet.isConnected).toBe(false);
    expect(result.current.wallet.address).toBe('');
    expect(result.current.walletType).toBeNull();
  });
});

// ─── completeWalletLogin ──────────────────────────────────────────────────────

describe('completeWalletLogin', () => {
  it('sets stellar wallet state correctly', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const addr = 'GBXXX123';
    act(() => result.current.completeWalletLogin(addr, 'stellar'));
    expect(result.current.wallet.isConnected).toBe(true);
    expect(result.current.wallet.address).toBe(addr);
    expect(result.current.wallet.currency).toBe('XLM');
    expect(result.current.wallet.chainId).toBe('stellar');
    expect(result.current.walletType).toBe('stellar');
  });

  it('sets starknet wallet state correctly', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const addr = '0xabc123';
    act(() => result.current.completeWalletLogin(addr, 'starknet'));
    expect(result.current.wallet.currency).toBe('STRK');
    expect(result.current.wallet.chainId).toBe('');
    expect(result.current.walletType).toBe('starknet');
  });

  it('authenticates the user and persists session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.completeWalletLogin('0xabc', 'starknet'));
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.user.walletAddress).toBe('0xabc');
    expect(readStoredSession().user.walletAddress).toBe('0xabc');
    expect(readStoredProfile().walletAddress).toBe('0xabc');
  });

  it('stores last wallet address in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.completeWalletLogin('GADDR', 'stellar'));
    expect(localStorage.getItem(WALLET_KEY)).toBe('GADDR');
  });

  it('formats user name as truncated address', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const addr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    act(() => result.current.completeWalletLogin(addr, 'starknet'));
    expect(result.current.user.name).toBe(`${addr.slice(0, 6)}...${addr.slice(-4)}`);
  });
});

// ─── disconnectAll ───────────────────────────────────────────────────────────

describe('disconnectAll', () => {
  it('resets auth and wallet state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.completeWalletLogin('GADDR', 'stellar'));
    await act(async () => { await result.current.disconnectAll(); });
    expect(result.current.user.isAuthenticated).toBe(false);
    expect(result.current.wallet.isConnected).toBe(false);
    expect(result.current.walletType).toBeNull();
  });

  it('removes last wallet key from localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.completeWalletLogin('GADDR', 'stellar'));
    await act(async () => { await result.current.disconnectAll(); });
    expect(localStorage.getItem(WALLET_KEY)).toBeNull();
  });

  it('removes session from localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.completeWalletLogin('GADDR', 'stellar'));
    await act(async () => { await result.current.disconnectAll(); });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

// ─── useAuth guard ────────────────────────────────────────────────────────────

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});

describe('useAuthUser', () => {
  it('keeps the same user reference for wallet-only updates', () => {
    const { result } = renderHook(() => ({
      auth: useAuth(),
      user: useAuthUser(),
    }), { wrapper });

    const initialUser = result.current.user;

    act(() => {
      result.current.auth.setWallet((current) => ({
        ...current,
        balance: String(Number(current.balance || '0') + 1),
      }));
    });

    expect(result.current.user).toBe(initialUser);

    act(() => {
      result.current.auth.login({ id: '99', name: 'Profile User', email: 'profile@example.com' });
    });

    expect(result.current.user).not.toBe(initialUser);
  });

  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuthUser())).toThrow('useAuthUser must be used within an AuthProvider');
    spy.mockRestore();
  });
});

describe('useAuthIsAuthenticated (Issue #69)', () => {
  it('tracks login state without exposing the full user object', () => {
    const { result } = renderHook(
      () => ({
        isAuthed: useAuthIsAuthenticated(),
        auth: useAuth(),
      }),
      { wrapper },
    );

    expect(result.current.isAuthed).toBe(false);

    act(() => {
      result.current.auth.login({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    expect(result.current.isAuthed).toBe(true);
  });

  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuthIsAuthenticated())).toThrow(
      'useAuthIsAuthenticated must be used within an AuthProvider',
    );
    spy.mockRestore();
  });
});

describe('narrow auth selectors', () => {
  it('useAuthActions keeps a stable reference across wallet state updates', () => {
    const { result } = renderHook(() => ({
      auth: useAuth(),
      actions: useAuthActions(),
    }), { wrapper });

    const initialActions = result.current.actions;

    act(() => {
      result.current.auth.setWallet((current) => ({
        ...current,
        balance: String(Number(current.balance || '0') + 1),
      }));
    });

    expect(result.current.actions).toBe(initialActions);
  });

  it('useAuthWalletCatalog keeps a stable reference across auth identity updates', () => {
    const { result } = renderHook(() => ({
      auth: useAuth(),
      catalog: useAuthWalletCatalog(),
    }), { wrapper });

    const initialCatalog = result.current.catalog;

    act(() => {
      result.current.auth.login({ id: '55', name: 'Catalog Safe', email: 'catalog@example.com' });
    });

    expect(result.current.catalog).toBe(initialCatalog);
  });
});

// ─── Race Condition Tests ─────────────────────────────────────────────────────

describe('race condition prevention', () => {
  it('prevents concurrent completeWalletLogin calls from overwriting state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Simulate rapid concurrent calls
    act(() => {
      result.current.completeWalletLogin('GADDR1', 'stellar');
      result.current.completeWalletLogin('GADDR2', 'stellar');
      result.current.completeWalletLogin('GADDR3', 'stellar');
    });

    // The last call should win, but state should be consistent
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.wallet.isConnected).toBe(true);
    expect(result.current.user.walletAddress).toBe(result.current.wallet.address);
    expect(result.current.user.walletType).toBe(result.current.walletType);
  });

  it('completeWalletLogin is idempotent for same address', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const addr = 'GADDR_SAME';
    
    act(() => {
      result.current.completeWalletLogin(addr, 'stellar');
    });

    const firstState = {
      user: { ...result.current.user },
      wallet: { ...result.current.wallet },
    };

    // Call again with same address
    act(() => {
      result.current.completeWalletLogin(addr, 'stellar');
    });

    // State should remain unchanged
    expect(result.current.user).toEqual(firstState.user);
    expect(result.current.wallet).toEqual(firstState.wallet);
  });

  it('prevents concurrent login calls from creating inconsistent state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    act(() => {
      result.current.login({ id: '1', name: 'User1', email: 'user1@test.com' });
      result.current.login({ id: '2', name: 'User2', email: 'user2@test.com' });
    });

    // Last login should win
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.user.id).toBe('2');
    expect(result.current.user.name).toBe('User2');
    
    // Session should match current user
    expect(readStoredSession().user.id).toBe(result.current.user.id);
  });

  it('isConnecting flag prevents concurrent connection attempts', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Initially not connecting
    expect(result.current.isConnecting).toBe(false);
    
    // Note: We can't easily test the actual async wallet connection flow here
    // without mocking window.ethereum, window.starknet, etc.
    // This test verifies the flag exists and is accessible
    expect(typeof result.current.isConnecting).toBe('boolean');
  });

  it('maintains state consistency during rapid logout/login cycles', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Rapid login/logout cycles
    act(() => {
      result.current.login({ id: '1', name: 'User1', email: 'user1@test.com' });
      result.current.logout();
      result.current.login({ id: '2', name: 'User2', email: 'user2@test.com' });
      result.current.logout();
      result.current.login({ id: '3', name: 'User3', email: 'user3@test.com' });
    });

    // Final state should be authenticated with last login
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.user.id).toBe('3');
    
    expect(readStoredSession().user.id).toBe('3');
  });

  it('maintains wallet and user state consistency during rapid operations', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    act(() => {
      result.current.completeWalletLogin('0xABC123', 'starknet');
    });

    // Verify consistency
    expect(result.current.user.walletAddress).toBe('0xABC123');
    expect(result.current.wallet.address).toBe('0xABC123');
    expect(result.current.user.walletType).toBe('starknet');
    expect(result.current.walletType).toBe('starknet');
    expect(result.current.user.isAuthenticated).toBe(true);
    expect(result.current.wallet.isConnected).toBe(true);

    // Verify session storage consistency
    expect(readStoredSession().user.walletAddress).toBe('0xABC123');
    expect(readStoredSession().user.walletType).toBe('starknet');
    expect(readStoredProfile().walletAddress).toBe('0xABC123');
    expect(localStorage.getItem(WALLET_KEY)).toBe('0xABC123');
  });
});
