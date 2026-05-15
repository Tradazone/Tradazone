// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

// #64: verify that the search input is responsive (updates immediately) but
// the wallet list filter is debounced by 300 ms.

const mockAvailableWallets = [
    { id: 'stellar', name: 'LOBSTR', network: 'stellar', networkName: 'Stellar Network', isRecommended: true, isInstalled: false },
    { id: 'starknet', name: 'Argent', network: 'starknet', networkName: 'Starknet Network', isInstalled: true },
    { id: 'metamask', name: 'MetaMask', network: 'evm', networkName: 'EVM Network', isInstalled: false },
    { id: 'base', name: 'Base Account', network: 'evm', networkName: 'Smart Wallet / EVM', isRecommended: true, isInstalled: true },
    { id: 'evm_generic', name: 'EVM / Browser Wallets', network: 'evm', networkName: 'Any injected Web3 provider', isInstalled: false, isSecondary: true },
    { id: 'discovered_walletconnect', name: 'WalletConnect', network: 'evm', networkName: 'EVM Network', isInstalled: true },
];

vi.mock('../context/AuthContext', () => ({
    useAuthActions: () => ({ completeWalletLogin: vi.fn(), disconnectAll: vi.fn() }),
    useAuthWalletState: () => ({ wallet: { isConnected: false } }),
    useAuthUser: () => ({ profileDescription: '' }),
    useAuthWalletCatalog: () => ({
        installed: { discovered: [] },
        availableWallets: mockAvailableWallets,
    }),
}));

vi.mock('../hooks/useLobstr', () => ({
    useLobstr: () => ({ connect: vi.fn(), isConnecting: false }),
}));

vi.mock('../hooks/useFocusTrap', () => ({
    useFocusTrap: () => ({ current: null }),
}));

vi.mock('./StagingBanner', () => ({ default: () => null }));
vi.mock('./Logo', () => ({ default: () => <div data-testid="logo" /> }));

async function renderModal(overrides = {}) {
    const { default: ConnectWalletModal } = await import('../components/ui/ConnectWalletModal');
    const props = {
        isOpen: true,
        onClose: vi.fn(),
        onConnect: vi.fn(),
        connectWalletFn: vi.fn().mockResolvedValue({ success: true }),
        ...overrides,
    };

    render(
        <ConnectWalletModal {...props} />
    );

    return props;
}

function getWalletOrder() {
    const walletNames = [
        'LOBSTR',
        'Argent',
        'MetaMask',
        'Base Account',
        'EVM / Browser Wallets',
        'WalletConnect',
    ];

    const container = screen.getByTestId('wallet-list-container');
    return within(container)
        .getAllByRole('button')
        .map((button) => button.textContent)
        .map((text) => walletNames.find((name) => text?.includes(name)))
        .filter(Boolean);
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
});

describe('ConnectWalletModal search debounce (Issue #64)', () => {
    it('updates the input value immediately on each keystroke', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });

        expect(input.value).toBe('meta');
    });

    it('does not filter the wallet list before 300 ms have elapsed', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });

        // Advance only 299 ms — debounce has not fired yet
        act(() => { vi.advanceTimersByTime(299); });

        // All 3 wallets should still be visible (filter not applied yet)
        expect(screen.getByText('LOBSTR')).toBeTruthy();
        expect(screen.getByText('Argent')).toBeTruthy();
        expect(screen.getByText('MetaMask')).toBeTruthy();
        expect(screen.getByText('Base Account')).toBeTruthy();
    });

    it('filters the wallet list after 300 ms have elapsed', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });

        // Advance exactly 300 ms — debounce fires
        act(() => { vi.advanceTimersByTime(300); });

        expect(screen.getByText('MetaMask')).toBeTruthy();
        expect(screen.queryByText('LOBSTR')).toBeNull();
        expect(screen.queryByText('Argent')).toBeNull();
    });

    it('resets the filter when the input is cleared after debounce', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });
        act(() => { vi.advanceTimersByTime(300); });

        fireEvent.change(input, { target: { value: '' } });
        act(() => { vi.advanceTimersByTime(300); });

        expect(screen.getByText('LOBSTR')).toBeTruthy();
        expect(screen.getByText('Argent')).toBeTruthy();
        expect(screen.getByText('MetaMask')).toBeTruthy();
        expect(screen.getByText('Base Account')).toBeTruthy();
    });
});

describe('ConnectWalletModal error sanitization (Issue #SEC-01)', () => {
    it('does not expose raw error message when connection fails', async () => {
        const rawError = 'MetaMask RPC Error: Internal JSON-RPC error. {code: -32603, data: {stack: "Error: ..."}}';
        const connectWalletFn = vi.fn().mockResolvedValue({ success: false, error: rawError });

        const { default: ConnectWalletModal } = await import('../components/ui/ConnectWalletModal');
        render(
            <ConnectWalletModal
                isOpen={true}
                onClose={vi.fn()}
                onConnect={vi.fn()}
                connectWalletFn={connectWalletFn}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByText('MetaMask'));
            vi.advanceTimersByTime(300);
        });

        expect(screen.queryByText(rawError)).toBeNull();
        expect(
            screen.getByText(/the connection was cancelled or failed\. please try again\.|connection cancelled\./i)
        ).toBeTruthy();
    });

    it('shows a safe message when user rejects the connection', async () => {
        const connectWalletFn = vi.fn().mockResolvedValue({ success: false, error: 'User rejected the request.' });

        const { default: ConnectWalletModal } = await import('../components/ui/ConnectWalletModal');
        render(
            <ConnectWalletModal
                isOpen={true}
                onClose={vi.fn()}
                onConnect={vi.fn()}
                connectWalletFn={connectWalletFn}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByText('MetaMask'));
            vi.advanceTimersByTime(300);
        });

        expect(screen.getByText('Connection cancelled.')).toBeTruthy();
    });
});

