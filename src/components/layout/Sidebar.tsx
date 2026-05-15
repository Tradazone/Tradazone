// @ts-nocheck
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home, FileText, ShoppingCart, Users, Package, Settings, LogOut, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/invoices', icon: FileText, label: 'Invoice' },
    { path: '/checkout', icon: ShoppingCart, label: 'Checkout' },
    { path: '/customers', icon: Users, label: 'Customer' },
    { path: '/items', icon: Package, label: 'Item and Services' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar({ open, onClose }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    return (
        <aside className={`
            fixed top-header left-0 z-[95]
            h-[calc(100vh-theme(spacing.header))]
            w-sidebar bg-[#F8FAFC] border-r border-border
            flex flex-col justify-between overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${open ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
        `}>
            {/* Close button — mobile only */}
            <div>
                <button
                    className="lg:hidden flex items-center gap-2 px-5 py-3 text-t-muted text-sm hover:text-t-primary transition-colors"
                    onClick={onClose}
                >
                    <X size={18} /> Close
                </button>

                <nav className="flex flex-col">
                    {navItems.map((item, index) => (
                        <div key={item.path}>
                            <NavLink
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-6 py-4 text-sm font-medium border-l-[3px] transition-all ${isActive
                                        ? 'text-brand bg-brand-bg border-l-brand font-semibold'
                                        : 'text-t-secondary border-l-transparent hover:text-brand hover:bg-brand-bg/50'
                                    }`
                                }
                                end={item.path === '/'}
                            >
                                <item.icon size={20} strokeWidth={1.8} />
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                            </NavLink>
                            {index < navItems.length - 1 && (
                                <div className="mx-5 border-b border-border" />
                            )}
                        </div>
                    ))}
                </nav>
            </div>

            <div>
                <div className="mx-5 border-b border-border" />
                <button
                    className="flex items-center gap-3 px-6 py-4 text-sm font-medium text-t-muted border-l-[3px] border-l-transparent hover:text-error hover:bg-error-bg transition-all w-full"
                    onClick={handleLogout}
                >
                    <LogOut size={20} strokeWidth={1.8} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
