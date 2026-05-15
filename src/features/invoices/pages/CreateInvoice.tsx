// @ts-nocheck
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Input from '../../../components/forms/Input';
import Select from '../../../components/forms/Select';
import Button from '../../../components/forms/Button';
import { useData } from '../../../context/DataContext';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';

function CreateInvoice() {
    const navigate = useNavigate();
    const { customers, items, addInvoice } = useData();
    const displayCurrency = useCurrencyPreference();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        customerId: '', dueDate: '', items: [{ itemId: '', quantity: 1, price: '' }]
    });

    const customerOptions = customers.map(c => ({ value: c.id, label: c.name }));
    const itemOptions = items.map(i => ({
        value: i.id,
        label: `${i.name} — ${formatPrice(i.price, displayCurrency)}`
    }));

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { itemId: '', quantity: 1, price: '' }] });
    };

    const handleRemoveItem = (index) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        if (field === 'itemId') {
            const selectedItem = items.find(i => i.id === value);
            if (selectedItem) newItems[index].price = selectedItem.price;
        }
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () =>
        formData.items.reduce((total, item) =>
            total + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (step === 1) {
            setStep(2);
        } else {
            addInvoice(formData);
            navigate('/invoices');
        }
    };

    return (
        <div>
            <div className="mb-6">
                <Link to="/invoices" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                    <ArrowLeft size={16} /> Back to Invoices
                </Link>
                <h1 className="text-xl font-semibold text-t-primary">Create Invoice</h1>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-4 mb-8">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand' : 'text-t-muted'}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 1 ? 'bg-brand text-white' : 'bg-border text-t-muted'}`}>1</span>
                    <span className="text-sm font-medium">Customer Details</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand' : 'text-t-muted'}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= 2 ? 'bg-brand text-white' : 'bg-border text-t-muted'}`}>2</span>
                    <span className="text-sm font-medium">Invoice Items</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-border rounded-card p-6">
                {step === 1 ? (
                    <>
                        <h2 className="text-base font-semibold mb-5">Customer Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Select
                                label="Select Customer"
                                options={customerOptions}
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                placeholder="Choose a customer"
                                required
                            />
                            <Input
                                label="Due Date"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-base font-semibold mb-5">Invoice Items</h2>
                        <div className="flex flex-col gap-4 mb-5">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
                                    <Select
                                        label="Item / Service"
                                        options={itemOptions}
                                        value={item.itemId}
                                        onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                                        placeholder="Select item"
                                    />
                                    <Input
                                        label="Quantity"
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    />
                                    <Input
                                        label={`Price (${displayCurrency})`}
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                    />
                                    {formData.items.length > 1 && (
                                        <button
                                            type="button"
                                            className="p-2 text-error hover:bg-error-bg rounded-lg transition-colors mb-1"
                                            onClick={() => handleRemoveItem(index)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button type="button" variant="secondary" icon={Plus} onClick={handleAddItem}>
                            Add Item
                        </Button>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
                            <span className="text-sm font-medium">Total:</span>
                            <span className="text-xl font-bold text-brand">
                                {formatPrice(calculateTotal(), displayCurrency)}
                            </span>
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                    {step === 2 && <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>}
                    <Button variant="secondary" onClick={() => navigate('/invoices')}>Cancel</Button>
                    <Button type="submit" variant="primary">{step === 1 ? 'Next' : 'Create Invoice'}</Button>
                </div>
            </form>
        </div>
    );
}

export default CreateInvoice;