describe('ConnectWalletModal advanced filters and sorting (Issue #120)', () => {
    it('renders wallet options in stable default order', async () => {
        await act(async () => { await renderModal(); });

        expect(getWalletOrder()).toEqual([
            'Base Account',
            'Argent',
            'WalletConnect',
            'LOBSTR',
            'MetaMask',
        ]);
    });

    it('filters the list to installed wallets only', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.click(screen.getByLabelText(/installed only/i));

        expect(screen.getByText('Argent')).toBeTruthy();
        expect(screen.getByText('Base Account')).toBeTruthy();
        expect(screen.queryByText('LOBSTR')).toBeNull();
        expect(screen.queryByText('MetaMask')).toBeNull();
    });

    it('filters the list to recommended wallets only', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.click(screen.getByLabelText(/recommended only/i));

        expect(screen.getByText('LOBSTR')).toBeTruthy();
        expect(screen.getByText('Base Account')).toBeTruthy();
        expect(screen.queryByText('Argent')).toBeNull();
        expect(screen.queryByText('MetaMask')).toBeNull();
    });

    it('filters by wallet type using discovered metadata', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.change(screen.getByLabelText(/wallet type/i), {
            target: { value: 'discovered' },
        });

        expect(screen.getByText('WalletConnect')).toBeTruthy();
        expect(screen.queryByText('Base Account')).toBeNull();
        expect(screen.queryByText('Argent')).toBeNull();
    });

    it('shows a clear empty state when no wallets match search', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'zzzzz' } });
        act(() => { vi.advanceTimersByTime(300); });

        expect(screen.getByText(/no wallets found matching your search/i)).toBeTruthy();
    });

    it('supports alphabetical sorting when selected', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.change(screen.getByLabelText(/sort wallets/i), {
            target: { value: 'alphabetical' },
        });

        expect(getWalletOrder()).toEqual([
            'Argent',
            'Base Account',
            'LOBSTR',
            'MetaMask',
            'WalletConnect',
        ]);
    });

    it('supports installed-first sorting when selected', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.change(screen.getByLabelText(/sort wallets/i), {
            target: { value: 'installed' },
        });

        expect(getWalletOrder()).toEqual([
            'Argent',
            'Base Account',
            'WalletConnect',
            'LOBSTR',
            'MetaMask',
        ]);
    });

    it('combines filters and sorting deterministically', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.click(screen.getByLabelText(/installed only/i));
        fireEvent.change(screen.getByLabelText(/sort wallets/i), {
            target: { value: 'alphabetical_desc' },
        });

        expect(getWalletOrder()).toEqual([
            'WalletConnect',
            'Base Account',
            'Argent',
        ]);
    });

    it('clearing filters restores the default wallet list', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.change(screen.getByLabelText(/wallet type/i), {
            target: { value: 'discovered' },
        });
        fireEvent.click(screen.getByLabelText(/installed only/i));
        fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

        expect(getWalletOrder()).toEqual([
            'Base Account',
            'Argent',
            'WalletConnect',
            'LOBSTR',
            'MetaMask',
        ]);
    });

    it('keeps wallet connection flow working after filtering and sorting', async () => {
        const connectWalletFn = vi.fn().mockResolvedValue({ success: true });
        const onConnect = vi.fn();

        await act(async () => {
            await renderModal({ connectWalletFn, onConnect });
        });

        fireEvent.change(screen.getByLabelText(/sort wallets/i), {
            target: { value: 'alphabetical' },
        });

        await act(async () => {
            fireEvent.click(screen.getByText('MetaMask'));
        });

        expect(connectWalletFn).toHaveBeenCalledWith('evm', null);
        expect(onConnect).toHaveBeenCalledWith('evm');
    });

    it('shows fallback wallet entries on secondary view when applicable', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.click(screen.getByRole('button', { name: /view more options/i }));

        expect(screen.getByText('EVM / Browser Wallets')).toBeTruthy();
        expect(screen.queryByText('Base Account')).toBeNull();
    });

    it('keeps search and sort composed together', async () => {
        await act(async () => { await renderModal(); });

        fireEvent.change(screen.getByPlaceholderText('Search wallets...'), {
            target: { value: 'a' },
        });
        act(() => { vi.advanceTimersByTime(300); });
        fireEvent.change(screen.getByLabelText(/sort wallets/i), {
            target: { value: 'alphabetical_desc' },
        });

        expect(getWalletOrder()).toEqual([
            'WalletConnect',
            'MetaMask',
            'EVM / Browser Wallets',
            'Base Account',
            'Argent',
        ]);
    });
});
