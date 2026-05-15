// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, FileText } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import StatusBadge from '../../components/tables/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';

function InvoiceList() {
    const navigate = useNavigate();
    const { invoices } = useData();

    const columns = [
        { key: 'id', header: 'Invoice ID' },
        { key: 'customer', header: 'Customer' },
        { key: 'amount', header: 'Amount', render: (value, row) => `${value} ${row.currency}` },
        { key: 'status', header: 'Status', render: (value) => <StatusBadge status={value} /> },
        { key: 'dueDate', header: 'Due Date' },
        {
            key: 'actions',
            header: '',
            render: (_, row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/invoice/${row.id}`); }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 h-9 text-xs font-semibold text-brand bg-brand-bg hover:bg-brand hover:text-white active:scale-95 transition-all"
                >
                    <Eye size={14} /> View
                </button>
            ),
        },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-t-primary">Invoices</h1>
                <button
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
                    onClick={() => navigate('/invoices/create')}
                >
                    <Plus size={18} /> Create Invoice
                </button>
            </div>

            {invoices.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No invoices yet"
                    description="Create your first invoice and send it to a customer to get paid in STRK."
                    actionLabel="Create your first invoice"
                    actionPath="/invoices/create"
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
                        <Search size={18} className="text-t-muted" />
                        <input type="text" placeholder="Search invoices..." className="flex-1 bg-transparent outline-none text-sm" />
                    </div>
                    <DataTable columns={columns} data={invoices} onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)} />
                </>
            )}
        </div>
    );
}

export default InvoiceList;
