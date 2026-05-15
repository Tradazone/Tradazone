// @ts-nocheck
import { useState } from 'react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/forms/Button';
import { useAuth } from '../../../context/AuthContext';
import ConnectWalletModal from '../../../components/ui/ConnectWalletModal';
import {
    FIAT_CURRENCIES,
    CRYPTO_CURRENCIES,
    FIAT_SYMBOLS,
    getCurrencyPreference,
    saveCurrencyPreference,
    isFiat,
} from '../../../utils/currencyPreference';

function StellarIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6H22.4L16 14.1L18.4 21.7L12 17.2L5.6 21.7L8 14.1L1.6 9.6H9.6L12 2Z" fill="currentColor" />
        </svg>
    );
}

const CURRENCY_NAMES = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    NGN: 'Nigerian Naira',
    STRK: 'Starknet',
    ETH: 'Ethereum',
    XLM: 'Stellar',
};

function PaymentSettings() {
    const { wallet, walletType, connectWallet, disconnectWallet } = useAuth();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const saved = getCurrencyPreference();

    // Split saved value into which group is active and which option is selected
    const [fiatValue,   setFiatValue]   = useState(isFiat(saved) ? saved : FIAT_CURRENCIES[0]);
    const [cryptoValue, setCryptoValue] = useState(!isFiat(saved) ? saved : CRYPTO_CURRENCIES[0]);
    const [activeGroup, setActiveGroup] = useState(isFiat(saved) ? 'fiat' : 'crypto');
    const [saveLabel,   setSaveLabel]   = useState('Save preference');

    const isStellar = walletType === 'stellar';

    const handleSwitchNetwork = async () => {
        await disconnectWallet();
        navigate('/signin');
    };

    // Selecting a fiat option activates the fiat group
    const handleFiatChange = (e) => {
        setFiatValue(e.target.value);
        setActiveGroup('fiat');
        setSaveLabel('Save preference');
    };

    // Selecting a crypto option activates the crypto group
    const handleCryptoChange = (e) => {
        setCryptoValue(e.target.value);
        setActiveGroup('crypto');
        setSaveLabel('Save preference');
    };

    const handleSave = () => {
        const chosen = activeGroup === 'fiat' ? fiatValue : cryptoValue;
        saveCurrencyPreference(chosen);
        setSaveLabel('✓ Saved');
        setTimeout(() => setSaveLabel('Save preference'), 2000);
    };

    const activeDisplay = activeGroup === 'fiat'
        ? `${fiatValue} (${FIAT_SYMBOLS[fiatValue] || fiatValue})`
        : `${cryptoValue}`;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">Payment Settings</h2>

            {/* ── Connected wallet ── */}
            <div className="flex items-center gap-4 p-5 bg-white border border-border rounded-card">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isStellar ? 'bg-blue-50 text-blue-600' : 'bg-brand-bg text-brand'}`}>
                    {isStellar ? <StellarIcon size={22} /> : <Wallet size={22} />}
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold">
                        {isStellar ? 'Freighter Wallet' : 'Argent Wallet'}
                    </div>
                    <div className="text-xs text-t-muted font-mono">
                        {wallet.isConnected ? wallet.address : 'Not connected'}
                    </div>
                </div>
                {wallet.isConnected ? (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleSwitchNetwork} className="hidden sm:flex">
                            Switch Network
                        </Button>
                        <Button variant="secondary" onClick={disconnectWallet}>
                            <span className="hidden sm:inline">Disconnect</span>
                            <LogOut size={16} className="sm:hidden" />
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>Connect Wallet</Button>
                )}
            </div>

            {/* ── Wallet balance ── */}
            <div className="p-5 bg-page rounded-card">
                <h3 className="text-sm font-semibold mb-2">Wallet Balance</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{wallet.balance}</span>
                    <span className="text-t-muted">{wallet.currency}</span>
                </div>
            </div>

            {/* ── Display currency preference ── */}
            <div className="bg-white border border-border rounded-card p-5">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-t-primary">Display Currency</h3>
                    <p className="text-xs text-t-muted mt-1">
                        Choose how prices appear across the app. Select from either group — whichever you pick last becomes the active display currency.
                    </p>
                </div>

                {/* Side-by-side dropdowns */}
                <div className="grid grid-cols-2 gap-4 mb-5">

                    {/* Fiat dropdown */}
                    <div>
                        <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${activeGroup === 'fiat' ? 'text-brand' : 'text-t-muted'}`}>
                            Fiat currency
                        </label>
                        <div className={`relative rounded-lg border transition-colors ${activeGroup === 'fiat' ? 'border-brand ring-1 ring-brand/20' : 'border-border'}`}>
                            <select
                                value={fiatValue}
                                onChange={handleFiatChange}
                                className="w-full appearance-none bg-white px-3 py-2.5 pr-8 text-sm text-t-primary outline-none rounded-lg cursor-pointer"
                            >
                                {FIAT_CURRENCIES.map(code => (
                                    <option key={code} value={code}>
                                        {FIAT_SYMBOLS[code]} {code} — {CURRENCY_NAMES[code]}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none" />
                        </div>
                        {activeGroup === 'fiat' && (
                            <p className="text-[11px] text-brand mt-1 font-medium">Active</p>
                        )}
                    </div>

                    {/* Crypto dropdown */}
                    <div>
                        <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${activeGroup === 'crypto' ? 'text-brand' : 'text-t-muted'}`}>
                            Cryptocurrency
                        </label>
                        <div className={`relative rounded-lg border transition-colors ${activeGroup === 'crypto' ? 'border-brand ring-1 ring-brand/20' : 'border-border'}`}>
                            <select
                                value={cryptoValue}
                                onChange={handleCryptoChange}
                                className="w-full appearance-none bg-white px-3 py-2.5 pr-8 text-sm text-t-primary outline-none rounded-lg cursor-pointer"
                            >
                                {CRYPTO_CURRENCIES.map(code => (
                                    <option key={code} value={code}>
                                        {code} — {CURRENCY_NAMES[code]}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none" />
                        </div>
                        {activeGroup === 'crypto' && (
                            <p className="text-[11px] text-brand mt-1 font-medium">Active</p>
                        )}
                    </div>
                </div>

                {/* Current selection preview */}
                <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-brand/5 border border-brand/20 rounded-lg">
                    <span className="text-xs text-t-muted">Will display as:</span>
                    <span className="text-sm font-semibold text-brand">{activeDisplay}</span>
                </div>

                <Button variant="primary" onClick={handleSave}>
                    {saveLabel}
                </Button>
            </div>

            {/* ── Network info ── */}
            <div className={`p-5 rounded-card ${isStellar ? 'bg-blue-50 text-blue-600' : 'bg-brand-bg text-brand'}`}>
                <p className="text-sm">
                    <strong>{isStellar ? 'Stellar Network' : 'Starknet Network'}</strong><br />
                    Payments are processed on the {isStellar ? 'Stellar' : 'Starknet'} network. Make sure your wallet is connected to receive payments.
                </p>
            </div>

            <ConnectWalletModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                connectWalletFn={connectWallet}
            />
        </div>
    );
}

export default PaymentSettings;
