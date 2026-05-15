// @ts-nocheck
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../../components/forms/Button';

function PasswordSettings() {
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');

    const toggleVisibility = (field) => { setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] }); };
    const handleChange = (field) => (e) => { setFormData({ ...formData, [field]: e.target.value }); setError(''); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) { setError('New passwords do not match'); return; }
        if (formData.newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
        console.log('Changing password');
    };

    const PasswordField = ({ label, field, value }) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-t-secondary uppercase tracking-wide">{label}</label>
            <div className="relative">
                <input
                    type={showPasswords[field] ? 'text' : 'password'}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value}
                    onChange={handleChange(field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword')}
                    className="w-full px-3 py-2.5 pr-12 text-sm bg-white border border-border rounded-lg outline-none focus:border-brand transition-colors"
                />
                <button
                    type="button"
                    onClick={() => toggleVisibility(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-t-muted hover:text-t-primary"
                >
                    {showPasswords[field] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Change Password</h2>

            {error && <div className="p-3 mb-5 bg-error-bg text-error text-sm rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <PasswordField label="Current Password" field="current" value={formData.currentPassword} />
                <PasswordField label="New Password" field="new" value={formData.newPassword} />
                <PasswordField label="Confirm New Password" field="confirm" value={formData.confirmPassword} />
                <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" variant="primary">Update Password</Button>
                </div>
            </form>
        </div>
    );
}

export default PasswordSettings;
