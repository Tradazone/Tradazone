// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, ExternalLink, AlertCircle, ChevronLeft } from 'lucide-react';
import Logo from './Logo';
import { useLobstr } from '../../hooks/useLobstr';
import {
    useAuthActions,
    useAuthWalletCatalog,
    useAuthWalletState,
} from '../../context/AuthContext';

// Icon components
function StellarIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6H22.4L16 14.1L18.4 21.7L12 17.2L5.6 21.7L8 14.1L1.6 9.6H9.6L12 2Z" fill="#3B82F6" />
        </svg>
    );
}

function ArgentIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <path d="M10 2L4 18h4.5L10 13l1.5 5H16L10 2z" fill="#FF875B" />
        </svg>
    );
}

function WalletIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
    );
}

function MetaMaskIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M29.5 5.5L20.5 13L24 19L29.5 24L31 16L29.5 5.5Z" fill="#E2761B"/>
            <path d="M2.5 5.5L11.5 13L8 19L2.5 24L1 16L2.5 5.5Z" fill="#E2761B"/>
            <path d="M24 19L20.5 13L16 2L11.5 13L8 19L16 22.5L24 19Z" fill="#E4761B"/>
            <path d="M24 19L16 22.5L16 30L21.5 28.5L29.5 24L24 19Z" fill="#D7C1B3"/>
            <path d="M8 19L16 22.5L16 30L10.5 28.5L2.5 24L8 19Z" fill="#D7C1B3"/>
            <path d="M16 22.5L21.5 28.5L16 30L10.5 28.5L16 22.5Z" fill="#F6851B"/>
        </svg>
    );
}

function PhantomIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16C28 9.37 22.63 4 16 4ZM19.5 16C18.12 16 17 14.88 17 13.5C17 12.12 18.12 11 19.5 11C20.88 11 22 12.12 22 13.5C22 14.88 20.88 16 19.5 16ZM12.5 16C11.12 16 10 14.88 10 13.5C10 12.12 11.12 11 12.5 11C13.88 11 15 12.12 15 13.5C15 14.88 13.88 16 12.5 16Z" fill="#AB9FF2"/>
        </svg>
    );
}

function BaseIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" fill="#0052FF" />
            <path d="M21 16C21 18.7614 18.7614 21 16 21C13.2386 21 11 18.7614 11 16C11 13.2386 13.2386 11 16 11H25V16H21Z" fill="#FFFFFF" />
        </svg>
    );
}

function WalletConnectIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#3B99FC" />
            <path d="M9.58 12.25C13.15 8.68 18.85 8.68 22.42 12.25L22.87 12.70C23.04 12.87 23.04 13.15 22.87 13.32L21.32 14.87C21.23 14.96 21.09 14.96 21.00 14.87L20.38 14.25C17.93 11.80 13.07 11.80 10.62 14.25L9.95 14.92C9.86 15.01 9.72 15.01 9.63 14.92L8.08 13.37C7.91 13.20 7.91 12.92 8.08 12.75L9.58 12.25ZM25.42 15.25L26.80 16.63C26.97 16.80 26.97 17.08 26.80 17.25L20.67 23.38C20.50 23.55 20.22 23.55 20.05 23.38L15.80 19.13C15.75 19.08 15.68 19.08 15.63 19.13L11.38 23.38C11.21 23.55 10.93 23.55 10.76 23.38L4.63 17.25C4.46 17.08 4.46 16.80 4.63 16.63L6.01 15.25C6.18 15.08 6.46 15.08 6.63 15.25L10.88 19.50C10.93 19.55 11.00 19.55 11.05 19.50L15.30 15.25C15.47 15.08 15.75 15.08 15.92 15.25L20.17 19.50C20.22 19.55 20.29 19.55 20.34 19.50L24.59 15.25C24.76 15.08 25.05 15.08 25.42 15.25Z" fill="white" />
        </svg>
    );
}

function getWalletIcon(w) {
    if (w.iconUri) return <img src={w.iconUri} alt={w.name} className="w-6 h-6" />;
    switch (w.id) {
        case 'stellar':        return <StellarIcon size={22} />;
        case 'starknet':       return <ArgentIcon size={20} />;
        case 'metamask':       return <MetaMaskIcon size={24} />;
        case 'phantom':        return <PhantomIcon size={24} />;
        case 'base':           return <BaseIcon size={24} />;
        case 'walletconnect':  return <WalletConnectIcon size={24} />;
        default:               return <WalletIcon size={20} />;
    }
}

