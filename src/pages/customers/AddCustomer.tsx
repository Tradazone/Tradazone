// @ts-nocheck
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Input from '../../components/forms/Input';
import Button from '../../components/forms/Button';
import { useData } from '../../context/DataContext';

function AddCustomer() {
    const navigate = useNavigate();
    const { addCustomer } = useData();
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(formData);
        navigate('/customers');
    };

    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    return (
        <div>
            <div className="mb-6">
                <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                    <ArrowLeft size={16} /> Back to Customers
                </Link>
                <h1 className="text-xl font-semibold text-t-primary">Add Customer</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-border rounded-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <Input label="Full Name" placeholder="Enter customer name" value={formData.name} onChange={handleChange('name')} required />
                    <Input label="Email" type="email" placeholder="Enter email address" value={formData.email} onChange={handleChange('email')} required />
                    <Input label="Phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange('phone')} />
                    <Input label="Address" placeholder="Enter address" value={formData.address} onChange={handleChange('address')} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
                    <Button type="submit" variant="primary">Add Customer</Button>
                </div>
            </form>
        </div>
    );
}

export default AddCustomer;
