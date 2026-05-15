// @ts-nocheck
import { forwardRef } from 'react';
import InvoiceHeader from './InvoiceHeader';
import InvoiceTable from './InvoiceTable';
import InvoiceSummary from './InvoiceSummary';
import InvoiceFooter from './InvoiceFooter';
import { getCurrencyPreference } from '../../utils/currencyPreference';

const InvoiceLayout = forwardRef(function InvoiceLayout({ invoice, customer, sender }, ref) {
    const displayCurrency = getCurrencyPreference();
    const subtotal = invoice.items.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
    );
    const tax = subtotal; // placeholder – same as ref image
    const total = subtotal;

    return (
        <div
            ref={ref}
            className="w-[794px] min-h-[1123px] bg-white mx-auto flex flex-col"
            style={{ padding: '48px 56px' }}
        >
            {/* Header */}
            <InvoiceHeader />

            {/* Invoice Meta: Date, Due Date, Invoice Number */}
            <div className="grid grid-cols-3 border-t border-gray-200 py-4 mb-6">
                <div>
                    <span className="block text-xs font-bold text-t-primary mb-1">Invoice date:</span>
                    <span className="text-sm text-t-muted">{invoice.createdAt}</span>
                </div>
                <div>
                    <span className="block text-xs font-bold text-t-primary mb-1">Due date:</span>
                    <span className="text-sm text-t-muted">{invoice.dueDate}</span>
                </div>
                <div>
                    <span className="block text-xs font-bold text-brand mb-1">Invoice number:</span>
                    <span className="text-sm text-brand">#{invoice.id.replace(/\D/g, '').padStart(5, '0')}</span>
                </div>
            </div>

            {/* Billing: From, To, Address */}
            <div className="grid grid-cols-3 border-t border-gray-200 py-4 mb-8">
                <div>
                    <span className="block text-xs font-bold text-t-primary mb-1">From:</span>
                    <span className="block text-sm text-t-muted">{sender?.name || 'Sender'}</span>
                    <span className="block text-sm text-t-muted">{sender?.email || 'Sender Email'}</span>
                </div>
                <div>
                    <span className="block text-xs font-bold text-t-primary mb-1">To</span>
                    <span className="block text-sm text-t-muted">{invoice.customer}</span>
                    <span className="block text-sm text-t-muted">{customer?.email || 'Receiver Email'}</span>
                </div>
                <div>
                    <span className="block text-xs font-bold text-t-primary mb-1">Address</span>
                    <span className="block text-sm text-t-muted">
                        {customer?.address || '123 Fashion Avenue, London, W1F 7TY\nUnited Kingdom'}
                    </span>
                </div>
            </div>

            {/* Items Table */}
            <InvoiceTable items={invoice.items} currency={invoice.currency} />

            {/* Summary */}
            <InvoiceSummary
                subtotal={subtotal}
                tax={tax}
                total={total}
                currency={displayCurrency}
            />

            {/* Footer */}
            <div className="mt-auto">
                <InvoiceFooter
                    notes={sender?.name || 'Sender'}
                    paymentLink={`${typeof window !== 'undefined' ? window.location.origin : 'https://tradazone.com'}/pay/invoice/${invoice.id}`}
                />
            </div>
        </div>
    );
});

export default InvoiceLayout;