function ConnectWalletModal({ isOpen, onClose, onConnect, connectWalletFn }) {
    const [connecting, setConnecting] = useState(null);
    const [error, setError] = useState(null);
    const [view, setView] = useState('primary'); // 'primary' | 'secondary'

    const { completeWalletLogin, disconnectAll } = useAuthActions();
    const { wallet } = useAuthWalletState();
    const { installed, availableWallets } = useAuthWalletCatalog();
    const lobstr = useLobstr();

    useEffect(() => {
        if (isOpen) {
            setConnecting(null);
            setError(null);
            setView('primary');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // WalletConnect v2 — shown only when VITE_WALLETCONNECT_PROJECT_ID is set
    const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
    const wcEntry = wcProjectId ? [{
        id:          'walletconnect',
        name:        'WalletConnect',
        network:     'evm',
        networkName: 'Any EVM wallet (mobile-friendly)',
        isInstalled: true,
        isSecondary: false,
    }] : [];

    const primaryWallets   = [...availableWallets.filter((w) => !w.isSecondary), ...wcEntry];
    const secondaryWallets = availableWallets.filter((w) => w.isSecondary);
    const walletsToShow    = view === 'primary' ? primaryWallets : secondaryWallets;

    const handleConnect = async (w) => {
        if (connecting) return;

        if (w.id === 'stellar') {
            const result = await lobstr.connect();
            if (result?.success) {
                completeWalletLogin(result.address, 'stellar');
                if (onConnect) onConnect('stellar');
            } else if (result?.error) {
                const isNotInstalled = result.error === 'NOT_INSTALLED';
                setError({ type: 'stellar', code: isNotInstalled ? 'not_installed' : 'failed', message: result.error });
            }
            return;
        }

        // WalletConnect v2 — lazy-loaded so it doesn't add to the initial bundle
        if (w.id === 'walletconnect') {
            setConnecting('walletconnect');
            setError(null);
            try {
                const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
                const provider = await EthereumProvider.init({
                    projectId:   import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
                    chains:      [1],
                    showQrModal: true,
                });
                await provider.connect();
                const accounts = provider.accounts;
                if (!accounts?.length) throw new Error('No accounts returned');
                completeWalletLogin(accounts[0], 'evm');
                if (onConnect) onConnect('evm');
            } catch (e) {
                if (e?.message !== 'Connection request reset. Please try again.') {
                    setError({ type: 'evm', code: 'failed', message: e?.message });
                }
                setConnecting(null);
            }
            return;
        }

        const type = w.id === 'starknet_generic' ? 'starknet_generic' : w.network;
        const provider = w.rdns
            ? installed.discovered?.find((p) => p.info.rdns === w.rdns)?.provider
            : (w.provider || null);

        setConnecting(w.id);
        setError(null);
        try {
            const result = await connectWalletFn(type, provider);
            if (result.success) {
                if (onConnect) onConnect(type);
            } else if (result.error === 'not_installed') {
                setError({ type: w.network, code: 'not_installed' });
                setConnecting(null);
            } else {
                setError({ type: w.network, code: 'failed', message: result.error });
                setConnecting(null);
            }
        } catch (e) {
            setError({ type: w.network, code: 'failed', message: e?.message });
            setConnecting(null);
        }
    };

    const networkBg = (network) => {
        if (network === 'stellar') return 'bg-blue-50';
        if (network === 'starknet') return 'bg-[#FF875B]/10';
        return 'bg-gray-100';
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity"
                onClick={() => !connecting && onClose()}
                aria-hidden="true"
            />

            {/* Modal — bottom sheet on mobile, centered card on desktop */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cwm-title"
                className="fixed z-50 bottom-0 left-0 right-0 lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up lg:animate-none"
            >
                {/* Drag handle — mobile only */}
                <div className="lg:hidden w-10 h-1 bg-border rounded-full mx-auto my-3 flex-shrink-0" />

                <div className="flex-1 overflow-y-auto w-full">
                    {/* Header */}
                    <div className="px-6 pt-2 pb-4 flex justify-between items-center border-b border-border/50 flex-shrink-0">
                        {view === 'primary' ? (
                            <Logo variant="light" className="h-6" />
                        ) : (
                            <button
                                onClick={() => setView('primary')}
                                className="flex items-center gap-1.5 text-sm font-semibold text-t-primary hover:text-brand transition-colors"
                            >
                                <ChevronLeft size={18} /> Back
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            disabled={connecting !== null}
                            aria-label="Close modal"
                            className="text-t-muted hover:text-t-primary transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6">
                        <h2 id="cwm-title" className="text-xl font-bold text-t-primary mb-2">
                            Connect your wallet
                        </h2>
                        <p className="text-sm text-t-muted mb-6">
                            Choose how you'd like to connect to Tradazone to start accepting payments.
                        </p>

                        {/* Wallet list */}
                        <div className="flex flex-col gap-3">
                            {walletsToShow.map((w) => {
                                const isThisConnecting = connecting === w.id || (w.id === 'stellar' && lobstr.isConnecting);
                                const isDisabled = connecting !== null;
                                return (
                                    <button
                                        key={w.id}
                                        onClick={() => handleConnect(w)}
                                        disabled={isDisabled}
                                        className={`w-full text-left p-4 border flex items-center justify-between transition-all outline-none
                                            ${isThisConnecting
                                                ? 'border-brand/40 bg-brand/5'
                                                : isDisabled
                                                    ? 'border-border/50 opacity-50'
                                                    : 'border-border hover:border-brand/30 hover:bg-brand/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${networkBg(w.network)}`}>
                                                {getWalletIcon(w)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary flex items-center gap-2">
                                                    {w.name}
                                                    {w.isRecommended && (
                                                        <span className="text-[10px] uppercase font-bold tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5">
                                                            Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-t-muted">{w.networkName}</div>
                                            </div>
                                        </div>
                                        {isThisConnecting ? (
                                            <span className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                                        ) : (w.isInstalled || w.rdns) ? (
                                            <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1">
                                                Installed
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        {walletsToShow.length === 0 && (
                            <p className="text-center py-8 text-t-muted text-sm">No wallets available.</p>
                        )}

                        {/* View more / back */}
                        {view === 'primary' && secondaryWallets.length > 0 && (
                            <button
                                onClick={() => setView('secondary')}
                                disabled={connecting !== null}
                                className="w-full mt-4 text-center text-sm font-semibold text-t-secondary hover:text-brand transition-colors p-3 border border-transparent hover:border-border hover:bg-gray-50 disabled:opacity-50"
                            >
                                View more options
                            </button>
                        )}

                        {/* Error */}
                        {error?.code === 'not_installed' && (
                            <div className="mt-4 p-3 bg-error-bg border border-error/20 flex items-start gap-2 text-sm text-error">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        {error.type === 'stellar' ? 'LOBSTR is not installed.' :
                                         error.type === 'starknet' ? 'Argent X is not installed.' :
                                         'Wallet extension not detected.'}
                                    </p>
                                    {(error.type === 'stellar' || error.type === 'starknet') && (
                                        <a
                                            href={error.type === 'stellar' ? 'https://lobstr.co/' : 'https://www.argent.xyz/argent-x/'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 font-semibold underline mt-1"
                                        >
                                            Install extension <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {error?.code === 'failed' && (
                            <div className="mt-4 p-3 bg-error-bg border border-error/20 flex items-start gap-2 text-sm text-error">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        {error.message === 'LOCKED' ? 'Wallet is locked — open the extension and enter your password.' :
                                         error.message === 'ACCESS_DENIED' ? 'Access denied — allow this site in your wallet extension.' :
                                         'Connection failed. Please try again.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Disconnect */}
                        {wallet?.isConnected && (
                            <button
                                onClick={async () => { await disconnectAll(); onClose(); }}
                                disabled={connecting !== null}
                                className="mt-5 w-full text-center text-sm font-semibold text-error hover:text-error/80 transition-colors p-3 border border-transparent hover:border-error/20 hover:bg-error-bg disabled:opacity-50"
                            >
                                Disconnect all wallets
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default ConnectWalletModal;
