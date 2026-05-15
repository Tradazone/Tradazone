// @ts-nocheck
import { useState, useEffect } from 'react';

const STORAGE_KEY  = 'tradazone_display_currency';
const CHANGE_EVENT = 'tradazone-currency-changed';

export const FIAT_CURRENCIES   = ['USD', 'EUR', 'GBP', 'NGN'];
export const CRYPTO_CURRENCIES = ['STRK', 'ETH', 'XLM'];

export const FIAT_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };

/** Returns the saved display currency (default: 'USD'). */
export function getCurrencyPreference() {
    try {
        return localStorage.getItem(STORAGE_KEY) || 'USD';
    } catch {
        return 'USD';
    }
}

/** Saves the display currency and notifies other components on the same tab. */
export function saveCurrencyPreference(currency) {
    try {
        localStorage.setItem(STORAGE_KEY, currency);
        window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {}
}

/** True when the currency is a fiat currency. */
export function isFiat(currency) {
    return FIAT_CURRENCIES.includes(currency);
}

/**
 * Formats a price with its currency symbol or code.
 *   formatPrice(50, 'USD')  → '$50.00'
 *   formatPrice(100, 'STRK') → '100 STRK'
 */
export function formatPrice(amount, currency) {
    const num = parseFloat(amount || 0);
    const sym = FIAT_SYMBOLS[currency];
    if (sym) return `${sym}${num.toFixed(2)}`;
    return `${num} ${currency}`;
}

/**
 * React hook — returns the current display currency and re-renders when the
 * user changes it in Settings during the same tab session.
 */
export function useCurrencyPreference() {
    const [currency, setCurrency] = useState(getCurrencyPreference);

    useEffect(() => {
        const sync = () => setCurrency(getCurrencyPreference());
        window.addEventListener(CHANGE_EVENT, sync);
        return () => window.removeEventListener(CHANGE_EVENT, sync);
    }, []);

    return currency;
}
