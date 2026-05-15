// @ts-nocheck
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, X, Check } from 'lucide-react';
import Button from '../../../components/forms/Button';
import { useData } from '../../../context/DataContext';
import { formatPrice, useCurrencyPreference, FIAT_SYMBOLS } from '../../../utils/currencyPreference';

const TYPE_OPTIONS = ['service', 'product'];
const UNIT_OPTIONS = ['hour', 'project', 'page', 'unit'];

function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { items, updateItem, deleteItems } = useData();
    const displayCurrency = useCurrencyPreference();

    const item = items.find(i => i.id === id);

    const [isEditing,         setIsEditing]         = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm]  = useState(false);
    const [draft,             setDraft]             = useState(null);

    if (!item) return <div className="p-8"><p className="text-t-muted">Item not found</p></div>;

    const currencySymbol = FIAT_SYMBOLS[displayCurrency] || '';
    const priceLabel = currencySymbol ? `Price (${displayCurrency} ${currencySymbol})` : `Price (${displayCurrency})`;

    const handleStartEdit = () => {
        setDraft({ name: item.name, description: item.description || '', type: item.type, price: item.price, unit: item.unit });
        setIsEditing(true);
    };

    const handleCancelEdit = () => { setIsEditing(false); setDraft(null); };

    const handleSaveEdit = () => {
        updateItem(id, { ...draft, currency: displayCurrency });
        setIsEditing(false);
        setDraft(null);
    };

    const handleDeleteConfirmed = () => {
        deleteItems([id]);
        navigate('/items');
    };

    const inputClass = 'w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-brand';

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/items" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Items & Services
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">
                        {isEditing ? draft.name : item.name}
                    </h1>
                    <p className="text-sm text-t-muted capitalize">{isEditing ? draft.type : item.type}</p>
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
                    <p className="text-sm text-red-700 font-medium">Delete "{item.name}"? This cannot be undone.</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteConfirmed}>Yes, delete</Button>
                    </div>
                </div>
            )}

            <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-base font-semibold mb-4">Item Information</h2>
                {isEditing ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs text-t-muted mb-1">Name</label>
                            <input className={inputClass} value={draft.name}
                                onChange={e => setDraft({ ...draft, name: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-t-muted mb-1">Description</label>
                            <input className={inputClass} value={draft.description}
                                onChange={e => setDraft({ ...draft, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs text-t-muted mb-1">Type</label>
                            <select className={inputClass} value={draft.type}
                                onChange={e => setDraft({ ...draft, type: e.target.value })}>
                                {TYPE_OPTIONS.map(o => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-t-muted mb-1">{priceLabel}</label>
                            <input className={inputClass} type="number" min="0" step="0.01" value={draft.price}
                                onChange={e => setDraft({ ...draft, price: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs text-t-muted mb-1">Unit</label>
                            <select className={inputClass} value={draft.unit}
                                onChange={e => setDraft({ ...draft, unit: e.target.value })}>
                                {UNIT_OPTIONS.map(o => <option key={o} value={o}>Per {o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        <div><span className="block text-xs text-t-muted mb-1">Description</span><span className="text-sm font-medium">{item.description || 'No description'}</span></div>
                        <div><span className="block text-xs text-t-muted mb-1">Type</span><span className="text-sm font-medium capitalize">{item.type}</span></div>
                        <div><span className="block text-xs text-t-muted mb-1">Price</span><span className="text-sm font-medium">{formatPrice(item.price, displayCurrency)}</span></div>
                        <div><span className="block text-xs text-t-muted mb-1">Unit</span><span className="text-sm font-medium capitalize">Per {item.unit}</span></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ItemDetail;
