// @ts-nocheck
import { useState } from 'react';
import Toggle from '../../components/forms/Toggle';
import Button from '../../components/forms/Button';

const notificationOptions = [
    { id: 'payments', title: 'Payment Received', description: 'Get notified when you receive a payment' },
    { id: 'invoices', title: 'Invoice Updates', description: 'Get notified when invoice status changes' },
    { id: 'checkouts', title: 'Checkout Activity', description: 'Get notified about checkout page views and payments' },
    { id: 'marketing', title: 'Marketing & Updates', description: 'Receive product updates and promotional content' }
];

function NotificationSettings() {
    const [settings, setSettings] = useState({ payments: true, invoices: true, checkouts: false, marketing: false });

    const handleToggle = (id) => { setSettings({ ...settings, [id]: !settings[id] }); };
    const handleSubmit = (e) => { e.preventDefault(); console.log('Saving notifications:', settings); };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-0">
                    {notificationOptions.map((option) => (
                        <div key={option.id} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
                            <div>
                                <span className="block text-sm font-medium text-t-primary">{option.title}</span>
                                <span className="block text-xs text-t-muted mt-0.5">{option.description}</span>
                            </div>
                            <Toggle checked={settings[option.id]} onChange={() => handleToggle(option.id)} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-6">
                    <Button type="submit" variant="primary">Save Preferences</Button>
                </div>
            </form>
        </div>
    );
}

export default NotificationSettings;
