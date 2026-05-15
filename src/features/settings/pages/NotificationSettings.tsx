// @ts-nocheck
import { useState, useEffect } from 'react';
import Toggle from '../../../components/forms/Toggle';
import Button from '../../../components/forms/Button';
import { supabase } from '../../../lib/supabase';

interface NotifPrefs {
    payments:  boolean;
    invoices:  boolean;
    checkouts: boolean;
    marketing: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
    payments: true, invoices: true, checkouts: false, marketing: false,
};

const notificationOptions: Array<{ id: keyof NotifPrefs; title: string; description: string }> = [
    { id: 'payments',  title: 'Payment Received',     description: 'Get notified when you receive a payment' },
    { id: 'invoices',  title: 'Invoice Updates',       description: 'Get notified when invoice status changes' },
    { id: 'checkouts', title: 'Checkout Activity',     description: 'Get notified about checkout page views and payments' },
    { id: 'marketing', title: 'Marketing & Updates',   description: 'Receive product updates and promotional content' },
];

function NotificationSettings() {
    const [settings, setSettings] = useState<NotifPrefs>(DEFAULT_PREFS);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);
    const [saved,    setSaved]    = useState(false);

    // Load preferences from Supabase on mount
    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session?.user?.id) { setLoading(false); return; }
            const { data } = await supabase
                .from('users')
                .select('notification_preferences')
                .eq('id', session.user.id)
                .single();
            if (data?.notification_preferences) {
                setSettings({ ...DEFAULT_PREFS, ...(data.notification_preferences as NotifPrefs) });
            }
            setLoading(false);
        });
    }, []);

    const handleToggle = (id: keyof NotifPrefs) => {
        setSettings(prev => ({ ...prev, [id]: !prev[id] }));
        setSaved(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                await supabase
                    .from('users')
                    .update({ notification_preferences: settings })
                    .eq('id', session.user.id);
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                ))}
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-0" role="group" aria-label="Notification preferences">
                    {notificationOptions.map((option) => (
                        <div
                            key={option.id}
                            className="flex items-center justify-between py-4 border-b border-border last:border-b-0"
                        >
                            <div>
                                <span className="block text-sm font-medium text-t-primary">{option.title}</span>
                                <span className="block text-xs text-t-muted mt-0.5">{option.description}</span>
                            </div>
                            <Toggle
                                checked={settings[option.id]}
                                onChange={() => handleToggle(option.id)}
                                aria-label={`Toggle ${option.title}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-6" aria-live="polite">
                    {saved && (
                        <span className="text-sm text-green-600 font-medium">Preferences saved</span>
                    )}
                    <Button type="submit" variant="primary" disabled={saving} loading={saving}>
                        {saving ? 'Saving…' : 'Save Preferences'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default NotificationSettings;
