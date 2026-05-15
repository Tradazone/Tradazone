// @ts-nocheck
import { getCurrencyPreference, formatPrice } from '../../utils/currencyPreference';

function InvoiceTable({ items = [] }) {
    const displayCurrency = getCurrencyPreference();

    return (
        <div className="mb-8">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-200 py-3">
                <span className="text-sm font-semibold text-t-primary">Item Description</span>
                <span className="text-sm font-semibold text-brand text-center">Price</span>
                <span className="text-sm font-semibold text-brand text-center">Quantity</span>
                <span className="text-sm font-semibold text-brand text-right">Amount</span>
            </div>

            {items.map((item, index) => {
                const amount = parseFloat(item.price) * item.quantity;
                return (
                    <div
                        key={index}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-200 py-4"
                    >
                        <span className="text-sm text-t-primary">{item.name}</span>
                        <span className="text-sm text-brand text-center">{formatPrice(item.price, displayCurrency)}</span>
                        <span className="text-sm text-brand text-center">{item.quantity}</span>
                        <span className="text-sm text-brand text-right">{formatPrice(amount, displayCurrency)}</span>
                    </div>
                );
            })}

            {items.length < 4 &&
                Array.from({ length: 4 - items.length }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-200 py-4"
                    >
                        <span className="text-sm text-gray-300">Item Description</span>
                        <span className="text-sm text-gray-300 text-center">Price</span>
                        <span className="text-sm text-gray-300 text-center">Quantity</span>
                        <span className="text-sm text-gray-300 text-right">Amount</span>
                    </div>
                ))}
        </div>
    );
}

export default InvoiceTable;
