// @ts-nocheck
// Mock Storage Immediately to prevent deadlocks in Vitest/JSDOM
// CRITICAL: These need to be real implementations that actually store/retrieve data
const localStorageStore = {};
const sessionStorageStore = {};

global.localStorage = {
    getItem: (key) => localStorageStore[key] ?? null,
    setItem: (key, value) => { localStorageStore[key] = String(value); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
};

global.sessionStorage = {
    getItem: (key) => sessionStorageStore[key] ?? null,
    setItem: (key, value) => { sessionStorageStore[key] = String(value); },
    removeItem: (key) => { delete sessionStorageStore[key]; },
    clear: () => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]); },
};

Object.defineProperty(window, 'sessionStorage', { value: global.sessionStorage, writable: true });
Object.defineProperty(window, 'localStorage', { value: global.localStorage, writable: true });

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, saveSession } from '../context/AuthContext';
import { STORAGE_PREFIX } from '../config/env';
import { MemoryRouter } from 'react-router-dom';
import SignIn from '../pages/auth/SignIn';
import React from 'react';

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;
const WALLET_KEY  = `${STORAGE_PREFIX}_last_wallet`;

// ─── Provider wrapper ──────────────────────────────────────────────────────────

const wrapper = ({ children }) => (
    <AuthProvider>
        {children}
    </AuthProvider>
);

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock env config to prevent the AuthProvider from crashing or returning null
vi.mock('../config/env', () => ({
    STORAGE_PREFIX: 'tradazone',
    SESSION_TTL_MS: 3600000,
    ALLOW_MOCK_WALLET: false,
    APP_ENV: 'test',
    IS_DEVELOPMENT: false,
    IS_STAGING: false,
    IS_PRODUCTION: true,
    APP_NAME: 'Tradazone'
}));

// Mock ethers for connectEvmWallet
vi.mock('ethers', () => ({
    BrowserProvider: class {
        constructor(provider) {
            this.provider = provider;
        }
        send(method, params) {
            if (this.provider && this.provider.request) {
                return this.provider.request({ method, params });
            }
            return Promise.resolve(['0xMOCK_EVM_ADDR']);
        }
        getNetwork() {
            return Promise.resolve({ chainId: 1n });
        }
    }
}));

// Mock get-starknet for disconnect wallet
vi.mock('get-starknet', () => ({
    disconnect: vi.fn().mockResolvedValue(true),
}));

// Mock @lobstrco/signer-extension-api
vi.mock('@lobstrco/signer-extension-api', () => ({
    isConnected: vi.fn().mockResolvedValue(true),
    getPublicKey: vi.fn().mockResolvedValue('GCORP_MOCK_STELLAR_ADDR'),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock react-router-dom for navigation tracking
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        // Do not mock BrowserRouter. The test uses MemoryRouter to provide context,
        // and overriding BrowserRouter globally can interfere with component rendering.
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams()],
    };
});

// Mock assets used by SignIn/ConnectWalletModal
vi.mock('../assets/auth-splash.svg', () => ({ default: 'mock-splash.svg' }));
vi.mock('../assets/logo-blue.svg', () => ({ default: 'logo-blue.svg' }));

// Mock wallet discovery to provide a stable list of wallets
vi.mock('../utils/wallet-discovery', () => ({
    // Returning a stable reference stops the AuthContext useEffect from infinite looping
    useDiscoveredProviders: vi.fn().mockReturnValue([]),
}));

// Mock useLobstr hook which is used inside ConnectWalletModal for Stellar
vi.mock('../hooks/useLobstr', () => ({
    useLobstr: vi.fn().mockReturnValue({
        connect: vi.fn().mockResolvedValue({ success: true, address: 'GCORP_MOCK_STELLAR_ADDR' }),
        isConnecting: false,
    }),
}));

