// @ts-nocheck
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/forms/Button';
import { useData } from '../../context/DataContext';

function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { items } = useData();
    const item = items.find(i => i.id === id);

    if (!item) return <div className="p-8"><p className="text-t-muted">Item not found</p></div>;

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/items" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Items & Services
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">{item.name}</h1>
                    <p className="text-sm text-t-muted capitalize">{item.type}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={Edit}>Edit</Button>
                    <Button variant="danger" icon={Trash2}>Delete</Button>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-base font-semibold mb-4">Item Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div><span className="block text-xs text-t-muted mb-1">Description</span><span className="text-sm font-medium">{item.description || 'No description'}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Type</span><span className="text-sm font-medium capitalize">{item.type}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Price</span><span className="text-sm font-medium">{item.price} {item.currency}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Unit</span><span className="text-sm font-medium capitalize">Per {item.unit}</span></div>
                </div>
            </div>
        </div>
    );
}

export default ItemDetail;
