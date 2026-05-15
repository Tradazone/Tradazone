// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import * as Mocks from './mocks/signUpMocks';

let mockNavigate;
let mockSearchParams;
let mockUser;
let mockWalletState;
let mockIsAuthenticated;
let mockOnConnectArgs;
const mockConnectWallet = vi.fn();
const mockDispatchWebhook = vi.fn().mockResolvedValue({ ok: true });

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams],
    };
});

vi.mock('../../../components/forms/RichTextEditor', () => ({
    default: ({ value, onChange, label }) => (
        <div data-testid="mock-rte">
            <label>{label}</label>
            <textarea
                data-testid="mock-rte-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    ),
}));

vi.mock('../../../components/ui/Logo', () => ({
    default: () => React.createElement('div', { 'data-testid': 'logo' }),
}));

vi.mock('../../../assets/auth-splash.svg', () => ({ default: 'splash.svg' }));

vi.mock('../../../services/webhook', () => ({
    dispatchWebhook: (...args) => mockDispatchWebhook(...args),
}));

vi.mock('../../../config/env', () => ({
    IS_STAGING: false,
    APP_NAME: 'Tradazone',
    STORAGE_PREFIX: 'tradazone',
}));

vi.mock('../../../context/AuthContext', () => ({
    useAuthActions: () => ({ connectWallet: mockConnectWallet }),
    useAuthIsAuthenticated: () => mockIsAuthenticated,
    useAuthWalletState: () => ({ wallet: { address: mockWalletState.address }, walletType: mockWalletState.walletType, isConnecting: mockWalletState.isConnecting }),
    useAuthUser: () => mockUser,
}));

const mockDownloadCsvFile = vi.fn();
vi.mock('../../../utils/checkoutCsv', async () => {
    const actual = await vi.importActual('../../../utils/checkoutCsv');
    return {
        ...actual,
        downloadCsvFile: (...args) => mockDownloadCsvFile(...args),
    };
});

vi.mock('../../../components/ui/ConnectWalletModal', () => ({
    default: ({ isOpen, onConnect }) => (
        isOpen ? (
            <button
                data-testid="mock-connect-success"
                onClick={() => onConnect(mockOnConnectArgs.walletAddress, mockOnConnectArgs.walletType)}
            >
                Simulate Connect
            </button>
        ) : null
    ),
}));

async function renderSignUp() {
    const { default: SignUp } = await import('../pages/SignUp');
    const { BrowserRouter } = await import('react-router-dom');

    render(
        React.createElement(
            BrowserRouter,
            null,
            React.createElement(SignUp)
        )
    );
}

beforeEach(() => {
    localStorage.clear();
    mockNavigate = vi.fn();
    mockSearchParams = new URLSearchParams();
    mockUser = { isAuthenticated: false, walletAddress: null, walletType: null };
    mockWalletState = { address: null, walletType: null, isConnecting: false };
    mockIsAuthenticated = false;
    mockOnConnectArgs = { walletAddress: Mocks.MOCK_WALLET_SUCCESS.walletAddress, walletType: Mocks.MOCK_WALLET_SUCCESS.walletType };
    mockConnectWallet.mockReset();
    mockDispatchWebhook.mockClear();
    mockDispatchWebhook.mockResolvedValue(Mocks.MOCK_WEBHOOK_SUCCESS);
});

describe('SignUp', () => {
    it('renders the onboarding copy', async () => {
        await renderSignUp();

        expect(screen.getByText(/Start getting paid in crypto today/i)).toBeInTheDocument();
        expect(screen.getByText(/Connect your Stellar wallet to create your free account/i)).toBeInTheDocument();
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('redirects authenticated users immediately', async () => {
        mockSearchParams = new URLSearchParams('redirect=/dashboard');
        mockIsAuthenticated = true;
        mockWalletState = { address: '0xAUTH', walletType: 'evm', isConnecting: false };

        await renderSignUp();

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('fires the signup webhook and navigates after a successful wallet connection', async () => {
        const user = userEvent.setup();
        await renderSignUp();

        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByTestId('mock-connect-success'));

        expect(mockDispatchWebhook).toHaveBeenCalledWith('user.signed_up', {
            walletAddress: Mocks.MOCK_WALLET_SUCCESS.walletAddress,
            walletType: Mocks.MOCK_WALLET_SUCCESS.walletType,
        });
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('exports a csv snapshot of the current signup state via downloadCsvFile', async () => {
        const user = userEvent.setup();
        mockIsAuthenticated = true;
        mockWalletState = { address: '0x123', walletType: 'evm', isConnecting: false };

        await renderSignUp();

        await user.click(screen.getByRole('button', { name: /export signup data to csv/i }));

        expect(mockDownloadCsvFile).toHaveBeenCalled();
        const [filename, content] = mockDownloadCsvFile.mock.calls[0];

        expect(filename).toMatch(/^tradazone_signup_data_\d+\.csv$/);
        expect(content).toContain('Wallet Address,Status,Business Description');
        expect(content).toContain('0x123,Connected,None');
    });

    it('falls back to the auth user wallet metadata when modal data is missing', async () => {
        const user = userEvent.setup();
        mockIsAuthenticated = false;
        mockWalletState = { address: '0xFALLBACK', walletType: 'stellar', isConnecting: false };
        mockOnConnectArgs = { walletAddress: null, walletType: null };

        await renderSignUp();
        await user.click(screen.getByRole('button', { name: /connect your wallet to sign up/i }));
        await user.click(screen.getByTestId('mock-connect-success'));

        expect(mockDispatchWebhook).toHaveBeenCalledWith('user.signed_up', {
            walletAddress: '0xFALLBACK',
            walletType: 'stellar',
        });
    });
});
