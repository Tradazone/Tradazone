// @ts-nocheck
import { useState } from 'react';
import Input from '../../../components/forms/Input';
import Button from '../../../components/forms/Button';
import { useAuth } from '../../../context/AuthContext';

function ProfileSettings() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user.name || '', email: user.email || '', phone: '', company: '', address: ''
    });

    const handleChange = (field) => (e) => { setFormData({ ...formData, [field]: e.target.value }); };
    const handleSubmit = (e) => { e.preventDefault(); console.log('Saving profile:', formData); };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Full Name" placeholder="Enter your name" value={formData.name} onChange={handleChange('name')} />
                    <Input label="Email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange('email')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange('phone')} />
                    <Input label="Company Name" placeholder="Enter company name" value={formData.company} onChange={handleChange('company')} />
                </div>
                <Input label="Business Address" placeholder="Enter your business address" value={formData.address} onChange={handleChange('address')} />
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="secondary">Cancel</Button>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </div>
            </form>
        </div>
    );
}

export default ProfileSettings;
