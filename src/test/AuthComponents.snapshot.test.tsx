// @ts-nocheck
/**
 * @fileoverview Visual snapshot tests for the auth entry-point pages.
 *
 * ISSUE: #156 - Add visual snapshot testing for the Auth module components.
 * Category: Testing / Auth module
 * Affected Area: SignIn, SignUp
 *
 * SignIn now consumes selector-style AuthContext hooks
 * (`useAuthIsAuthenticated`, `useAuthWalletState`, `useAuthActions`) instead of
 * the older monolithic context shape. These snapshots pin the main auth page
 * states so AuthContext refactors do not silently change the UI.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignIn from '../pages/auth/SignIn';
import SignUp from '../pages/auth/SignUp';

const mockAuthState = {
    isAuthenticated: false,
    lastWallet: null,
    loadSession: null,
    user: {
        isAuthenticated: false,
        walletAddress: null,
        walletType: null,
        profileDescription: '',
    },
    connectWallet: vi.fn(),
    updateProfile: vi.fn(),
};

vi.mock('../context/AuthContext', () => ({
    loadSession: () => mockAuthState.loadSession,
    useAuth: () => ({
        connectWallet: mockAuthState.connectWallet,
        user: mockAuthState.user,
        lastWallet: mockAuthState.lastWallet,
    }),
    useAuthUser: () => mockAuthState.user,
    useAuthActions: () => ({
        connectWallet: mockAuthState.connectWallet,
        updateProfile: mockAuthState.updateProfile,
    }),
    useAuthIsAuthenticated: () => mockAuthState.isAuthenticated,
    useAuthWalletState: () => ({
        lastWallet: mockAuthState.lastWallet,
    }),
}));

vi.mock('../components/ui/ConnectWalletModal', () => ({
    default: () => null,
}));

vi.mock('../components/ui/StagingBanner', () => ({
    default: () => null,
}));

vi.mock('../assets/auth-splash.svg', () => ({ default: 'auth-splash.svg' }));
vi.mock('../assets/logo-blue.png', () => ({ default: 'logo-blue.png' }));
vi.mock('../assets/logo-white.png', () => ({ default: 'logo-white.png' }));
vi.mock('../assets/logo.png', () => ({ default: 'logo.png' }));
vi.mock('../assets/logo-blue.svg', () => ({ default: 'logo-blue.svg' }));

function renderWithRouter(ui, initialEntry) {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            {ui}
        </MemoryRouter>,
    );
}

function resetAuthState() {
    mockAuthState.isAuthenticated = false;
    mockAuthState.lastWallet = null;
    mockAuthState.loadSession = null;
    mockAuthState.user = {
        isAuthenticated: false,
        walletAddress: null,
        walletType: null,
        profileDescription: '',
    };
    mockAuthState.connectWallet = vi.fn();
    mockAuthState.updateProfile = vi.fn();
}

beforeEach(() => {
    resetAuthState();
    localStorage.clear();
    sessionStorage.clear();
});

describe('Auth module snapshots - SignIn', () => {
    it('matches snapshot for unauthenticated state with no recent wallet', () => {
        const { container } = renderWithRouter(<SignIn />, '/signin');
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when a returning wallet hint is available', () => {
        mockAuthState.lastWallet = '0x1234567890abcdef1234567890abcdef12345678';

        const { container } = renderWithRouter(<SignIn />, '/signin');
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when the session-expired banner is shown', () => {
        const { container } = renderWithRouter(<SignIn />, '/signin?reason=expired');
        expect(container.firstChild).toMatchSnapshot();
    });
});

describe('Auth module snapshots - SignUp', () => {
    it('matches snapshot for unauthenticated state', () => {
        const { container } = renderWithRouter(<SignUp />, '/signup');
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot when a profile description draft is already present', () => {
        mockAuthState.user = {
            isAuthenticated: false,
            walletAddress: null,
            walletType: null,
            profileDescription: '<p>Crypto invoicing for subscription teams.</p>',
        };

        const { container } = renderWithRouter(<SignUp />, '/signup');
        expect(container.firstChild).toMatchSnapshot();
    });
});
