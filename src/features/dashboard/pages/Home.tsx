import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    ArrowDownRight,
    FileText,
    Users,
    ShoppingCart,
    Package,
    Zap,
    ChevronDown,
    ArrowUpRight,
    CheckCircle,
    Clock,
    AlertCircle,
    XCircle,
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import WelcomeModal from '../../../components/ui/WelcomeModal';
import LazyChart from '../../../components/ui/LazyChart';
import StatusBadge from '../../../components/tables/StatusBadge';
import { formatPrice, useCurrencyPreference } from '../../../utils/currencyPreference';
import type { Invoice, Checkout } from '../../../types';
import type { LucideIcon } from 'lucide-react';

// ── Filter helpers ────────────────────────────────────────────────────────────

const FILTERS = [
    { label: 'Last week',  key: 'week'  },
    { label: 'Last month', key: 'month' },
    { label: 'Last year',  key: 'year'  },
];

function getStartDate(key: string): Date {
    const now = new Date();
    if (key === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7);   return d; }
    if (key === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    if (key === 'year')  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    return new Date(0);
}

// Build last-6-months revenue data from paid invoices + paid checkouts
function buildRevenueChart(invoices: Invoice[], checkouts: Checkout[]) {
    const months = [];
    const labels = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
        months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const totals = months.map(({ year, month }) => {
        const invTotal = invoices
            .filter(inv => inv.status === 'paid' && inv.paidAt)
            .filter(inv => {
                const d = new Date(inv.paidAt as string);
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .reduce((sum: number, inv: Invoice) => sum + parseFloat((inv.amount || '0').replace(/,/g, '')), 0);

        const chkTotal = checkouts
            .filter(c => c.status === 'paid' && c.updatedAt)
            .filter(c => {
                const d = new Date(c.updatedAt as string);
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .reduce((sum: number, c: Checkout) => sum + parseFloat(c.amount || '0'), 0);

        return invTotal + chkTotal;
    });

    return { labels, totals };
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'text-brand' }: {
    icon: LucideIcon; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div className="bg-white border border-border rounded-card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-page flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={20} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-t-muted font-medium mb-0.5">{label}</p>
                <p className="text-xl font-bold text-t-primary leading-none">{value}</p>
                {sub && <p className="text-xs text-t-muted mt-1">{sub}</p>}
            </div>
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

function Home() {
    const { invoices = [], checkouts = [], customers = [] } = useData();
    const displayCurrency = useCurrencyPreference();
    const [txFilter, setTxFilter] = useState('month');

    // Invoice breakdown
    const paidInvoices    = invoices.filter(inv => inv.status === 'paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent');
    const overdueInvoices = invoices.filter(inv => {
        if (inv.status === 'paid') return false;
        return inv.dueDate && new Date(inv.dueDate) < new Date();
    });
    const unpaidInvoices  = invoices.filter(inv => inv.status === 'unpaid');

    // Revenue: paid invoices + paid checkouts
    const paidCheckouts = checkouts.filter(c => c.status === 'paid');
    const filterStart   = getStartDate(txFilter);

    const filteredTotal = [
        ...paidInvoices
            .filter(inv => inv.paidAt && new Date(inv.paidAt) >= filterStart)
            .map(inv => parseFloat((inv.amount || '0').replace(/,/g, ''))),
        ...paidCheckouts
            .filter(c => c.updatedAt && new Date(c.updatedAt) >= filterStart)
            .map(c => parseFloat(c.amount || '0')),
    ].reduce((a, b) => a + b, 0);

    const totalAllTime = [
        ...paidInvoices.map(inv => parseFloat((inv.amount || '0').replace(/,/g, ''))),
        ...paidCheckouts.map(c => parseFloat(c.amount || '0')),
    ].reduce((a, b) => a + b, 0);

    const receivables = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + parseFloat((inv.amount || '0').replace(/,/g, '')), 0);

    const activeCheckouts = checkouts.filter(c => c.status === 'active').length;

    // Recent transactions: paid invoices + paid checkouts, last 10, sorted desc
    const recentTransactions = [
        ...paidInvoices.map(inv => ({
            id:      inv.id,
            type:    'invoice',
            label:   `Invoice — ${inv.customer}`,
            date:    inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : 'Unknown',
            rawDate: inv.paidAt || '',
            amount:  inv.amount,
            status:  inv.status,
        })),
        ...paidCheckouts.map(c => ({
            id:      c.id,
            type:    'checkout',
            label:   `Checkout — ${c.title}`,
            date:    c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Unknown',
            rawDate: c.updatedAt || '',
            amount:  c.amount,
            status:  c.status,
        })),
    ]
        .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
        .slice(0, 10);

    const activeFilterLabel = FILTERS.find(f => f.key === txFilter)?.label || 'Last month';

    // Revenue chart data
    const { labels: chartLabels, totals: chartTotals } = buildRevenueChart(invoices, checkouts);
    const chartData = {
        labels: chartLabels,
        datasets: [{
            label: 'Revenue',
            data: chartTotals,
            fill: true,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#6366f1',
            tension: 0.4,
        }],
    };
    const chartOptions = {
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { maxTicksLimit: 5, callback: (v: number) => formatPrice(v, displayCurrency) },
                grid: { color: 'rgba(0,0,0,0.04)' },
            },
            x: { grid: { display: false } },
        },
    };

    return (
        <div className="max-w-[1100px]">
            <WelcomeModal />

            <h1 className="text-xl font-medium text-t-primary mb-6">
                Welcome to Tradazone
            </h1>

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon={Users}
                    label="Total Customers"
                    value={customers.length}
                    color="text-purple-500"
                />
                <StatCard
                    icon={FileText}
                    label="Total Invoices"
                    value={invoices.length}
                    sub={`${paidInvoices.length} paid · ${pendingInvoices.length} pending`}
                    color="text-brand"
                />
                <StatCard
                    icon={ShoppingCart}
                    label="Active Checkouts"
                    value={activeCheckouts}
                    sub={`${checkouts.length} total`}
                    color="text-accent-orange"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Total Revenue"
                    value={formatPrice(totalAllTime, displayCurrency)}
                    color="text-green-500"
                />
            </div>

            {/* ── Invoice breakdown chips ── */}
            <div className="flex flex-wrap gap-3 mb-6">
                {[
                    { icon: CheckCircle, label: 'Paid',    count: paidInvoices.length,    color: 'text-green-600 bg-green-50' },
                    { icon: Clock,       label: 'Pending', count: pendingInvoices.length,  color: 'text-amber-600 bg-amber-50' },
                    { icon: AlertCircle, label: 'Overdue', count: overdueInvoices.length,  color: 'text-red-600 bg-red-50' },
                    { icon: XCircle,     label: 'Unpaid',  count: unpaidInvoices.length,   color: 'text-t-muted bg-page' },
                ].map(({ icon: Icon, label, count, color }) => (
                    <Link
                        key={label}
                        to="/invoices"
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${color} hover:opacity-80 transition-opacity`}
                    >
                        <Icon size={13} />
                        {count} {label}
                    </Link>
                ))}
            </div>

            {/* ── Top Row: revenue total + receivable ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* Total Transactions Card */}
                <div className="bg-brand rounded-card p-6 text-white flex flex-col min-h-[192px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <ArrowUpRight size={15} strokeWidth={2} />
                            </div>
                            <span className="text-sm font-semibold text-white">Total Revenue</span>
                        </div>
                        <div className="relative">
                            <select
                                value={txFilter}
                                onChange={e => setTxFilter(e.target.value)}
                                className="appearance-none bg-white/15 text-white text-xs font-medium pl-3 pr-7 py-1.5 rounded-md outline-none cursor-pointer border border-white/20 hover:bg-white/25 transition-colors"
                            >
                                {FILTERS.map(f => (
                                    <option key={f.key} value={f.key} className="text-t-primary bg-white">
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[44px] font-bold leading-none tracking-tight">
                            {formatPrice(filteredTotal, displayCurrency)}
                        </span>
                    </div>
                    <span className="text-sm text-white/60 mt-auto">{activeFilterLabel} · {formatPrice(totalAllTime, displayCurrency)} all time</span>
                </div>

                {/* Total Receivable Card */}
                <div className="bg-white border border-border rounded-card p-6 flex flex-col min-h-[192px]">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight size={20} strokeWidth={2} className="text-brand" />
                        <span className="text-base font-semibold text-t-primary">Total receivable</span>
                    </div>
                    <p className="text-sm text-t-muted mb-5">Total unpaid invoices</p>
                    <div className="w-full h-2.5 bg-page overflow-hidden mb-5">
                        <div
                            className="h-full bg-brand"
                            style={{
                                width: (() => {
                                    const total = totalAllTime + receivables;
                                    return total > 0 ? `${(totalAllTime / total) * 100}%` : '0%';
                                })()
                            }}
                        />
                    </div>
                    <div className="flex gap-10 mt-auto">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-t-muted font-medium">Collected</span>
                            <span className="text-base font-bold text-t-primary">
                                {formatPrice(totalAllTime, displayCurrency)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-t-muted font-medium">Unpaid</span>
                            <span className="text-base font-bold text-t-primary">
                                {formatPrice(receivables, displayCurrency)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Revenue Over Time chart ── */}
            <div className="bg-white border border-border rounded-card p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} strokeWidth={1.8} className="text-brand" />
                    <h2 className="text-sm font-semibold text-t-primary">Revenue Over Time</h2>
                    <span className="text-xs text-t-muted ml-auto">Last 6 months</span>
                </div>
                {chartTotals.every(v => v === 0) ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center">
                        <TrendingUp size={32} className="text-t-muted/30 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-t-secondary">No revenue data yet</p>
                        <p className="text-xs text-t-muted">Chart will populate as you receive payments.</p>
                    </div>
                ) : (
                    <LazyChart type="line" data={chartData} options={chartOptions} height={200} />
                )}
            </div>

            {/* ── Recent Transactions ── */}
            <div className="bg-white border border-border rounded-card overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2 font-semibold text-sm text-t-primary">
                        <FileText size={18} strokeWidth={1.8} />
                        <span>Recent Transactions</span>
                    </div>
                    <Link to="/invoices" className="text-xs text-brand hover:underline">View all</Link>
                </div>
                {recentTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                        <FileText size={32} className="text-t-muted/30 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-t-secondary mb-1">No transactions yet</p>
                        <p className="text-xs text-t-muted">Transactions appear here once you receive payments.</p>
                    </div>
                ) : (
                    recentTransactions.map((tx, i) => (
                        <div key={tx.id} className={`flex items-center gap-3 px-6 py-3.5 ${i < recentTransactions.length - 1 ? 'border-b border-border' : ''}`}>
                            <div className="w-9 h-9 bg-page rounded-lg flex items-center justify-center text-t-muted flex-shrink-0">
                                {tx.type === 'checkout' ? <ShoppingCart size={16} strokeWidth={1.8} /> : <FileText size={16} strokeWidth={1.8} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="block text-[13px] font-medium text-t-primary truncate">{tx.label}</span>
                                <span className="block text-[11px] text-t-muted mt-0.5">{tx.date}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <StatusBadge status={tx.status} />
                                <span className="text-[13px] font-semibold text-green-600">
                                    +{formatPrice(tx.amount, displayCurrency)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Quick Actions ── */}
            <div className="bg-white border border-border rounded-card px-6 py-8">
                <div className="flex items-center justify-center gap-2 font-semibold text-sm mb-6">
                    <Zap size={18} className="text-accent-orange" />
                    <span className="text-t-primary">Quick action</span>
                </div>
                <div className="flex justify-center gap-10">
                    {[
                        { icon: FileText,     label: 'Invoice',   to: '/invoices/create'  },
                        { icon: ShoppingCart, label: 'Checkout',  to: '/checkout/create'  },
                        { icon: Users,        label: 'Customer',  to: '/customers/add'    },
                        { icon: Package,      label: 'Products',  to: '/items/add'        },
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
