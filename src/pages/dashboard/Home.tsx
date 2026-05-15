// @ts-nocheck
import { Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    ArrowDownRight,
    FileText,
    Users,
    ShoppingCart,
    Package,
    Zap,
    ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import WelcomeModal from '../../components/ui/WelcomeModal';

function Home() {
    const { user, wallet, connectWallet } = useAuth();
    const { transactions, dashboardStats } = useData();
    const recentTransactions = transactions.slice(0, 5);

    return (
        <div className="max-w-[1100px]">
            <WelcomeModal />

            {/* Page Heading */}
            <h1 className="text-xl font-medium text-t-primary mb-6">
                Welcome to Tradazone
            </h1>

            {/* ── Top Row: Wallet + Receivable ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Wallet Balance Card */}
                <div className="bg-brand rounded-card p-6 text-white flex flex-col min-h-[192px]">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-accent-orange/80 rounded-full flex items-center justify-center">
                            <Wallet size={15} strokeWidth={2} />
                        </div>
                        <span className="text-sm text-white/70">
                            {wallet.address
                                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                                : 'Gx74893k2k3...'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-[48px] font-bold leading-none tracking-tight">
                            {dashboardStats.walletBalance || '0.00'}
                        </span>
                        <span className="text-xl text-white/50 font-normal">STRK</span>
                    </div>
                    <span className="text-sm text-white/50 mt-auto">Wallet ballance</span>
                </div>

                {/* Total Receivable Card */}
                <div className="bg-white border border-border rounded-card p-6 flex flex-col min-h-[192px]">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight size={20} strokeWidth={2} className="text-brand" />
                        <span className="text-base font-semibold text-t-primary">Total receivable</span>
                    </div>
                    <p className="text-sm text-t-muted mb-5">Total unpaid invoices</p>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-page overflow-hidden mb-5">
                        <div
                            className="h-full bg-brand"
                            style={{
                                width: (() => {
                                    const bal = parseFloat(dashboardStats.walletBalance) || 0;
                                    const rec = parseFloat(String(dashboardStats.receivables).replace(',', '')) || 0;
                                    const total = bal + rec;
                                    return total > 0 ? `${(bal / total) * 100}%` : '0%';
                                })()
                            }}
                        ></div>
                    </div>

                    {/* Stat Columns */}
                    <div className="flex gap-10 mt-auto">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-t-muted font-medium">Current</span>
                            <span className="text-base font-bold text-t-primary">
                                {dashboardStats.walletBalance || '0'} <span className="text-brand font-semibold">STRK</span>
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-t-muted font-medium">Unpaid</span>
                            <span className="text-base font-bold text-t-primary">
                                {dashboardStats.receivables || '0'} <span className="text-brand font-semibold">STRK</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Middle Row: Transactions + Activity ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Transactions Card */}
                <div className="bg-white border border-border rounded-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div className="flex items-center gap-2 font-semibold text-sm text-t-primary">
                            <FileText size={18} strokeWidth={1.8} />
                            <span>Transactions</span>
                        </div>
                        <button className="flex items-center gap-1 text-xs text-t-muted font-medium px-3 py-1.5 border border-border rounded-md bg-white hover:border-border-medium transition-colors">
                            Last 6 months <ChevronDown size={14} />
                        </button>
                    </div>
                    <div>
                        {recentTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                                <FileText size={32} className="text-t-muted/30 mb-3" strokeWidth={1.5} />
                                <p className="text-sm font-medium text-t-secondary mb-1">No transactions yet</p>
                                <p className="text-xs text-t-muted">Transactions will appear here once you get paid.</p>
                            </div>
                        ) : (
                            recentTransactions.map((tx, i) => (
                                <div key={tx.id} className={`flex items-center gap-3 px-6 py-3.5 ${i < recentTransactions.length - 1 ? 'border-b border-border' : ''}`}>
                                    <div className="w-9 h-9 bg-page rounded-lg flex items-center justify-center text-t-muted flex-shrink-0">
                                        <FileText size={16} strokeWidth={1.8} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[13px] font-medium text-t-primary truncate">{tx.description}</span>
                                        <span className="block text-[11px] text-t-muted mt-0.5">{tx.date}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="block text-[13px] font-semibold text-t-primary">
                                            {tx.amount}<span className="text-brand">STRK</span>
                                        </span>
                                        <span className="block text-[11px] text-t-muted mt-0.5">14:43:12</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Activity Card */}
                <div className="bg-white border border-border rounded-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div className="flex items-center gap-2 font-semibold text-sm text-t-primary">
                            <TrendingUp size={18} strokeWidth={1.8} />
                            <span>Activity</span>
                        </div>
                        <button className="flex items-center gap-1 text-xs text-t-muted font-medium px-3 py-1.5 border border-border rounded-md bg-white hover:border-border-medium transition-colors">
                            Last 6 months <ChevronDown size={14} />
                        </button>
                    </div>
                    <div>
                        {recentTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                                <TrendingUp size={32} className="text-t-muted/30 mb-3" strokeWidth={1.5} />
                                <p className="text-sm font-medium text-t-secondary mb-1">No activity yet</p>
                                <p className="text-xs text-t-muted">Your activity feed will show up here.</p>
                            </div>
                        ) : (
                            recentTransactions.map((tx, i) => (
                                <div key={`act-${tx.id}`} className={`flex items-center gap-3 px-6 py-3.5 ${i < recentTransactions.length - 1 ? 'border-b border-border' : ''}`}>
                                    <div className="w-9 h-9 bg-page rounded-lg flex items-center justify-center text-t-muted flex-shrink-0">
                                        <FileText size={16} strokeWidth={1.8} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[13px] font-medium text-t-primary truncate">You sent an invoice to {tx.customer || 'John Doe'}</span>
                                        <span className="block text-[11px] text-t-muted mt-0.5">{tx.date}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="block text-[13px] font-semibold text-t-primary">
                                            {tx.amount}<span className="text-brand">STRK</span>
                                        </span>
                                        <span className="block text-[11px] text-t-muted mt-0.5">14:43:12</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="bg-white border border-border rounded-card px-6 py-8">
                <div className="flex items-center justify-center gap-2 font-semibold text-sm mb-6">
                    <Zap size={18} className="text-accent-orange" />
                    <span className="text-t-primary">Quick action</span>
                </div>
                <div className="flex justify-center gap-10">
                    {[
                        { icon: FileText, label: 'Invoice', to: '/invoices/create' },
                        { icon: Users, label: 'Customer', to: '/customers/add' },
                        { icon: ShoppingCart, label: 'Checkout', to: '/checkout/create' },
                        { icon: Package, label: 'Products', to: '/items/add' },
                    ].map((action) => (
                        <Link
                            key={action.label}
                            to={action.to}
                            className="flex flex-col items-center gap-3 hover:-translate-y-0.5 active:scale-95 transition-transform"
                        >
                            <div className="w-16 h-16 bg-brand flex items-center justify-center text-white shadow-md shadow-brand/20">
                                <action.icon size={26} strokeWidth={1.6} />
                            </div>
                            <span className="text-xs font-medium text-t-secondary">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Home;
