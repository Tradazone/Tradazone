// @ts-nocheck
function InvoiceSummary({ subtotal = 0, tax = 0, total = 0, currency = 'STRK' }) {
    return (
        <div className="flex justify-end mb-10">
            <div className="w-64">
                {/* Subtotal */}
                <div className="flex items-center justify-between py-3 border-t border-gray-200">
                    <span className="text-sm text-t-secondary">Sub total</span>
                    <span className="text-sm">
                        <span className="font-semibold text-t-primary">{subtotal}</span>
                        <span className="text-brand ml-0.5">{currency}</span>
                    </span>
                </div>

                {/* Tax */}
                <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-t-secondary">Tax</span>
                    <span className="text-sm">
                        <span className="font-semibold text-t-primary">{tax}</span>
                        <span className="text-brand ml-0.5">{currency}</span>
                    </span>
                </div>

                {/* Total Due */}
                <div className="flex items-center justify-between py-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-t-primary">Total Due</span>
                    <span className="text-sm">
                        <span className="font-bold text-t-primary">{total}</span>
                        <span className="text-brand ml-0.5">{currency}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

export default InvoiceSummary;
