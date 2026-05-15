// @ts-nocheck
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Wallet, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';
import ConnectWalletModal from '../../components/ui/ConnectWalletModal';

function MailCheckout() {
    const { checkoutId } = useParams();
    const { checkouts } = useData();
    const checkout = checkouts.find(c => c.id === checkoutId) || {
        id: checkoutId || 'demo', title: 'Premium Package', description: 'Full service web development package', amount: '200', currency: 'STRK'
    };
    
    const { connectWallet } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handlePay = () => { setIsModalOpen(true); };

    return (
        <div className="min-h-screen bg-brand flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Logo variant="dark" className="h-7 mx-auto mb-1" />
                    <p className="text-white/60 text-sm">Secure crypto payment</p>
                </div>

                <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
                    <h1 className="text-xl font-bold text-t-primary mb-2">{checkout.title}</h1>
                    <p className="text-sm text-t-muted mb-8">{checkout.description}</p>

                    <div className="flex items-baseline justify-center gap-2 mb-8">
                        <span className="text-5xl font-bold text-t-primary">{checkout.amount}</span>
                        <span className="text-lg text-t-muted">{checkout.currency}</span>
                    </div>

                    <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all" onClick={handlePay}>
                        <Wallet size={20} /> Connect Wallet to Pay
                    </button>
                </div>

                <ConnectWalletModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    connectWalletFn={connectWallet}
                />

                <p className="text-center text-sm text-white/40 mt-6">Powered by Tradazone on Starknet</p>
            </div>
        </div>
    );
}

export default MailCheckout;
