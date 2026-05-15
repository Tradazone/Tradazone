// @ts-nocheck
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Button from '../../components/forms/Button';
import { useData } from '../../context/DataContext';

function AddItem() {
    const navigate = useNavigate();
    const { addItem } = useData();
    const [formData, setFormData] = useState({ name: '', description: '', type: 'service', price: '', unit: '' });

    const typeOptions = [{ value: 'service', label: 'Service' }, { value: 'product', label: 'Product' }];
    const unitOptions = [{ value: 'hour', label: 'Per Hour' }, { value: 'project', label: 'Per Project' }, { value: 'page', label: 'Per Page' }, { value: 'unit', label: 'Per Unit' }];

    const handleSubmit = (e) => {
        e.preventDefault();
        addItem(formData);
        navigate('/items');
    };

    const handleChange = (field) => (e) => { setFormData({ ...formData, [field]: e.target.value }); };

    return (
        <div>
            <div className="mb-6">
                <Link to="/items" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                    <ArrowLeft size={16} /> Back to Items & Services
                </Link>
                <h1 className="text-xl font-semibold text-t-primary">Add Item or Service</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-border rounded-card p-6">
                <div className="flex flex-col gap-5 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input label="Name" placeholder="Enter item name" value={formData.name} onChange={handleChange('name')} required />
                        <Input label="Description" placeholder="Enter description" value={formData.description} onChange={handleChange('description')} />
                    </div>
                    <Select label="Type" options={typeOptions} value={formData.type} onChange={handleChange('type')} />
                    <div className="grid grid-cols-[2fr_1fr] gap-4">
                        <Input label="Price (STRK)" type="number" placeholder="0.00" value={formData.price} onChange={handleChange('price')} required />
                        <Select label="Unit" options={unitOptions} value={formData.unit} onChange={handleChange('unit')} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={() => navigate('/items')}>Cancel</Button>
                    <Button type="submit" variant="primary">Add Item</Button>
                </div>
            </form>
        </div>
    );
}

export default AddItem;
