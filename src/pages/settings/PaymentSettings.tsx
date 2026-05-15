// @ts-nocheck
import { useState } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/forms/Button';
import { useAuth } from '../../context/AuthContext';
import ConnectWalletModal from '../../components/ui/ConnectWalletModal';

// Stellar star icon
function StellarIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6H22.4L16 14.1L18.4 21.7L12 17.2L5.6 21.7L8 14.1L1.6 9.6H9.6L12 2Z" fill="currentColor" />
        </svg>
    );
}

function PaymentSettings() {
    const { wallet, walletType, connectWallet, disconnectWallet } = useAuth();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isStellar = walletType === 'stellar';

    const handleSwitchNetwork = async () => {
        await disconnectWallet();
        navigate('/signin');
    };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Payment Settings</h2>

            <div className="flex items-center gap-4 p-5 bg-white border border-border rounded-card mb-5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isStellar ? 'bg-blue-50 text-blue-600' : 'bg-brand-bg text-brand'}`}>
                    {isStellar ? <StellarIcon size={22} /> : <Wallet size={22} />}
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold">
                        {isStellar ? 'Freighter Wallet' : 'Argent Wallet'}
                    </div>
                    <div className="text-xs text-t-muted">
                        {wallet.isConnected ? wallet.address : 'Not connected'}
                    </div>
                </div>
                {wallet.isConnected ? (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleSwitchNetwork} className="hidden sm:flex">
                            Switch Network
                        </Button>
                        <Button variant="secondary" onClick={disconnectWallet}>
                            <span className="hidden sm:inline">Disconnect</span>
                            <LogOut size={16} className="sm:hidden" />
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>Connect Wallet</Button>
                )}
            </div>

            <div className="p-5 bg-page rounded-card mb-5">
                <h3 className="text-sm font-semibold mb-2">Wallet Balance</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{wallet.balance}</span>
                    <span className="text-t-muted">{wallet.currency}</span>
                </div>
            </div>

            <div className={`p-5 rounded-card ${isStellar ? 'bg-blue-50 text-blue-600' : 'bg-brand-bg text-brand'}`}>
                <p className="text-sm">
                    <strong>{isStellar ? 'Stellar Network' : 'Starknet Network'}</strong><br />
                    Payments are processed on the {isStellar ? 'Stellar' : 'Starknet'} network. Make sure your wallet is connected to receive payments.
                </p>
            </div>

            <ConnectWalletModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                connectWalletFn={connectWallet}
            />
        </div>
    );
}

export default PaymentSettings;
