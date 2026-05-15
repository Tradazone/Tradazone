// @ts-nocheck
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { User, CreditCard, Bell } from 'lucide-react';

const settingsLinks = [
    { path: '/settings/profile', icon: User, label: 'Profile Settings' },
    { path: '/settings/payments', icon: CreditCard, label: 'Payment Settings' },
    { path: '/settings/notifications', icon: Bell, label: 'Notifications' },
];

function Settings() {
    const location = useLocation();
    const isMainSettings = location.pathname === '/settings';

    return (
        <div>
            <h1 className="text-xl font-semibold text-t-primary mb-6">Settings</h1>

            <div className="flex gap-6">
                <aside className="w-56 flex-shrink-0">
                    <nav className="flex flex-col gap-0.5">
                        {settingsLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-brand-bg text-brand' : 'text-t-secondary hover:bg-gray-50'
                                    }`
                                }
                            >
                                <link.icon size={18} />
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 min-w-0">
                    {isMainSettings ? (
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Account Settings</h2>
                            <p className="text-sm text-t-muted mb-6">Manage your account settings and preferences.</p>
                            <div className="grid grid-cols-2 gap-4">
                                {settingsLinks.map((link) => (
                                    <NavLink key={link.path} to={link.path} className="flex items-center gap-4 p-5 bg-white border border-border rounded-card hover:border-brand hover:shadow-sm transition-all">
                                        <link.icon size={24} className="text-brand" />
                                        <span className="text-sm font-medium">{link.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>
        </div>
    );
}

export default Settings;
