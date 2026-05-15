// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AlertCircle, ExternalLink } from 'lucide-react';
import illustration from '../../../assets/auth-splash.svg';
import Logo from '../../../components/ui/Logo';
import ConnectWalletModal from '../../../components/ui/ConnectWalletModal';

function SignIn() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { connectWallet, user, lastWallet } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);

    const redirectTo = searchParams.get('redirect') || '/';
    const sessionExpired = searchParams.get('reason') === 'expired';

    useEffect(() => {
        if (user.isAuthenticated) {
            navigate(redirectTo, { replace: true });
        }
    }, [user.isAuthenticated, navigate, redirectTo]);

    const handleConnectSuccess = () => {
        navigate(redirectTo, { replace: true });
    };

    const shortWallet = lastWallet
        ? `${lastWallet.slice(0, 6)}...${lastWallet.slice(-4)}`
        : null;

    return (
        <div className="min-h-screen flex">
            {/* ── Left Panel ── */}
            <div className="w-full lg:w-[40%] flex flex-col justify-start px-6 py-8 lg:px-10 lg:py-10 bg-white overflow-y-auto">
                {/* Logo */}
                <div className="mb-8 lg:mb-12">
                    <Logo variant="light" className="h-7 lg:h-9" />
                </div>

                {/* Session expired banner */}
                {sessionExpired && (
                    <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>Your session expired — reconnect to continue.</span>
                    </div>
                )}

                {/* Headline */}
                <h1 className="text-xl lg:text-3xl font-bold text-t-primary mb-3 leading-snug">
                    Manage clients, send invoices, and accept payments directly into your preferred wallet
                </h1>
                <p className="text-sm text-t-muted mb-8 lg:mb-10">
                    Connect your wallet to get started
                </p>

                {/* Returning user hint */}
                {shortWallet && !sessionExpired && (
                    <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-brand/5 border border-brand/20 rounded-lg text-sm text-brand">
                        <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                        <span>Welcome back — reconnect <span className="font-mono font-medium">{shortWallet}</span> to continue</span>
                    </div>
                )}

                {/* Connect Wallet Button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all mb-6 rounded-lg"
                >
                    Connect Wallet
                </button>

                <ConnectWalletModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    connectWalletFn={connectWallet}
                    onConnect={handleConnectSuccess}
                />


            </div>

            {/* ── Right Panel — Illustration ── */}
            <div className="hidden lg:block lg:w-[60%] bg-gray-50 relative overflow-hidden">
                <img
                    src={illustration}
                    alt="Tradazone — invoices, payments, crypto"
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </div>
        </div>
    );
}

export default SignIn;
