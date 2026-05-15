// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ChevronDown, AlertCircle, Download } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { priceService } from '../../../services/priceService';
import { generateReceipt } from '../../../utils/generateReceipt';
import Logo from '../../../components/ui/Logo';
import ConnectWalletModal from '../../../components/ui/ConnectWalletModal';

// ─── Constants ───────────────────────────────────────────────────────────────

const CRYPTO_OPTIONS = ['STRK', 'ETH', 'XLM'];

const FIAT_OPTIONS = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'NGN', symbol: '₦' },
];

const COUNTRIES = [
    'United States', 'United Kingdom', 'Nigeria', 'Canada', 'Germany',
    'France', 'Australia', 'Japan', 'Brazil', 'India', 'South Africa',
    'UAE', 'Singapore', 'Netherlands', 'Sweden', 'Switzerland',
    'Ghana', 'Kenya', 'Egypt', 'Other',
];

// Fallback merchant receiving addresses.
// In production these come from invoice.paymentAddress (set by the merchant's wallet).
const FALLBACK_MERCHANT_WALLETS = {
    STRK: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ETH:  '0x1234567890123456789012345678901234567890',
    XLM:  'GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC',
};

// STRK ERC-20 contract on Starknet mainnet
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(addr = '', head = 8, tail = 6) {
    if (addr.length <= head + tail + 3) return addr;
    return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ invoice, customer, cryptoAmount, selectedCrypto, txHash, network, email, fiatAmount, fiatCurrency }) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await generateReceipt({
                id:             invoice.id,
                merchantName:   invoice.customer,
                customerEmail:  email || customer?.email,
                items:          invoice.items || [],
                fiatAmount,
                fiatCurrency,
                cryptoAmount,
                selectedCrypto,
                txHash,
                network,
                paidAt:         invoice.paidAt || new Date().toISOString(),
            });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-brand py-4 flex items-center justify-center">
                <Logo variant="dark" className="h-7" />
            </header>
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white border border-border rounded-card p-12 text-center max-w-md w-full shadow-sm">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-t-primary mb-2">Payment Complete</h2>
                    <p className="text-t-muted mb-6">
                        Your payment of{' '}
                        <span className="font-semibold text-t-primary">{cryptoAmount} {selectedCrypto}</span>{' '}
                        has been submitted successfully.
                    </p>
                    {txHash && (
                        <div className="text-xs font-mono text-t-muted break-all border border-border rounded-lg p-3 bg-gray-50 text-left mb-6">
                            <span className="block text-[10px] uppercase font-semibold text-t-muted mb-1 tracking-wider">
                                Transaction hash
                            </span>
                            {txHash}
                        </div>
                    )}
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="w-full inline-flex items-center justify-center gap-2 bg-brand text-white rounded py-3 text-sm font-semibold hover:bg-brand/90 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                        <Download size={16} />
                        {downloading ? 'Generating PDF…' : 'Download Receipt'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Not-found screen ─────────────────────────────────────────────────────────

function NotFoundScreen() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-brand py-4 flex items-center justify-center">
                <Logo variant="dark" className="h-7" />
            </header>
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white border border-border rounded-card p-10 text-center max-w-md w-full shadow-sm">
                    <h2 className="text-xl font-bold text-t-primary mb-2">Invoice Not Found</h2>
                    <p className="text-t-muted text-sm">
                        This payment link is invalid or the invoice has been removed.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function InvoiceCheckout() {
    const { invoiceId } = useParams();
    const { invoices, customers, markInvoicePaid } = useData();
    const { connectWallet, wallet } = useAuth();

    const invoice  = invoices.find(inv => inv.id === invoiceId);
    const customer = customers.find(c => c.id === invoice?.customerId);

    // ── Form state
    const [email,   setEmail]   = useState(customer?.email || '');
    const [country, setCountry] = useState('United States');

    // ── Pricing state
    const [selectedCrypto, setSelectedCrypto] = useState('STRK');
    const [displayFiat,    setDisplayFiat]    = useState('USD');
    const [cryptoAmount,   setCryptoAmount]   = useState('');
    const [displayAmount,  setDisplayAmount]  = useState('');
    const [loadingRate,    setLoadingRate]     = useState(true);

    // ── Payment state
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [paymentStatus,   setPaymentStatus]   = useState('idle'); // idle | processing | success | error
    const [txHash,          setTxHash]          = useState('');
    const [errorMsg,        setErrorMsg]        = useState('');

    // Treat invoice amount as the base USD value
    const baseAmountUSD = parseFloat((invoice?.amount || '0').replace(/,/g, '')) || 0;
    const fiatInfo = FIAT_OPTIONS.find(f => f.code === displayFiat) || FIAT_OPTIONS[0];

    const walletConnected = wallet?.isConnected;

    // Warn if connected wallet currency doesn't match selected crypto
    const walletCurrencyMismatch = walletConnected && wallet.currency !== selectedCrypto;

    // Merchant receiving address — prefer address stored on the invoice
    const merchantAddress =
        invoice?.paymentAddress ||
        FALLBACK_MERCHANT_WALLETS[selectedCrypto];

    // ── Live rate conversion ──────────────────────────────────────────────────
    useEffect(() => {
        if (!invoice) return;
        let cancelled = false;

        setLoadingRate(true);

        Promise.all([
            priceService.convertFiatToCrypto(baseAmountUSD, selectedCrypto, 'usd'),
            priceService.getFiatRate('usd', displayFiat.toLowerCase()),
        ]).then(([crypto, fiatRate]) => {
            if (cancelled) return;
            setCryptoAmount(crypto.toString());
            setDisplayAmount((baseAmountUSD * fiatRate).toFixed(2));
            setLoadingRate(false);
        }).catch(() => {
            if (!cancelled) setLoadingRate(false);
        });

        return () => { cancelled = true; };
    }, [selectedCrypto, displayFiat, baseAmountUSD, invoice]);

    // ── Payment execution ─────────────────────────────────────────────────────
    const handleConfirmPayment = async () => {
        if (!walletConnected || !email || loadingRate) return;
        setPaymentStatus('processing');
        setErrorMsg('');

        try {
            let hash = '';

            if (selectedCrypto === 'STRK') {
                const starknet = window.starknet_argentX || window.starknet;
                if (!starknet?.account) {
                    throw new Error('Starknet wallet not connected. Please reconnect your wallet.');
                }
                // STRK is an ERC-20 — call transfer on the token contract
                const amountBN = BigInt(Math.round(parseFloat(cryptoAmount) * 1e18));
                const low  = (amountBN & BigInt('0xffffffffffffffffffffffffffffffff')).toString();
                const high = (amountBN >> BigInt(128)).toString();

                const result = await starknet.account.execute([{
                    contractAddress: STRK_TOKEN_ADDRESS,
                    entrypoint: 'transfer',
                    calldata: [merchantAddress, low, high],
                }]);
                hash = result.transaction_hash;

            } else if (selectedCrypto === 'ETH') {
                const { BrowserProvider, parseEther } = await import('ethers');
                const provider = new BrowserProvider(window.ethereum);
                const signer   = await provider.getSigner();
                const tx       = await signer.sendTransaction({
                    to:    merchantAddress,
                    value: parseEther(cryptoAmount),
                });
                await tx.wait(1);
                hash = tx.hash;

            } else if (selectedCrypto === 'XLM') {
                const [StellarSdk, lobstrApi] = await Promise.all([
                    import('stellar-sdk'),
                    import('@lobstrco/signer-extension-api'),
                ]);
                const { Horizon, TransactionBuilder, Operation, Asset, Networks, BASE_FEE } = StellarSdk;
                const server  = new Horizon.Server('https://horizon.stellar.org');
                const account = await server.loadAccount(wallet.address);

                const tx = new TransactionBuilder(account, {
                    fee: BASE_FEE,
                    networkPassphrase: Networks.PUBLIC,
                })
                    .addOperation(Operation.payment({
                        destination: merchantAddress,
                        asset:       Asset.native(),
                        amount:      cryptoAmount,
                    }))
                    .setTimeout(30)
                    .build();

                const xdr      = tx.toXDR();
                const signed   = await lobstrApi.signTransaction(xdr);
                const signedTx = TransactionBuilder.fromXDR(signed.signedXDR, Networks.PUBLIC);
                const submit   = await server.submitTransaction(signedTx);
                hash = submit.hash;
            }

            markInvoicePaid(invoiceId, {
                hash,
                network:  selectedCrypto === 'ETH' ? 'evm' : selectedCrypto === 'STRK' ? 'starknet' : 'stellar',
                amount:   cryptoAmount,
                currency: selectedCrypto,
            });

            setTxHash(hash);
            setPaymentStatus('success');

        } catch (err) {
            const raw = err?.message || 'Payment failed. Please try again.';
            setErrorMsg(raw.length > 120 ? 'Payment failed. Please try again.' : raw);
            setPaymentStatus('error');
        }
    };

    // ── Early returns ─────────────────────────────────────────────────────────
    if (!invoice) return <NotFoundScreen />;

    if (paymentStatus === 'success' || invoice.status === 'paid') {
        return (
            <SuccessScreen
                invoice={invoice}
                customer={customer}
                cryptoAmount={cryptoAmount}
                selectedCrypto={selectedCrypto}
                txHash={txHash}
                network={selectedCrypto === 'ETH' ? 'Ethereum' : selectedCrypto === 'STRK' ? 'Starknet' : 'Stellar'}
                email={email}
                fiatAmount={baseAmountUSD}
                fiatCurrency={displayFiat}
            />
        );
    }

    // Derived display values
    const merchantName = invoice.customer || 'Merchant';
    const itemName     = invoice.items?.[0]?.name || 'Invoice Payment';
    const itemSummary  = invoice.items
        ?.map(item => `${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`)
        .join(', ') || '';

    const confirmDisabled =
        !walletConnected ||
        !email           ||
        paymentStatus === 'processing' ||
        loadingRate;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* ── Blue header ── */}
            <header className="bg-brand py-4 flex items-center justify-center">
                <Logo variant="dark" className="h-7" />
            </header>

            <main className="flex-1 flex justify-center p-4 lg:p-8">
                <div className="w-full max-w-4xl">

                    {/* ── Title / price bar ── */}
                    <div className="bg-white border border-border border-b-0 px-5 py-4 flex items-center justify-between">
                        <h1 className="text-base font-semibold text-t-primary">{itemName}</h1>

                        <div className="flex items-center gap-2.5">
                            <span className="text-sm text-t-muted">Price</span>

                            {/* Fiat currency selector */}
                            <div className="relative">
                                <select
                                    value={displayFiat}
                                    onChange={e => setDisplayFiat(e.target.value)}
                                    className="appearance-none border border-border rounded px-2.5 py-1 pr-6 text-xs font-semibold text-t-secondary outline-none focus:border-brand cursor-pointer bg-white"
                                >
                                    {FIAT_OPTIONS.map(f => (
                                        <option key={f.code} value={f.code}>{f.code}</option>
                                    ))}
                                </select>
                                <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none" />
                            </div>

                            {/* Crypto equivalent badge */}
                            <div className="border border-brand/40 rounded px-3 py-1 flex items-baseline gap-1.5 min-w-[100px] justify-center bg-white">
                                <span className="text-sm font-bold text-t-primary">
                                    {loadingRate ? '—' : cryptoAmount}
                                </span>
                                <span className="text-xs font-semibold text-brand">{selectedCrypto}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Main card ── */}
                    <div className="bg-white border border-border shadow-sm flex flex-col md:flex-row min-h-[380px]">

                        {/* ── LEFT: merchant & item info ── */}
                        <div className="md:w-[44%] border-b md:border-b-0 md:border-r border-border flex flex-col">

                            {/* Merchant row */}
                            <div className="flex border-b border-border">
                                {/* Avatar + name */}
                                <div className="flex items-center gap-2.5 px-4 py-3 border-r border-border shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 overflow-hidden">
                                        <span className="text-sm font-bold text-brand uppercase select-none">
                                            {merchantName.charAt(0)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-t-primary whitespace-nowrap">
                                        {merchantName}
                                    </span>
                                </div>

                                {/* Item label */}
                                <div className="flex items-center px-4 py-3 overflow-hidden">
                                    <span className="text-sm text-t-muted truncate">{itemName}</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <p className="text-sm text-t-secondary leading-relaxed">{itemSummary}</p>

                                {/* Fiat + crypto summary */}
                                <div className="mt-5 pt-4 border-t border-border space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-t-muted">Amount due</span>
                                        <span className="font-semibold text-t-primary">
                                            {fiatInfo.symbol}{loadingRate ? '—' : displayAmount} {displayFiat}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-t-muted">≈ in {selectedCrypto}</span>
                                        <span className="font-medium text-brand">
                                            {loadingRate ? '—' : cryptoAmount} {selectedCrypto}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: payment form ── */}
                        <div className="flex-1 p-5 flex flex-col gap-4">

                            {/* Email */}
                            <div>
                                <label className="block text-sm text-t-secondary mb-1.5">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full border border-border rounded px-3 py-2 text-sm text-t-primary placeholder:text-t-muted outline-none focus:border-brand transition-colors"
                                />
                            </div>

                            {/* Country */}
                            <div>
                                <label className="block text-sm text-t-secondary mb-1.5">
                                    Country
                                </label>
                                <div className="relative">
                                    <select
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        className="w-full appearance-none border border-brand/30 rounded px-3 py-2 pr-8 text-sm text-t-primary outline-none focus:border-brand transition-colors bg-white"
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none" />
                                </div>
                            </div>

                            {/* Crypto selector — above "Pay with" */}
                            <div>
                                <label className="block text-sm text-t-secondary mb-1.5">
                                    Select cryptocurrency
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCrypto}
                                        onChange={e => setSelectedCrypto(e.target.value)}
                                        className="w-full appearance-none border border-border rounded px-3 py-2 pr-8 text-sm text-t-primary outline-none focus:border-brand transition-colors bg-white"
                                    >
                                        {CRYPTO_OPTIONS.map(symbol => (
                                            <option key={symbol} value={symbol}>{symbol}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none" />
                                </div>
                            </div>

                            {/* Pay with / wallet */}
                            <div>
                                <label className="block text-sm text-t-secondary mb-1.5">
                                    Pay with
                                </label>

                                {walletConnected ? (
                                    <div className="border border-green-200 bg-green-50 rounded px-3 py-2.5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-green-700">
                                            Wallet connected
                                        </span>
                                        <span className="text-xs font-mono text-green-600">
                                            {truncate(wallet.address)}
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setWalletModalOpen(true)}
                                        className="w-full border border-border rounded px-3 py-2.5 text-sm text-t-primary font-medium hover:border-brand/40 hover:bg-gray-50 transition-colors text-center"
                                    >
                                        Connect wallet
                                    </button>
                                )}

                                {/* Wallet/crypto mismatch hint */}
                                {walletCurrencyMismatch && (
                                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                                        <AlertCircle size={12} className="shrink-0" />
                                        Your connected wallet uses {wallet.currency}. Switch to {selectedCrypto} or change your selection.
                                    </p>
                                )}
                            </div>

                            {/* Error message */}
                            {paymentStatus === 'error' && errorMsg && (
                                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2.5">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                    {errorMsg}
                                </div>
                            )}

                            {/* Confirm payment */}
                            <button
                                onClick={handleConfirmPayment}
                                disabled={confirmDisabled}
                                className="mt-auto w-full bg-brand text-white rounded py-3 text-sm font-semibold hover:bg-brand/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {paymentStatus === 'processing' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing…
                                    </>
                                ) : (
                                    `Confirm payment · ${loadingRate ? '—' : cryptoAmount} ${selectedCrypto}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Connect wallet modal ── */}
            <ConnectWalletModal
                isOpen={walletModalOpen}
                onClose={() => setWalletModalOpen(false)}
                connectWalletFn={connectWallet}
                onConnect={() => setWalletModalOpen(false)}
            />
        </div>
    );
}

export default InvoiceCheckout;
