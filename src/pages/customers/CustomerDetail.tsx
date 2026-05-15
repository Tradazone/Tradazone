// @ts-nocheck
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/forms/Button';
import DataTable from '../../components/tables/DataTable';
import StatusBadge from '../../components/tables/StatusBadge';
import { useData } from '../../context/DataContext';

function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { customers, invoices } = useData();
    const customer = customers.find(c => c.id === id);
    const customerInvoices = invoices.filter(inv => inv.customerId === id);

    if (!customer) return <div className="p-8"><p className="text-t-muted">Customer not found</p></div>;

    const invoiceColumns = [
        { key: 'id', header: 'Invoice ID' },
        { key: 'amount', header: 'Amount', render: (value, row) => `${value} ${row.currency}` },
        { key: 'status', header: 'Status', render: (value) => <StatusBadge status={value} /> },
        { key: 'dueDate', header: 'Due Date' }
    ];

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Customers
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">{customer.name}</h1>
                    <p className="text-sm text-t-muted">{customer.email}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={Edit}>Edit</Button>
                    <Button variant="danger" icon={Trash2}>Delete</Button>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <h2 className="text-base font-semibold text-t-primary mb-4">Customer Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div><span className="block text-xs text-t-muted mb-1">Phone</span><span className="text-sm font-medium">{customer.phone || 'Not provided'}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Address</span><span className="text-sm font-medium">{customer.address || 'Not provided'}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Total Spent</span><span className="text-sm font-medium">{customer.totalSpent} {customer.currency}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Customer Since</span><span className="text-sm font-medium">{customer.createdAt}</span></div>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold">Invoices ({customerInvoices.length})</h2>
                    <Button variant="secondary" size="small" onClick={() => navigate('/invoices/create')}>Create Invoice</Button>
                </div>
                <DataTable columns={invoiceColumns} data={customerInvoices} onRowClick={(inv) => navigate(`/invoices/${inv.id}`)} emptyMessage="No invoices yet" />
            </div>
        </div>
    );
}

export default CustomerDetail;
