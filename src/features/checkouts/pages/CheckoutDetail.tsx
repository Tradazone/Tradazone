import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Copy, Link as LinkIcon, Edit, Trash2, ExternalLink,
    Check, Share2, X, MessageCircle, Mail, QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import Button from '../../../components/forms/Button';
import StatusBadge from '../../../components/tables/StatusBadge';
import { useData } from '../../../context/DataContext';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';

type BtnProps = { variant?: string; icon?: unknown; onClick?: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode; className?: string };
const Btn = Button as React.ComponentType<BtnProps>;

function CheckoutDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { checkouts, deleteCheckout } = useData();
    const displayCurrency = useCurrencyPreference();
    const checkout = checkouts.find(c => c.id === (id ?? ''));

    const [copied,            setCopied]            = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm]  = useState(false);
    const [showQrModal,       setShowQrModal]        = useState(false);
    const [qrDataUrl,         setQrDataUrl]          = useState('');

    // Generate QR code for the payment link
    useEffect(() => {
        if (!checkout?.paymentLink) return;
        QRCode.toDataURL(checkout.paymentLink, { width: 260, margin: 2 })
            .then((url: string) => setQrDataUrl(url))
            .catch(() => {});
    }, [checkout?.paymentLink]);

    // Close QR modal on Escape
    useEffect(() => {
        if (!showQrModal) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowQrModal(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [showQrModal]);

    if (!checkout) return <div className="p-8"><p className="text-t-muted">Checkout not found</p></div>;

    const copyLink = () => {
        navigator.clipboard.writeText(checkout.paymentLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeleteConfirmed = () => {
        deleteCheckout(id ?? '');
        navigate('/checkout');
    };

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Pay me via Tradazone: ${checkout.paymentLink}`)}`;
    const emailUrl    = `mailto:?subject=${encodeURIComponent(`Payment request — ${checkout.title}`)}&body=${encodeURIComponent(`Please use this link to pay:\n\n${checkout.paymentLink}`)}`;

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/checkout" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Checkouts
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">{checkout.title}</h1>
                    <p className="text-sm text-t-muted">{checkout.id}</p>
                </div>
                <div className="flex gap-2">
                    <Btn variant="secondary" icon={Edit} onClick={() => {}}>Edit</Btn>
                    <Btn variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>Delete</Btn>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-card flex items-center justify-between" role="alert">
                    <p className="text-sm text-red-700 font-medium">Delete &quot;{checkout.title}&quot;? This cannot be undone.</p>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Btn>
                        <Btn variant="danger" onClick={handleDeleteConfirmed}>Yes, delete</Btn>
                    </div>
                </div>
            )}

            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold">Checkout Information</h2>
                    <StatusBadge status={checkout.status} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <div><span className="block text-xs text-t-muted mb-1">Amount</span><span className="text-sm font-medium">{formatPrice(checkout.amount, displayCurrency)}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Description</span><span className="text-sm font-medium">{checkout.description}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Views</span><span className="text-sm font-medium">{checkout.views}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Payments</span><span className="text-sm font-medium">{checkout.payments}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Created</span><span className="text-sm font-medium">{checkout.createdAt}</span></div>
                </div>
            </div>

            {/* ── Share Sheet ── */}
            <div className="bg-white border border-border rounded-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Share2 size={18} className="text-brand" strokeWidth={1.8} />
                    <h2 className="text-base font-semibold">Share Payment Link</h2>
                </div>

                {/* Link display */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-page rounded-lg overflow-hidden">
                        <LinkIcon size={16} className="text-t-muted flex-shrink-0" />
                        <span className="text-sm flex-1 truncate text-t-secondary">{checkout.paymentLink}</span>
                    </div>
                    <Btn variant="secondary" icon={copied ? Check : Copy} onClick={copyLink}>
                        {copied ? 'Copied!' : 'Copy'}
                    </Btn>
                    <Btn variant="secondary" icon={ExternalLink} onClick={() => window.open(checkout.paymentLink, '_blank', 'noopener,noreferrer')}>
                        Open
                    </Btn>
                </div>

                {/* Share options */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowQrModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-t-secondary hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        aria-label="Show QR code"
                    >
                        <QrCode size={16} /> QR Code
                    </button>

                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-t-secondary hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        aria-label="Share via WhatsApp"
                    >
                        <MessageCircle size={16} /> WhatsApp
                    </a>

                    <a
                        href={emailUrl}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-t-secondary hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        aria-label="Share via email"
                    >
                        <Mail size={16} /> Email
                    </a>
                </div>
            </div>

            {/* ── QR Code Modal ── */}
            {showQrModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                        onClick={() => setShowQrModal(false)}
                        aria-hidden="true"
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="QR code for payment link"
                        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-card shadow-2xl p-8 w-full max-w-sm text-center"
                    >
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 text-t-muted hover:text-t-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                            aria-label="Close QR modal"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-base font-semibold text-t-primary mb-1">{checkout.title}</h3>
                        <p className="text-xs text-t-muted mb-5">Scan to open the payment page</p>

                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="Payment link QR code" className="mx-auto w-52 h-52 border border-border rounded-lg p-2" />
                        ) : (
                            <div className="mx-auto w-52 h-52 bg-gray-100 animate-pulse rounded-lg" />
                        )}

                        <p className="text-[11px] text-t-muted mt-4 break-all">{checkout.paymentLink}</p>
                    </div>
                </>
            )}
        </div>
    );
}

export default CheckoutDetail;
