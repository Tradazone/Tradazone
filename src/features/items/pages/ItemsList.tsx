// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package } from 'lucide-react';
import DataTable from '../../../components/tables/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import { useData } from '../../../context/DataContext';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';

function ItemsList() {
    const navigate = useNavigate();
    const { items } = useData();
    const displayCurrency = useCurrencyPreference();

    const columns = [
        { key: 'name', header: 'Name' },
        { key: 'description', header: 'Description' },
        { key: 'type', header: 'Type', render: (value) => <span className="capitalize">{value}</span> },
        { key: 'price', header: 'Price', render: (value) => formatPrice(value, displayCurrency) },
        { key: 'unit', header: 'Unit' }
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-t-primary">Items & Services</h1>
                <button
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
                    onClick={() => navigate('/items/add')}
                >
                    <Plus size={18} /> Add Item
                </button>
            </div>

            {items.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No items or services yet"
                    description="Add your products or services to quickly include them in invoices."
                    actionLabel="Add your first item"
                    actionPath="/items/add"
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-white border border-border rounded-lg">
                        <Search size={18} className="text-t-muted" />
                        <input type="text" placeholder="Search items and services..." className="flex-1 bg-transparent outline-none text-sm" />
                    </div>
                    <DataTable columns={columns} data={items} onRowClick={(item) => navigate(`/items/${item.id}`)} />
                </>
            )}
        </div>
    );
}

export default ItemsList;
