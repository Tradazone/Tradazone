import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ShoppingCart, X, CheckCircle, ChevronRight } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';
import type { UserData, WalletState } from '../../types';

const ONBOARDED_KEY = 'tradazone_onboarded';

function truncate(addr = '', head = 8, tail = 6) {
    if (!addr || addr.length <= head + tail + 3) return addr;
    return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function WelcomeModal() {
    const navigate = useNavigate();
    const { user, wallet, updateProfile } = useAuth() as {
        user: UserData;
        wallet: WalletState;
        updateProfile: (updates: Partial<UserData>) => void;
    };
    const [step, setStep] = useState(1);
    const [visible, setVisible] = useState(false);
    const [profile, setProfile] = useState({ name: '', email: '', description: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const done = localStorage.getItem(ONBOARDED_KEY);
        if (done === null || done === 'false') {
            setStep(1);
            setVisible(true);
        }
    }, []);

    // Close on Escape
    useEffect(() => {
        if (!visible) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [visible]);

    // Pre-fill profile from existing user data
    useEffect(() => {
        if (visible && user) {
            setProfile({
                name:        user.name        || '',
                email:       user.email       || '',
                description: user.profileDescription || '',
            });
        }
    }, [visible, user]);

    const dismiss = () => {
        localStorage.setItem(ONBOARDED_KEY, 'true');
        setVisible(false);
    };

    const goTo = (path: string) => {
        dismiss();
        navigate(path);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            if (typeof updateProfile === 'function') {
                updateProfile({
                    name:               profile.name.trim()        || user?.name || '',
                    email:              profile.email.trim()       || user?.email || '',
                    profileDescription: profile.description.trim() || '',
                });
            }
        } finally {
            setSaving(false);
            setStep(3);
        }
    };

    if (!visible) return null;

    const TOTAL_STEPS = 3;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                onClick={dismiss}
                aria-hidden="true"
            />

            {/* Modal — bottom sheet on mobile, centred on desktop */}
            <div className="
                fixed z-50
                bottom-0 left-0 right-0
                lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
                lg:w-full lg:max-w-md
                bg-white shadow-2xl p-6 lg:p-8
                animate-slide-up lg:animate-none
            "
                role="dialog"
                aria-modal="true"
                aria-label="Welcome to Tradazone — onboarding"
            >
                {/* Drag handle — mobile only */}
                <div className="lg:hidden w-10 h-1 bg-border mx-auto mb-4" />

                {/* Close */}
                <button
                    onClick={dismiss}
                    className="absolute top-4 right-4 text-t-muted hover:text-t-primary transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-5">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                        <span
                            key={i}
                            className={`block rounded-full transition-all ${
                                i + 1 === step
                                    ? 'w-5 h-1.5 bg-brand'
                                    : i + 1 < step
                                    ? 'w-2 h-1.5 bg-brand/40'
                                    : 'w-2 h-1.5 bg-border'
                            }`}
                        />
                    ))}
                </div>

                {/* ─── Step 1: Welcome + wallet confirmation ─── */}
                {step === 1 && (
                    <div className="text-center">
                        <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Logo variant="light" className="h-5" />
                        </div>
                        <h2 className="text-lg lg:text-xl font-bold text-t-primary mb-1">Welcome to Tradazone</h2>
                        <p className="text-sm text-t-muted mb-5">Your wallet is connected and ready.</p>

                        {wallet?.isConnected && (
                            <div className="flex items-center gap-2 justify-center bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-6">
                                <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-green-700">
                                    {wallet.currency} wallet connected
                                </span>
                                <span className="text-xs font-mono text-green-600 ml-1">
                                    {truncate(wallet.address)}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={() => setStep(2)}
                            className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand/90 active:scale-[0.98] transition-all mb-3"
                        >
                            Get started <ChevronRight size={16} />
                        </button>
                        <button onClick={dismiss} className="w-full text-sm text-t-muted hover:text-t-primary transition-colors py-2">
                            Skip for now
                        </button>
                    </div>
                )}

                {/* ─── Step 2: Complete profile ─── */}
                {step === 2 && (
                    <div>
                        <h2 className="text-lg font-bold text-t-primary mb-1">Complete your profile</h2>
                        <p className="text-sm text-t-muted mb-5">This appears on your invoices and checkout pages.</p>

                        <div className="flex flex-col gap-3 mb-5">
                            <div>
                                <label className="block text-xs font-medium text-t-secondary mb-1">Business name</label>
                                <input
                                    type="text"
                                    placeholder="Your business or full name"
                                    value={profile.name}
                                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-t-secondary mb-1">Email address</label>
                                <input
                                    type="email"
                                    placeholder="hello@yourbusiness.com"
                                    value={profile.email}
                                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-t-secondary mb-1">
                                    Business description <span className="text-t-muted font-normal">(optional)</span>
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="A short description of what you do…"
                                    value={profile.description}
                                    onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand/90 active:scale-[0.98] transition-all mb-3 disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : 'Save & continue'}
                            {!saving && <ChevronRight size={16} />}
                        </button>
                        <button onClick={() => setStep(3)} className="w-full text-sm text-t-muted hover:text-t-primary transition-colors py-2">
                            Skip
                        </button>
                    </div>
                )}

                {/* ─── Step 3: First action ─── */}
                {step === 3 && (
                    <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle size={22} className="text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-t-primary mb-1">You're all set!</h2>
                        <p className="text-sm text-t-muted mb-6">What would you like to do first?</p>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <button
                                onClick={() => goTo('/invoices/create')}
                                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:border-brand/40 hover:bg-brand/5 active:scale-95 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-brand flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <span className="text-xs font-semibold text-t-secondary group-hover:text-brand">Create your first Invoice</span>
                            </button>
                            <button
                                onClick={() => goTo('/checkout/create')}
                                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:border-brand/40 hover:bg-brand/5 active:scale-95 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-orange-50 text-accent-orange flex items-center justify-center">
                                    <ShoppingCart size={18} />
                                </div>
                                <span className="text-xs font-semibold text-t-secondary group-hover:text-brand">Create a Payment Link</span>
                            </button>
                        </div>

                        <button onClick={dismiss} className="w-full text-sm text-t-muted hover:text-t-primary transition-colors py-2">
                            I'll explore on my own
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

export default WelcomeModal;
