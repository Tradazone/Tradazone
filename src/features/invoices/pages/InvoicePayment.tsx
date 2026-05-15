import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Copy, ExternalLink, ShieldCheck, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useData } from '../../../context/DataContext';
import { priceService } from '../../../services/priceService';
import { supabase } from '../../../lib/supabase';
import StatusBadge from '../../../components/tables/StatusBadge';
import Logo from '../../../components/ui/Logo';
import { sendPaymentReceiptToCustomer, sendPaymentReceivedToSender } from '../../../services/emailService';

// Fallback user setting addresses if context doesn't provide it
// This represents the merchant's connected wallet addresses
const MERCHANT_WALLETS: Record<string, string> = {
    ETH:  '0x1234567890123456789012345678901234567890',
    STRK: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    XLM:  'GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC',
};

function InvoicePayment() {
    const { invoiceId } = useParams();
    const { invoices, customers, markInvoicePaid } = useData();

    // Find invoice
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const customer = customers.find(c => c.id === invoice?.customerId);

    const [selectedCurrency, setSelectedCurrency] = useState('ETH');
    const [cryptoAmount, setCryptoAmount] = useState('0.00');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
    const [paymentStatus, setPaymentStatus] = useState(invoice?.status || 'pending');

    // Calculate USD value (assuming invoice amount is in USD for this flow)
    const amountUSD = parseFloat((invoice?.amount || '0').replace(/,/g, ''));

    useEffect(() => {
        if (!invoice) return;
        setPaymentStatus(invoice.status);
    }, [invoice]);

    // Timer logic
    useEffect(() => {
        if (paymentStatus === 'paid') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [paymentStatus]);

    // Conversion and QR Code generation
    useEffect(() => {
        if (!invoice || paymentStatus === 'paid') return;

        const updateConversionAndQR = async () => {
            const amount = await priceService.convertFiatToCrypto(amountUSD, selectedCurrency);
            setCryptoAmount(amount.toString());

            const address = MERCHANT_WALLETS[selectedCurrency];
            const paymentUri = `${selectedCurrency.toLowerCase()}:${address}?amount=${amount}`;

            try {
                const url = await QRCode.toDataURL(paymentUri, {
                    width: 200,
                    margin: 1,
                    color: { dark: '#1e293b', light: '#ffffff' }
                });
                setQrCodeUrl(url);
            } catch (err) {
                console.error('QR generation failed:', err);
            }
        };

        updateConversionAndQR();
        // Update conversion every minute
        const interval = setInterval(updateConversionAndQR, 60000);
        return () => clearInterval(interval);
    }, [selectedCurrency, amountUSD, invoice, paymentStatus]);

    // Poll Supabase every 5 s — server-side monitors (monitor-payments cron +
    // payment-webhook for EVM) update the invoice status when a payment arrives.
    useEffect(() => {
        if (!invoice || paymentStatus === 'paid') return;

        const poll = setInterval(async () => {
            const { data } = await supabase
                .from('invoices')
                .select('status, tx_hash, tx_network, tx_amount, tx_currency')
                .eq('id', invoiceId)
                .single();

            if (data?.status === 'paid') {
                clearInterval(poll);
                setPaymentStatus('paid');

                const txDetails = {
                    hash:     data.tx_hash     || '',
                    network:  data.tx_network  || '',
                    amount:   data.tx_amount   || '',
                    currency: data.tx_currency || '',
                };

                markInvoicePaid(invoiceId ?? '', txDetails);

                if (customer?.email) {
                    sendPaymentReceiptToCustomer(invoice, txDetails).catch(() => {});
                }
                sendPaymentReceivedToSender(invoice, txDetails).catch(() => {});
            }
        }, 5000);

        return () => clearInterval(poll);
    }, [invoice, paymentStatus, invoiceId, markInvoicePaid, customer]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (!invoice) {
        return (
            <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-card border border-border text-center max-w-md w-full">
                    <h2 className="text-xl font-bold text-t-primary mb-2">Invoice Not Found</h2>
                    <p className="text-t-muted mb-6">The requested invoice could not be found or has been removed.</p>
                    <Link to="/" className="text-brand hover:underline">Return to Home</Link>
                </div>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-bg-app flex flex-col">
            <header className="bg-white border-b border-border p-4 flex justify-between items-center">
                <Logo />
                <StatusBadge status={paymentStatus} />
            </header>

            <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
                <div className="bg-white w-full max-w-3xl rounded-card border border-border shadow-sm overflow-hidden flex flex-col md:flex-row">

                    {/* Invoice Summary Side */}
                    <div className="p-6 lg:p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-border bg-gray-50 flex flex-col justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-brand mb-1">TRADAZONE PAYMENT</h2>
                            <h1 className="text-2xl font-bold text-t-primary mb-6">Invoice {invoice.id}</h1>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <span className="block text-xs text-t-muted mb-1">Billed To</span>
                                    <span className="font-medium text-t-primary">{invoice.customer}</span>
                                </div>
                                <div className="flex justify-between border-b border-border pb-4">
                                    <span className="text-t-muted">Total Due</span>
                                    <span className="font-bold text-t-primary">${amountUSD.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-t-muted">
                            <ShieldCheck size={16} className="text-success" />
                            <span>Payments are secure and verified on-chain.</span>
                        </div>
                    </div>

                    {/* Payment Side */}
                    <div className="p-6 lg:p-8 md:w-1/2">
                        {paymentStatus === 'paid' ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                <div className="w-16 h-16 bg-success-bg text-success rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-t-primary">Payment Complete</h2>
                                <p className="text-t-muted">Thank you. Your transaction has been verified.</p>
                                {invoice.txHash && (
                                    <a href={`#`} className="text-brand hover:underline text-sm inline-flex items-center gap-1 mt-4">
                                        View Transaction <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        ) : timeLeft === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                <div className="w-16 h-16 bg-warning-bg text-warning rounded-full flex items-center justify-center mb-2">
                                    <Clock size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-t-primary">Quote Expired</h2>
                                <p className="text-t-muted">The exchange rate quote has expired.</p>
                                <button
                                    onClick={() => setTimeLeft(15 * 60)}
                                    className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium mt-4 hover:bg-brand/90 transition-colors"
                                >
                                    Generate New Quote
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-t-primary">Select Currency</h3>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-warning bg-warning-bg px-2.5 py-1 rounded-md">
                                        <Clock size={14} />
                                        {formatTime(timeLeft)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {['ETH', 'STRK', 'XLM'].map(curr => (
                                        <button
                                            key={curr}
                                            onClick={() => setSelectedCurrency(curr)}
                                            className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${
                                                selectedCurrency === curr
                                                    ? 'border-brand bg-brand/5 text-brand'
                                                    : 'border-border text-t-secondary hover:border-brand/40'
                                            }`}
                                        >
                                            {curr}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-gray-50 border border-border rounded-xl p-6 flex flex-col items-center mb-6 relative">
                                    <div className="absolute top-0 right-0 bg-brand text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
                                        Awaiting Payment
                                    </div>
                                    <div className="text-center mb-4 mt-2">
                                        <span className="block text-xs text-t-muted mb-1">Amount to send</span>
                                        <div className="text-2xl font-bold text-t-primary flex items-baseline justify-center gap-1">
                                            {cryptoAmount} <span className="text-sm font-medium text-t-muted">{selectedCurrency}</span>
                                        </div>
                                    </div>

                                    <div className="p-2 bg-white rounded-lg border border-border mb-4">
                                        {qrCodeUrl ? (
                                            <img src={qrCodeUrl} alt="Payment QR Code" className="w-32 h-32" />
                                        ) : (
                                            <div className="w-32 h-32 bg-gray-100 animate-pulse flex items-center justify-center rounded-md">
                                                <span className="text-xs text-t-muted">Loading QR...</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full">
                                        <span className="block text-[11px] text-t-muted mb-1 text-center">{selectedCurrency} Address</span>
                                        <div className="flex items-center gap-2 bg-white border border-border rounded-md p-2">
                                            <span className="text-xs font-mono text-t-secondary truncate flex-1 select-all">
                                                {MERCHANT_WALLETS[selectedCurrency]}
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(MERCHANT_WALLETS[selectedCurrency])}
                                                className="p-1.5 text-t-muted hover:text-brand transition-colors rounded hover:bg-gray-50"
                                                title="Copy address"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[11px] text-center text-t-muted">
                                    Send exactly {cryptoAmount} {selectedCurrency} to the address above. The invoice will update automatically once verified.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default InvoicePayment;
