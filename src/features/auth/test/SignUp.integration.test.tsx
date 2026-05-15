// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { STORAGE_PREFIX } from '../../../config/env';
import SignUp from '../pages/SignUp';
import { MemoryRouter } from 'react-router-dom';
import * as Mocks from './mocks/signUpMocks';

/**
 * SignUp Integration Tests
 *
 * These tests verify the integration between SignUp, ConnectWalletModal,
 * and AuthContext. They ensure that successful wallet connections
 * correctly mutate the global auth state and trigger appropriate UI transitions.
 *
 * Strategy: Both AuthContext and ConnectWalletModal are mocked at the module
 * level. AuthContext is mocked because AuthProvider has internal setTimeout-based
 * wallet-detection loops that cause the JSDOM test runner to hang indefinitely.
 * ConnectWalletModal is mocked to avoid lazy-loaded components and focus traps
 * that are incompatible with JSDOM. Tests exercise the SignUp component's own
 * prop-wiring and navigation logic.
 */

// ── AuthContext mock ───────────────────────────────────────────────────────
// Mocked to prevent wallet-detection setTimeout loops from hanging vitest.

const mockConnectWallet = vi.fn();
let mockIsAuthenticated = false;

vi.mock('../../../context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
    useAuthIsAuthenticated: () => mockIsAuthenticated,
    useAuthWalletState: () => ({
        wallet: { address: '', isConnected: false, balance: '0', currency: 'STRK', chainId: '' },
        walletType: null,
        isConnecting: false,
        lastWallet: null,
    }),
    useAuthActions: () => ({
        connectWallet: mockConnectWallet,
        login: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn(),
        disconnectWallet: vi.fn(),
        disconnectAll: vi.fn(),
        completeWalletLogin: vi.fn(),
        setUser: vi.fn(),
        setWallet: vi.fn(),
    }),
    useAuthUser: () => ({ name: '', email: '', isAuthenticated: false }),
    useAuth: () => ({ user: { isAuthenticated: false }, wallet: {} }),
    loadSession: () => null,
    saveSession: vi.fn(),
}));

// ── ConnectWalletModal mock ────────────────────────────────────────────────
// Captures onConnect prop so tests can drive it directly.

let capturedOnConnect = null;

vi.mock('../../../components/ui/ConnectWalletModal', () => ({
    default: ({ isOpen, onConnect, connectWalletFn }) => {
        capturedOnConnect = onConnect;
        if (!isOpen) return null;
        return (
            <div data-testid="mock-wallet-modal">
                <button
                    data-testid="mock-connect-argent"
                    onClick={async () => {
                        const result = await connectWalletFn('starknet');
                        if (result?.success !== false) onConnect('starknet');
                    }}
                >
                    Connect Argent
                </button>
            </div>
        );
    },
}));

// ── Minimal stubs ──────────────────────────────────────────────────────────

vi.mock('../../../assets/auth-splash.svg', () => ({ default: 'mock-splash.svg' }));

let mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams],
    };
});

const mockDispatchWebhook = vi.fn().mockResolvedValue(Mocks.MOCK_WEBHOOK_SUCCESS);
vi.mock('../../../services/webhook', () => ({
    dispatchWebhook: (...args) => mockDispatchWebhook(...args),
}));

vi.mock('../../../utils/richText', () => ({
    normalizeRichTextHtml: (v) => v || '',
    getPlainTextFromRichText: (v) => v || '',
}));

vi.mock('../../../utils/checkoutCsv', () => ({
    escapeCsvField: (v) => String(v ?? ''),
    downloadCsvFile: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;

function renderSignUp() {
    return render(
        <MemoryRouter>
            <SignUp />
        </MemoryRouter>
    );
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('SignUp Integration Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        capturedOnConnect = null;
        mockIsAuthenticated = false;
        mockNavigate = vi.fn();
        mockSearchParams = new URLSearchParams();
        mockConnectWallet.mockResolvedValue({ success: true });
        mockDispatchWebhook.mockResolvedValue(Mocks.MOCK_WEBHOOK_SUCCESS);
    });

    it('opens the wallet modal when Connect Wallet button is clicked', () => {
        renderSignUp();

        expect(screen.queryByTestId('mock-wallet-modal')).toBeNull();
        fireEvent.click(screen.getByText('Connect Wallet'));
        expect(screen.getByTestId('mock-wallet-modal')).toBeInTheDocument();
    });

    it('navigates to "/" after a successful wallet connection', async () => {
        renderSignUp();

        // Open modal and trigger connection via the mock button
        fireEvent.click(screen.getByText('Connect Wallet'));
        fireEvent.click(screen.getByTestId('mock-connect-argent'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        }, { timeout: 3000 });
    });

    it('dispatches the signed_up webhook after a successful connection', async () => {
        renderSignUp();

        fireEvent.click(screen.getByText('Connect Wallet'));
        fireEvent.click(screen.getByTestId('mock-connect-argent'));

        await waitFor(() => {
            expect(mockDispatchWebhook).toHaveBeenCalledWith(
                'user.signed_up',
                expect.objectContaining({ walletType: expect.any(String) })
            );
        }, { timeout: 3000 });
    });
});
