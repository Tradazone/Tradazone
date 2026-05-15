// @ts-nocheck
import { useState } from 'react';
import { X, Send, Mail, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import Button from '../../../components/forms/Button';
import Input from '../../../components/forms/Input';
import { sendInvoiceToCustomer } from '../../../services/emailService';
import { useData } from '../../../context/DataContext';

function SendInvoiceModal({ isOpen, onClose, invoice, customer }) {
    const { sendInvoice } = useData();

    const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen || !invoice) return null;

    const handleSend = async () => {
        if (!customerEmail.trim()) {
            setErrorMsg('Customer email is required.');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const paymentLink = `${window.location.origin}/pay/invoice/${invoice.id}`;
            const result = await sendInvoiceToCustomer({
                ...invoice,
                customerEmail: customerEmail.trim(),
                customer: customer?.name || invoice.customer,
                senderName: 'Tradazone',
                paymentLink,
            });

            if (result.success) {
                sendInvoice(invoice.id);
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMsg(result.error || 'Failed to send email.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg(err?.message || 'An unexpected error occurred.');
        }
    };

    const handleClose = () => {
        if (status === 'loading') return;
        setStatus('idle');
        setErrorMsg('');
        setCustomerEmail(customer?.email || '');
        onClose();
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="send-invoice-title"
                className="fixed z-50 bottom-0 left-0 right-0 lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up lg:animate-none"
            >
                <div className="lg:hidden w-10 h-1 bg-border mx-auto my-3 rounded-full flex-shrink-0" />

                {/* Header */}
                <div className="px-6 pt-2 pb-4 flex items-center justify-between border-b border-border/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Mail size={18} className="text-brand" />
                        <span id="send-invoice-title" className="font-semibold text-t-primary">
                            Send Invoice
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={status === 'loading'}
                        className="text-t-muted hover:text-t-primary transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {status === 'success' ? (
                        /* ── Success ── */
                        <div className="flex flex-col items-center gap-4 py-2 text-center">
                            <div className="w-14 h-14 bg-success-bg flex items-center justify-center">
                                <CheckCircle size={28} className="text-success" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-t-primary mb-1">Invoice Sent</h3>
                                <p className="text-sm text-t-muted">
                                    {invoice.id} was emailed to <strong>{customerEmail}</strong>.
                                </p>
                            </div>
                            <Button variant="primary" onClick={handleClose} className="w-full">Done</Button>
                        </div>
                    ) : (
                        /* ── Form ── */
                        <>
                            {/* Invoice summary strip */}
                            <div className="bg-page border border-border p-3 mb-5 flex justify-between items-center text-sm">
                                <div>
                                    <span className="text-t-muted">Invoice: </span>
                                    <span className="font-medium text-t-primary">{invoice.id}</span>
                                </div>
                                <div>
                                    <span className="text-t-muted">To: </span>
                                    <span className="font-medium text-t-primary">{customer?.name || invoice.customer}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <Input
                                    label="Customer email"
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => { setCustomerEmail(e.target.value); setErrorMsg(''); }}
                                    placeholder="customer@email.com"
                                    disabled={status === 'loading'}
                                />
                            </div>

                            {/* Error */}
                            {(errorMsg || status === 'error') && (
                                <div className="mb-4 p-3 bg-error-bg border border-error/20 flex items-start gap-2 text-sm text-error">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={handleClose}
                                    disabled={status === 'loading'}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleSend}
                                    loading={status === 'loading'}
                                    icon={Send}
                                >
                                    {status === 'loading' ? 'Sending…' : 'Send Invoice'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default SendInvoiceModal;
