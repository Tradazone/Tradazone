// @ts-nocheck
import { NavLink } from 'react-router-dom';
import { Home, FileText, ShoppingCart, Users, Package } from 'lucide-react';

const items = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/invoices', icon: FileText, label: 'Invoice' },
    { path: '/checkout', icon: ShoppingCart, label: 'Checkout' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/items', icon: Package, label: 'Items' },
];

/**
 * Bottom navigation bar — visible on mobile only (lg:hidden).
 * Fixed to the bottom of the screen, above system navigation.
 */
function BottomNav() {
    return (
        <nav className="
            lg:hidden fixed bottom-0 left-0 right-0 z-[95]
            bg-white border-t border-border
            flex items-center justify-around
            h-16 px-1 safe-bottom
        ">
            {items.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 transition-colors ${isActive ? 'text-brand' : 'text-t-muted'}`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <item.icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                            <span className="text-[10px] font-medium truncate">{item.label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}

export default BottomNav;
