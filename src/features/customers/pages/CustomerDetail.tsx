// @ts-nocheck
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, X, Check } from 'lucide-react';
import Button from '../../../components/forms/Button';
import DataTable from '../../../components/tables/DataTable';
import StatusBadge from '../../../components/tables/StatusBadge';
import { useData } from '../../../context/DataContext';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';

function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { customers, invoices, updateCustomer, deleteCustomer } = useData();
    const displayCurrency = useCurrencyPreference();

    const customer = customers.find(c => c.id === id);
    const customerInvoices = invoices.filter(inv => inv.customerId === id);

    const [isEditing,        setIsEditing]        = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [draft,            setDraft]            = useState(null);

    if (!customer) return <div className="p-8"><p className="text-t-muted">Customer not found</p></div>;

    const invoiceColumns = [
        { key: 'id',      header: 'Invoice ID' },
        { key: 'amount',  header: 'Amount',  render: (value) => formatPrice(value, displayCurrency) },
        { key: 'status',  header: 'Status',  render: (value) => <StatusBadge status={value} /> },
        { key: 'dueDate', header: 'Due Date' },
    ];

    const handleStartEdit = () => {
        setDraft({ name: customer.name, email: customer.email, phone: customer.phone || '', address: customer.address || '' });
        setIsEditing(true);
    };

    const handleCancelEdit = () => { setIsEditing(false); setDraft(null); };

    const handleSaveEdit = () => {
        updateCustomer(id, draft);
        setIsEditing(false);
        setDraft(null);
    };

    const handleDeleteConfirmed = () => {
        deleteCustomer(id);
        navigate('/customers');
    };

    const field = (label, key, type = 'text') => (
        <div>
            <span className="block text-xs text-t-muted mb-1">{label}</span>
            {isEditing ? (
                <input
                    type={type}
                    value={draft[key]}
                    onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-brand"
                />
            ) : (
                <span className="text-sm font-medium">{customer[key] || 'Not provided'}</span>
            )}
        </div>
    );

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Customers
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">
                        {isEditing ? draft.name : customer.name}
                    </h1>
                    <p className="text-sm text-t-muted">{isEditing ? draft.email : customer.email}</p>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="secondary" icon={X} onClick={handleCancelEdit}>Cancel</Button>
                            <Button variant="primary" icon={Check} onClick={handleSaveEdit}>Save</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" icon={Edit} onClick={handleStartEdit}>Edit</Button>
                            <Button variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-card flex items-center justify-between">
                    <p className="text-sm text-red-700 font-medium">Delete {customer.name}? This cannot be undone.</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteConfirmed}>Yes, delete</Button>
                    </div>
                </div>
            )}

            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <h2 className="text-base font-semibold text-t-primary mb-4">Customer Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {field('Name',    'name')}
                    {field('Email',   'email',   'email')}
                    {field('Phone',   'phone',   'tel')}
                    {field('Address', 'address')}
                    <div>
                        <span className="block text-xs text-t-muted mb-1">Total Spent</span>
                        <span className="text-sm font-medium">{formatPrice(customer.totalSpent, displayCurrency)}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-t-muted mb-1">Customer Since</span>
                        <span className="text-sm font-medium">{customer.createdAt}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold">Invoices ({customerInvoices.length})</h2>
                    <Button variant="secondary" size="small" onClick={() => navigate('/invoices/create')}>Create Invoice</Button>
                </div>
                <DataTable
                    columns={invoiceColumns}
                    data={customerInvoices}
                    onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
                    emptyMessage="No invoices yet"
                />
            </div>
        </div>
    );
}

export default CustomerDetail;
