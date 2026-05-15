// @ts-nocheck
/**
 * Currency Calculation Utilities
 * 
 * Addresses Issue #6: JavaScript floating-point precision issues in calculations.
 * 
 * JavaScript uses IEEE 754 floating-point arithmetic which can cause precision
 * errors (e.g., 0.1 + 0.2 = 0.30000000000000004). These utilities ensure accurate
 * currency/decimal calculations by converting to integer arithmetic.
 */

/**
 * Rounds a number to a specified number of decimal places.
 * @param {number} value - The value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} The rounded value
 */
export function roundCurrency(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Safely adds two decimal numbers without floating-point errors.
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} decimals - Decimal precision (default: 2)
 * @returns {number} The sum rounded to specified decimals
 */
export function safeAdd(a, b, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((a * factor) + (b * factor)) / factor;
}

/**
 * Safely multiplies two decimal numbers without floating-point errors.
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} decimals - Decimal precision (default: 2)
 * @returns {number} The product rounded to specified decimals
 */
export function safeMultiply(a, b, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(a * b * factor) / factor;
}

/**
 * Calculates the total for a line item (price * quantity) with safe precision.
 * @param {number|string} price - The unit price
 * @param {number|string} quantity - The quantity
 * @param {number} decimals - Decimal precision (default: 2)
 * @returns {number} The line total rounded to specified decimals
 */
export function calculateLineTotal(price, quantity, decimals = 2) {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = Number(quantity) || 0;
    return safeMultiply(priceNum, quantityNum, decimals);
}

/**
 * Calculates the sum of an array of line items with safe precision.
 * @param {Array<{price: number|string, quantity: number|string}>} items - Array of items
 * @param {number} decimals - Decimal precision (default: 2)
 * @returns {number} The total sum rounded to specified decimals
 */
export function calculateItemsTotal(items, decimals = 2) {
    if (!Array.isArray(items)) return 0;
    
    const factor = Math.pow(10, decimals);
    const totalInCents = items.reduce((sum, item) => {
        const priceNum = parseFloat(item.price) || 0;
        const quantityNum = Number(item.quantity) || 0;
        return sum + Math.round(priceNum * quantityNum * factor);
    }, 0);
    
    return totalInCents / factor;
}

/**
 * Formats a number as currency string with specified decimals.
 * @param {number} value - The value to format
 * @param {number} decimals - Decimal precision (default: 2)
 * @returns {string} The formatted currency string
 */
export function formatCurrency(value, decimals = 2) {
    return roundCurrency(value, decimals).toFixed(decimals);
}
