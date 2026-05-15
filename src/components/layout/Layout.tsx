// @ts-nocheck
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-page">
            <Header onMenuToggle={() => setSidebarOpen(o => !o)} />

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[90] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — slide-in drawer on mobile, fixed on desktop */}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content */}
            <main className="
                mt-header
                lg:ml-sidebar
                min-h-[calc(100vh-theme(spacing.header))]
                pb-20 lg:pb-0
                p-4 lg:p-8
            ">
                <Outlet />
            </main>

            {/* Bottom nav bar — mobile only */}
            <BottomNav />
        </div>
    );
}

export default Layout;
