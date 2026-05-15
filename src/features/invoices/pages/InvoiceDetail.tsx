// @ts-nocheck
import { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Download, Edit, Eye, Trash2, X, Check } from 'lucide-react';
import Button from '../../../components/forms/Button';
import StatusBadge from '../../../components/tables/StatusBadge';
import InvoiceLayout from '../components/InvoiceLayout';
import SendInvoiceModal from '../components/SendInvoiceModal';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';

function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const invoiceRef = useRef(null);
    const { user } = useAuth();
    const { invoices, customers, updateInvoice, deleteInvoice } = useData();
    const displayCurrency = useCurrencyPreference();

    const invoice  = invoices.find(inv => inv.id === id);
    const customer = customers.find(c => c.id === invoice?.customerId);

    const [sendModalOpen,    setSendModalOpen]    = useState(false);
    const [isEditing,        setIsEditing]        = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [draft,            setDraft]            = useState(null);

    if (!invoice) return <div className="p-8"><p className="text-t-muted">Invoice not found</p></div>;

    const sender = { name: user?.name || 'Tradazone', email: user?.email || 'hello@tradazone.com' };

    const calculateTotal = (items) =>
        (items || invoice.items).reduce((sum, item) => sum + parseFloat(item.price || 0) * parseInt(item.quantity || 1), 0);

    const handleStartEdit = () => {
        setDraft({ dueDate: invoice.dueDate, items: invoice.items.map(i => ({ ...i })) });
        setIsEditing(true);
    };

    const handleCancelEdit = () => { setIsEditing(false); setDraft(null); };

    const handleSaveEdit = () => {
        updateInvoice(id, { dueDate: draft.dueDate, items: draft.items });
        setIsEditing(false);
        setDraft(null);
    };

    const handleDeleteConfirmed = () => {
        deleteInvoice(id);
        navigate('/invoices');
    };

    const handleDownload = async () => {
        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().set({
            margin: 0, filename: `${invoice.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(invoiceRef.current).save();
    };

    const updateDraftItem = (index, field, value) => {
        const updated = [...draft.items];
        updated[index] = { ...updated[index], [field]: value };
        setDraft({ ...draft, items: updated });
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/invoices" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Invoices
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-t-primary">{invoice.id}</h1>
                        <StatusBadge status={invoice.status} />
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="secondary" icon={X} onClick={handleCancelEdit}>Cancel</Button>
                            <Button variant="primary" icon={Check} onClick={handleSaveEdit}>Save</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" icon={Eye} onClick={() => navigate(`/invoice/${invoice.id}`)}>View Invoice</Button>
                            <Button variant="secondary" icon={Download} onClick={handleDownload}>Download</Button>
                            <Button variant="secondary" icon={Send} onClick={() => setSendModalOpen(true)}>Send</Button>
                            <Button variant="secondary" icon={Edit} onClick={handleStartEdit}>Edit</Button>
                            <Button variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-card flex items-center justify-between">
                    <p className="text-sm text-red-700 font-medium">Delete invoice {invoice.id}? This cannot be undone.</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteConfirmed}>Yes, delete</Button>
                    </div>
                </div>
            )}

            {/* Invoice Details */}
            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <h2 className="text-base font-semibold mb-4">Invoice Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div><span className="block text-xs text-t-muted mb-1">Customer</span><span className="text-sm font-medium">{invoice.customer}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Email</span><span className="text-sm font-medium">{customer?.email || 'N/A'}</span></div>
                    <div>
                        <span className="block text-xs text-t-muted mb-1">Due Date</span>
                        {isEditing ? (
                            <input
                                type="date"
                                value={draft.dueDate}
                                onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
                                className="border border-border rounded px-2 py-1 text-sm outline-none focus:border-brand"
                            />
                        ) : (
                            <span className="text-sm font-medium">{invoice.dueDate}</span>
                        )}
                    </div>
                    <div><span className="block text-xs text-t-muted mb-1">Created</span><span className="text-sm font-medium">{invoice.createdAt}</span></div>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-border rounded-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold">Items</h2>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">Item</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">Quantity</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">Price</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(isEditing ? draft.items : invoice.items).map((item, index) => (
                            <tr key={index} className="border-b border-border last:border-b-0">
                                <td className="px-6 py-3 text-sm">{item.name}</td>
                                <td className="px-6 py-3 text-sm">
                                    {isEditing ? (
                                        <input type="number" min="1" value={item.quantity}
                                            onChange={e => updateDraftItem(index, 'quantity', e.target.value)}
                                            className="w-20 border border-border rounded px-2 py-1 text-sm outline-none focus:border-brand"
                                        />
                                    ) : item.quantity}
                                </td>
                                <td className="px-6 py-3 text-sm">
                                    {isEditing ? (
                                        <input type="number" min="0" step="0.01" value={item.price}
                                            onChange={e => updateDraftItem(index, 'price', e.target.value)}
                                            className="w-28 border border-border rounded px-2 py-1 text-sm outline-none focus:border-brand"
                                        />
                                    ) : formatPrice(item.price, displayCurrency)}
                                </td>
                                <td className="px-6 py-3 text-sm">
                                    {formatPrice(parseFloat(item.price || 0) * parseInt(item.quantity || 1), displayCurrency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-border">
                            <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-right">Total:</td>
                            <td className="px-6 py-3 text-sm font-bold text-brand">
                                {formatPrice(calculateTotal(isEditing ? draft.items : null), displayCurrency)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Hidden PDF layout */}
            <div className="fixed left-[-9999px] top-0">
                <InvoiceLayout ref={invoiceRef} invoice={invoice} customer={customer} sender={sender} />
            </div>

            <SendInvoiceModal
                isOpen={sendModalOpen}
                onClose={() => setSendModalOpen(false)}
                invoice={invoice}
                customer={customer}
            />
        </div>
    );
}

export default InvoiceDetail;
