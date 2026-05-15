// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
    roundCurrency,
    safeAdd,
    safeMultiply,
    calculateLineTotal,
    calculateItemsTotal,
    formatCurrency,
} from '../utils/currency';

/**
 * ISSUE #6: Tests for JavaScript floating-point precision handling.
 * These utilities prevent incorrect totals due to floating-point arithmetic.
 */
describe('currency utilities', () => {
    describe('roundCurrency', () => {
        it('rounds to 2 decimal places by default', () => {
            expect(roundCurrency(1.005)).toBe(1.01);
            expect(roundCurrency(1.004)).toBe(1.0);
            expect(roundCurrency(10.999)).toBe(11.0);
        });

        it('handles custom decimal places', () => {
            expect(roundCurrency(1.2345, 3)).toBe(1.235);
            expect(roundCurrency(1.2345, 1)).toBe(1.2);
        });
    });

    describe('safeAdd', () => {
        it('avoids classic floating-point error (0.1 + 0.2)', () => {
            // In raw JS: 0.1 + 0.2 = 0.30000000000000004
            expect(safeAdd(0.1, 0.2)).toBe(0.3);
        });

        it('handles negative numbers', () => {
            expect(safeAdd(1.5, -0.3)).toBe(1.2);
        });

        it('handles larger sums', () => {
            expect(safeAdd(99.99, 0.01)).toBe(100.0);
        });
    });

    describe('safeMultiply', () => {
        it('avoids floating-point multiplication errors', () => {
            // In raw JS: 0.1 * 0.2 = 0.020000000000000004
            expect(safeMultiply(0.1, 0.2)).toBe(0.02);
        });

        it('calculates price * quantity correctly', () => {
            expect(safeMultiply(19.99, 3)).toBe(59.97);
            expect(safeMultiply(9.99, 10)).toBe(99.9);
        });
    });

    describe('calculateLineTotal', () => {
        it('handles string inputs (from form fields)', () => {
            expect(calculateLineTotal('10.50', '3')).toBe(31.5);
            expect(calculateLineTotal('0.99', '100')).toBe(99.0);
        });

        it('handles invalid inputs gracefully', () => {
            expect(calculateLineTotal('', '')).toBe(0);
            expect(calculateLineTotal(null, undefined)).toBe(0);
            expect(calculateLineTotal('abc', 'xyz')).toBe(0);
        });
    });

    describe('calculateItemsTotal', () => {
        it('sums multiple line items accurately', () => {
            const items = [
                { price: '10.00', quantity: 2 },
                { price: '5.50', quantity: 3 },
                { price: '0.99', quantity: 10 },
            ];
            // 20.00 + 16.50 + 9.90 = 46.40
            expect(calculateItemsTotal(items)).toBe(46.4);
        });

        it('handles floating-point edge cases in sum', () => {
            const items = [
                { price: '0.1', quantity: 1 },
                { price: '0.2', quantity: 1 },
            ];
            expect(calculateItemsTotal(items)).toBe(0.3);
        });

        it('returns 0 for invalid input', () => {
            expect(calculateItemsTotal(null)).toBe(0);
            expect(calculateItemsTotal(undefined)).toBe(0);
            expect(calculateItemsTotal([])).toBe(0);
        });
    });

    describe('formatCurrency', () => {
        it('formats numbers with proper decimal places', () => {
            expect(formatCurrency(10)).toBe('10.00');
            expect(formatCurrency(10.5)).toBe('10.50');
            expect(formatCurrency(10.999)).toBe('11.00');
        });

        it('handles custom decimal places', () => {
            expect(formatCurrency(10.12345, 4)).toBe('10.1235');
        });
    });
});