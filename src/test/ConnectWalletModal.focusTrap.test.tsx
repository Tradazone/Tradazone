// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockCompleteWalletLogin = vi.fn();
const mockDisconnectAll = vi.fn().mockResolvedValue(undefined);
const mockConnectWallet = vi.fn();

vi.mock('../hooks/useLobstr', () => ({
    useLobstr: () => ({
        connect: vi.fn(),
        isConnecting: false,
    }),
}));

vi.mock('../hooks/useVirtualList', () => ({
    useVirtualList: ({ items }) => ({
        scrollRef: { current: null },
        virtualItems: items.map((item) => ({ item })),
        topPadding: 0,
        bottomPadding: 0,
    }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuthActions: () => ({
        completeWalletLogin: mockCompleteWalletLogin,
        disconnectAll: mockDisconnectAll,
        updateProfile: vi.fn(),
    }),
    useAuthWalletState: () => ({
        wallet: { isConnected: false },
    }),
    useAuthUser: () => ({ profileDescription: '' }),
    useAuthWalletCatalog: () => ({
        installed: { discovered: [] },
        availableWallets: [
            {
                id: 'metamask',
                name: 'MetaMask',
                network: 'evm',
                networkName: 'Ethereum',
                isInstalled: true,
                isRecommended: true,
                isSecondary: false,
                provider: { isMetaMask: true },
            },
            {
                id: 'phantom',
                name: 'Phantom',
                network: 'evm',
                networkName: 'Ethereum / Solana',
                isInstalled: false,
                isRecommended: false,
                isSecondary: false,
                provider: null,
            },
        ],
    }),
}));

vi.mock('../components/ui/Logo', () => ({
    default: () => <div data-testid="logo" />,
}));

vi.mock('../components/ui/StagingBanner', () => ({
    default: () => null,
}));

describe('ConnectWalletModal focus trap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    async function renderModal() {
        const { default: ConnectWalletModal } = await import('../components/ui/ConnectWalletModal');

        const trigger = document.createElement('button');
        trigger.textContent = 'Open wallet modal';
        document.body.appendChild(trigger);
        trigger.focus();

        const outsideButton = document.createElement('button');
        outsideButton.textContent = 'Outside action';
        document.body.appendChild(outsideButton);

        const onClose = vi.fn();

        render(
            <ConnectWalletModal
                isOpen
                onClose={onClose}
                onConnect={vi.fn()}
                connectWalletFn={mockConnectWallet}
            />
        );

        const closeButton = await screen.findByRole('button', { name: /close modal/i });
        const viewMoreButton = screen.getByRole('button', { name: /view more options/i });

        return { closeButton, viewMoreButton, outsideButton, trigger, onClose };
    }

    it('wraps tab focus from the last interactive element back to the first', async () => {
        const { closeButton, viewMoreButton } = await renderModal();

        await waitFor(() => {
            expect(closeButton).toHaveFocus();
        });

        viewMoreButton.focus();
        expect(viewMoreButton).toHaveFocus();

        fireEvent.keyDown(document, { key: 'Tab' });

        expect(closeButton).toHaveFocus();
    });

    it('pulls focus back into the modal if another page element receives focus', async () => {
        const { closeButton, outsideButton } = await renderModal();

        await waitFor(() => {
            expect(closeButton).toHaveFocus();
        });

        outsideButton.focus();

        await waitFor(() => {
            expect(closeButton).toHaveFocus();
        });
    });

    it('restores focus to the trigger element after the modal closes', async () => {
        const { closeButton, trigger, onClose } = await renderModal();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);

        cleanup();

        await waitFor(() => {
            expect(trigger).toHaveFocus();
        });

        expect(closeButton.isConnected).toBe(false);
    });
});
