// @ts-nocheck
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Link as LinkIcon, Edit, Trash2, ExternalLink } from 'lucide-react';
import Button from '../../components/forms/Button';
import StatusBadge from '../../components/tables/StatusBadge';
import { useData } from '../../context/DataContext';

function CheckoutDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { checkouts } = useData();
    const checkout = checkouts.find(c => c.id === id);

    if (!checkout) return <div className="p-8"><p className="text-t-muted">Checkout not found</p></div>;

    const copyLink = () => { navigator.clipboard.writeText(checkout.paymentLink); };

    return (
        <div>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <Link to="/checkout" className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2">
                        <ArrowLeft size={16} /> Back to Checkouts
                    </Link>
                    <h1 className="text-xl font-semibold text-t-primary">{checkout.title}</h1>
                    <p className="text-sm text-t-muted">{checkout.id}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={Edit}>Edit</Button>
                    <Button variant="danger" icon={Trash2}>Delete</Button>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold">Checkout Information</h2>
                    <StatusBadge status={checkout.status} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <div><span className="block text-xs text-t-muted mb-1">Amount</span><span className="text-sm font-medium">{checkout.amount} {checkout.currency}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Description</span><span className="text-sm font-medium">{checkout.description}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Views</span><span className="text-sm font-medium">{checkout.views}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Payments</span><span className="text-sm font-medium">{checkout.payments}</span></div>
                    <div><span className="block text-xs text-t-muted mb-1">Created</span><span className="text-sm font-medium">{checkout.createdAt}</span></div>
                </div>
            </div>

            <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-base font-semibold mb-4">Payment Link</h2>
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-page rounded-lg">
                        <LinkIcon size={16} className="text-t-muted" />
                        <span className="text-sm flex-1">{checkout.paymentLink}</span>
                    </div>
                    <Button variant="secondary" icon={Copy} onClick={copyLink}>Copy</Button>
                    <Button variant="secondary" icon={ExternalLink}>Open</Button>
                </div>
            </div>
        </div>
    );
}

export default CheckoutDetail;
