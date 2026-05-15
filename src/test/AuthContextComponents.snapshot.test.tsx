// @ts-nocheck
/**
 * @fileoverview Visual snapshot tests for AuthContext-driven wallet UI.
 *
 * ISSUE: #143 - Add visual snapshot testing for the AuthContext components.
 * Category: Testing & QA
 * Priority: Medium
 * Affected Area: AuthContext
 *
 * This suite snapshots the main UI that is composed directly from AuthContext
 * selector slices defined in `src/context/AuthContext.jsx`: wallet actions,
 * wallet session state, and the derived wallet catalog consumed by
 * `ConnectWalletModal`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConnectWalletModal from '../components/ui/ConnectWalletModal';

const mockCompleteWalletLogin = vi.fn();
const mockDisconnectAll = vi.fn().mockResolvedValue(undefined);
const mockLobstrConnect = vi.fn();

function createWalletCatalog() {
    return [
        {
            id: 'stellar',
            name: 'LOBSTR',
            network: 'stellar',
            networkName: 'Stellar Network',
            isInstalled: false,
            isRecommended: true,
        },
        {
            id: 'starknet',
            name: 'Argent',
            network: 'starknet',
            networkName: 'Starknet Network',
            isInstalled: true,
            isRecommended: false,
        },
        {
            id: 'metamask',
            name: 'MetaMask',
            network: 'evm',
            networkName: 'EVM Network',
            isInstalled: true,
            isRecommended: true,
            rdns: 'io.metamask',
        },
        {
            id: 'phantom',
            name: 'Phantom',
            network: 'evm',
            networkName: 'Solana / EVM',
            isInstalled: false,
            isRecommended: false,
        },
        {
            id: 'starknet_generic',
            name: 'Other Starknet Wallets',
            network: 'starknet',
            networkName: 'Braavos, etc.',
            isInstalled: false,
            isRecommended: false,
            isSecondary: true,
        },
        {
            id: 'evm_generic',
            name: 'EVM / Browser Wallets',
            network: 'evm',
            networkName: 'Any injected Web3 provider',
            isInstalled: false,
            isRecommended: false,
            isSecondary: true,
        },
    ];
}

const mockContextState = {
    wallet: { isConnected: false },
    installed: {
        discovered: [
            {
                info: { rdns: 'io.metamask' },
                provider: { isMetaMask: true },
            },
        ],
    },
    availableWallets: createWalletCatalog(),
};

vi.mock('../context/AuthContext', () => ({
    useAuthActions: () => ({
        completeWalletLogin: mockCompleteWalletLogin,
        disconnectAll: mockDisconnectAll,
    }),
    useAuthWalletState: () => ({
        wallet: mockContextState.wallet,
    }),
    useAuthWalletCatalog: () => ({
        installed: mockContextState.installed,
        availableWallets: mockContextState.availableWallets,
    }),
}));

vi.mock('../hooks/useDebounce', () => ({
    useDebounce: (value) => value,
}));

vi.mock('../hooks/useFocusTrap', () => ({
    useFocusTrap: () => ({ current: null }),
}));

vi.mock('../hooks/useLobstr', () => ({
    useLobstr: () => ({
        connect: mockLobstrConnect,
        isConnecting: false,
    }),
}));

vi.mock('../hooks/useVirtualList', () => ({
    useVirtualList: ({ items }) => ({
        scrollRef: { current: null },
        virtualItems: items.map((item, index) => ({ item, index })),
        topPadding: 0,
        bottomPadding: 0,
    }),
}));

vi.mock('../components/ui/Logo', () => ({
    default: () => <div data-testid="logo" />,
}));

vi.mock('../components/ui/StagingBanner', () => ({
    default: () => null,
}));

function resetContextState() {
    mockContextState.wallet = { isConnected: false };
    mockContextState.installed = {
        discovered: [
            {
                info: { rdns: 'io.metamask' },
                provider: { isMetaMask: true },
            },
        ],
    };
    mockContextState.availableWallets = createWalletCatalog();
    mockCompleteWalletLogin.mockReset();
    mockDisconnectAll.mockClear();
    mockLobstrConnect.mockReset();
}

function renderModal(connectWalletFn = vi.fn().mockResolvedValue({ success: true })) {
    return render(
        <ConnectWalletModal
            isOpen={true}
            onClose={vi.fn()}
            onConnect={vi.fn()}
            connectWalletFn={connectWalletFn}
        />,
    );
}

beforeEach(() => {
    resetContextState();
});

describe('AuthContext component snapshots', () => {
    it('matches snapshot for the primary wallet list', () => {
        const { asFragment } = renderModal();
        expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot for the secondary wallet list view', () => {
        const { asFragment } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: /view more options/i }));

        expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when a wallet install error is shown', async () => {
        const connectWalletFn = vi.fn().mockResolvedValue({ success: false, error: 'not_installed' });
        const { asFragment } = renderModal(connectWalletFn);

        fireEvent.click(screen.getByRole('button', { name: /MetaMask/i }));

        expect(await screen.findByText(/EVM wallet not detected in browser\./i)).toBeTruthy();
        expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot when a wallet session is already connected', () => {
        mockContextState.wallet = { isConnected: true };

        const { asFragment } = renderModal();
        expect(asFragment()).toMatchSnapshot();
    });
});
