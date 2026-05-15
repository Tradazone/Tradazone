// @ts-nocheck
import { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import InvoiceLayout from '../../components/invoice/InvoiceLayout';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

function InvoicePreview() {
    const { id } = useParams();
    const invoiceRef = useRef(null);
    const { user } = useAuth();
    const { invoices, customers } = useData();

    const invoice = invoices.find((inv) => inv.id === id);
    const customer = invoice
        ? customers.find((c) => c.id === invoice.customerId)
        : null;

    if (!invoice) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <p className="text-t-muted text-lg">Invoice not found</p>
            </div>
        );
    }

    const sender = {
        name: user?.name || 'Tradazone',
        email: user?.email || 'hello@tradazone.com',
    };

    const handleDownload = async () => {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = invoiceRef.current;

        const options = {
            margin: 0,
            filename: `${invoice.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
            },
        };

        html2pdf().set(options).from(element).save();
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white">
            {/* Toolbar – hidden when printing */}
            <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
                <div className="max-w-[794px] mx-auto flex items-center justify-between">
                    <Link
                        to={`/invoices/${id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Invoice
                    </Link>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 text-sm font-semibold bg-white text-t-primary border border-border hover:bg-gray-50 active:scale-95 transition-all"
                        >
                            <Printer size={16} /> Print
                        </button>
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all"
                        >
                            <Download size={16} /> Download PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice A4 Page */}
            <div className="py-10 px-4 print:p-0">
                <InvoiceLayout
                    ref={invoiceRef}
                    invoice={invoice}
                    customer={customer}
                    sender={sender}
                />
            </div>
        </div>
    );
}

export default InvoicePreview;
