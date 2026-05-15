// @ts-nocheck
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Link as LinkIcon } from 'lucide-react';
import Input from '../../components/forms/Input';
import Button from '../../components/forms/Button';
import { useData } from '../../context/DataContext';
import Logo from '../../components/ui/Logo';

function CreateCheckout() {
    const navigate = useNavigate();
    const { addCheckout } = useData();
    const [formData, setFormData] = useState({ title: '', description: '', amount: '', currency: 'STRK' });

    const handleSubmit = (e) => {
        e.preventDefault();
        addCheckout(formData);
        navigate('/checkout');
    };

    const handleChange = (field) => (e) => { setFormData({ ...formData, [field]: e.target.value }); };

    const previewLink = formData.title
        ? `tradazone.github.io/Tradazone/pay/${formData.title.toLowerCase().replace(/\s+/g, '-')}`
        : 'tradazone.github.io/Tradazone/pay/your-checkout';

    return (
        <div>
            <div className="mb-6">
                <Link to="/checkout" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                    <ArrowLeft size={16} /> Back to Checkouts
                </Link>
                <h1 className="text-xl font-semibold text-t-primary">Create Checkout</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
                <form onSubmit={handleSubmit} className="bg-white border border-border rounded-card p-6">
                    <h2 className="text-base font-semibold mb-5">Checkout Details</h2>
                    <div className="flex flex-col gap-5 mb-6">
                        <Input label="Title" placeholder="Enter checkout title" value={formData.title} onChange={handleChange('title')} required />
                        <Input label="Description" placeholder="Enter description" value={formData.description} onChange={handleChange('description')} />
                        <div className="relative">
                            <Input label="Amount" type="number" placeholder="0.00" value={formData.amount} onChange={handleChange('amount')} required />
                            <span className="absolute right-3 bottom-2.5 text-xs font-semibold text-brand bg-brand-bg px-2 py-1 rounded">STRK</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button variant="secondary" onClick={() => navigate('/checkout')}>Cancel</Button>
                        <Button type="submit" variant="primary">Create Checkout</Button>
                    </div>
                </form>

                <div>
                    <h2 className="text-base font-semibold mb-4">Preview</h2>
                    <div className="bg-white border border-border rounded-card overflow-hidden mb-4">
                        <div className="bg-brand px-5 py-4">
                            <Logo variant="dark" className="h-5" />
                        </div>
                        <div className="p-6 text-center">
                            <h3 className="text-lg font-semibold mb-2">{formData.title || 'Your Checkout Title'}</h3>
                            <p className="text-sm text-t-muted mb-6">{formData.description || 'Description will appear here'}</p>
                            <div className="flex items-baseline justify-center gap-2 mb-6">
                                <span className="text-4xl font-bold">{formData.amount || '0'}</span>
                                <span className="text-t-muted">STRK</span>
                            </div>
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold opacity-50 cursor-not-allowed" disabled>
                                Connect Wallet to Pay
                            </button>
                        </div>
                    </div>

                    <div>
                        <span className="block text-xs font-medium text-t-muted mb-2 uppercase tracking-wide">Payment Link</span>
                        <div className="flex items-center gap-2 px-4 py-3 bg-page rounded-lg border border-border">
                            <LinkIcon size={16} className="text-t-muted flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{previewLink}</span>
                            <button type="button" className="text-t-muted hover:text-brand transition-colors flex-shrink-0">
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateCheckout;