describe('AuthContext async mutations (integration)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(global, 'setTimeout');
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
        // Clear window globals
        delete window.starknet;
        delete window.starknet_argentX;
        delete window.ethereum;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // ── Starknet: connectStarknetWallet ──────────────────────────────────────────

    describe('connectStarknetWallet', () => {
        it('identifies and connects a Starknet wallet successfully', async () => {
            const mockAddr = '0x1234567890abcdef';
            const mockStarknet = {
                enable: vi.fn().mockResolvedValue([mockAddr]),
                isConnected: true,
                selectedAddress: mockAddr,
                name: 'Argent X Integration Test',
            };
            window.starknet = mockStarknet;

            const { result } = renderHook(() => useAuth(), { wrapper });

            let connection;
            await act(async () => {
                connection = await result.current.connectWallet('starknet');
            });

            expect(connection.success).toBe(true);
            expect(result.current.user.walletAddress).toBe(mockAddr);
            expect(result.current.wallet.isConnected).toBe(true);
            expect(result.current.walletType).toBe('starknet');
            expect(localStorage.getItem(WALLET_KEY)).toBe(mockAddr);
            expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
        });

        it('returns error code when wallet extension is missing', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            let connection;
            await act(async () => {
                connection = await result.current.connectWallet('starknet');
            });

            expect(connection.success).toBe(false);
            expect(connection.error).toBe('not_installed');
            expect(result.current.isConnecting).toBe(false);
        });

        it('returns "rejected" when user cancels the enable() prompt', async () => {
            const mockStarknet = {
                enable: vi.fn().mockRejectedValue(new Error('User rejected')),
            };
            window.starknet = mockStarknet;

            const { result } = renderHook(() => useAuth(), { wrapper });

            let connection;
            await act(async () => {
                connection = await result.current.connectWallet('starknet');
            });

            expect(connection.success).toBe(false);
            expect(connection.error).toBe('rejected');
            expect(result.current.isConnecting).toBe(false);
        });
    });

    // ── EVM: connectEvmWallet ───────────────────────────────────────────────────

    describe('connectEvmWallet', () => {
        it('transitions isConnecting state during async flow', async () => {
            const mockAddr = '0x123';
            const mockEth = {
                request: vi.fn().mockResolvedValue([mockAddr]),
                on: vi.fn(),
            };
            window.ethereum = mockEth;

            const { result } = renderHook(() => useAuth(), { wrapper });

            let connectionPromise;
            act(() => {
                connectionPromise = result.current.connectWallet('evm');
            });

            // Should be connecting now
            expect(result.current.isConnecting).toBe(true);

            await act(async () => await connectionPromise);

            expect(result.current.isConnecting).toBe(false);
            expect(result.current.user.isAuthenticated).toBe(true);
            expect(result.current.user.walletAddress).toBe(mockAddr);
        });

        it('prevents concurrent connection attempts across all wallet types', async () => {
            const mockEth = {
                request: vi.fn().mockResolvedValue(['0x123']),
                on: vi.fn(),
            };
            window.ethereum = mockEth;

            const { result } = renderHook(() => useAuth(), { wrapper });

            let firstCall, secondCall;
            act(() => {
                firstCall = result.current.connectWallet('evm');
            });
            
            expect(result.current.isConnecting).toBe(true);

            await act(async () => {
                secondCall = await result.current.connectWallet('stellar');
            });

            expect(secondCall.success).toBe(false);
            expect(secondCall.error).toBe('already_connecting');

            await act(async () => {
                await firstCall;
            });
            expect(result.current.isConnecting).toBe(false);
        });

        it('updates user state when EVM account is changed', async () => {
            let accountChangedCallback;
            const mockEth = {
                request: vi.fn().mockResolvedValue(['0xInitial']),
                on: vi.fn().mockImplementation((event, callback) => {
                    if (event === 'accountsChanged') accountChangedCallback = callback;
                }),
            };
            window.ethereum = mockEth;

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.connectWallet('evm');
            });

            expect(result.current.user.walletAddress).toBe('0xInitial');

            // Trigger account change
            await act(async () => {
                accountChangedCallback(['0xNewAddress']);
            });
            
            expect(result.current.user.walletAddress).toBe('0xNewAddress');
            expect(result.current.wallet.address).toBe('0xNewAddress');
        });

        it('handles missing EVM wallet with "not_installed" error', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            
            let connection;
            await act(async () => {
                connection = await result.current.connectWallet('evm');
            });

            expect(connection.success).toBe(false);
            expect(connection.error).toBe('not_installed');
            expect(result.current.isConnecting).toBe(false);
        });

        it('handles user rejection (code 4001) in EVM flow', async () => {
            const mockEth = {
                request: vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected' }),
            };
            window.ethereum = mockEth;

            const { result } = renderHook(() => useAuth(), { wrapper });

            let connection;
            await act(async () => {
                connection = await result.current.connectWallet('evm');
            });

            expect(connection.success).toBe(false);
            expect(connection.error).toBe('rejected');
            expect(result.current.isConnecting).toBe(false);
        });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────────

    describe('disconnectWallet integration', () => {
        it('clears state and calls programmatic disconnect for Starknet', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            const { disconnect } = await import('get-starknet');

            await act(async () => {
                result.current.completeWalletLogin('0x123', 'starknet');
            });

            await act(async () => {
                await result.current.disconnectWallet();
            });

            expect(disconnect).toHaveBeenCalled();
            expect(result.current.user.isAuthenticated).toBe(false);
            expect(result.current.wallet.isConnected).toBe(false);
            expect(localStorage.getItem(SESSION_KEY)).toBeNull();
        });

        it('disconnectAll clears wallet key and session', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                result.current.completeWalletLogin('GADDR_ALL', 'stellar');
            });

            expect(localStorage.getItem(WALLET_KEY)).toBe('GADDR_ALL');

            await act(async () => {
                await result.current.disconnectAll();
            });

            expect(localStorage.getItem(WALLET_KEY)).toBeNull();
            expect(localStorage.getItem(SESSION_KEY)).toBeNull();
            expect(result.current.user.isAuthenticated).toBe(false);
        });
    });

    describe('completeWalletLogin atomicity', () => {
        it('ensures atomic updates to wallet and user state even across re-renders', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });
            const addr = 'G_ATOMIC_ADDR';

            await act(async () => {
                result.current.completeWalletLogin(addr, 'stellar');
            });

            expect(result.current.user.walletAddress).toBe(addr);
            expect(result.current.wallet.address).toBe(addr);
            expect(result.current.walletType).toBe('stellar');
            
            const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            expect(stored.user.walletAddress).toBe(addr);
        });
    });

    describe('SignIn Page Context Integration', () => {
        it('persists authenticated user to sessionStorage and localStorage', async () => {
            // Test the core mutation directly: completeWalletLogin → sessionStorage persistence
            const mockAddr = 'GCORP_SIGNIN_TEST_ADDR_149';
            const { result } = renderHook(() => useAuth(), { wrapper });
            
            // Call completeWalletLogin directly (what the SignIn modal does internally)
            await act(async () => {
                result.current.completeWalletLogin(mockAddr, 'stellar');
            });
            
            // Verify user state updated
            expect(result.current.user.isAuthenticated).toBe(true);
            expect(result.current.user.walletAddress).toBe(mockAddr);
            expect(result.current.user.walletType).toBe('stellar');
            
            // Verify sessionStorage was updated
            const sessionRaw = sessionStorage.getItem(SESSION_KEY);
            expect(sessionRaw).not.toBeNull();
            const session = JSON.parse(sessionRaw);
            expect(session.user.isAuthenticated).toBe(true);
            expect(session.user.walletAddress).toBe(mockAddr);
            
            // Verify localStorage was updated
            const profileRaw = localStorage.getItem(SESSION_KEY);
            expect(profileRaw).not.toBeNull();
            const profile = JSON.parse(profileRaw);
            expect(profile.isAuthenticated).toBe(true);
            expect(profile.walletAddress).toBe(mockAddr);
        }, 10000);
    });
});
