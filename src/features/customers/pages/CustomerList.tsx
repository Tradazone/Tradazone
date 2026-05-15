// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import DataTable from '../../../components/tables/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import { useData } from '../../../context/DataContext';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';

function CustomerList() {
    const navigate = useNavigate();
    const { customers } = useData();
    const displayCurrency = useCurrencyPreference();

    const columns = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'totalSpent', header: 'Total Spent', render: (value) => formatPrice(value, displayCurrency) },
        { key: 'invoiceCount', header: 'Invoices' },
        { key: 'createdAt', header: 'Created' }
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h1 className="text-base lg:text-xl font-semibold text-t-primary">Customers</h1>
                <button
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
                    onClick={() => navigate('/customers/add')}
                >
                    <Plus size={16} /> <span className="hidden sm:inline">Add</span><span className="sm:hidden">+</span> Customer
                </button>
            </div>

            {customers.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No customers yet"
                    description="Add your first customer to start sending invoices and tracking payments."
                    actionLabel="Add your first customer"
                    actionPath="/customers/add"
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
                        <Search size={18} className="text-t-muted" />
                        <input type="text" placeholder="Search customers..." className="flex-1 bg-transparent outline-none text-sm" />
                    </div>
                    <DataTable
                        columns={columns}
                        data={customers}
                        onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
                        emptyMessage="No customers found"
                    />
                </>
            )}
        </div>
    );
}

export default CustomerList;
