// @ts-nocheck
/**
 * @fileoverview Integration tests for Context mutations — Issue #145
 *
 * ISSUE: #145 — Introduce integration tests for the Context mutations (documented in README).
 * Category: Testing & QA
 * Affected Area: AuthContext (`src/context/AuthContext.jsx`) + DataContext (`src/context/DataContext.jsx`)
 *
 * These tests exercise AuthContext and DataContext mutations together. Auth session
 * splits storage per #109: sensitive envelope lives in sessionStorage; localStorage
 * holds a flat profile object (not `{ user: ... }`), so assertions use that shape.
 *
 * Run: `npm test` — file is included in the default Vitest suite / CI.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DataProvider, useData } from '../context/DataContext';
import { STORAGE_PREFIX } from '../config/env';

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;
const WALLET_KEY  = `${STORAGE_PREFIX}_last_wallet`;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

// ─── Combined provider wrapper ────────────────────────────────────────────────

const wrapper = ({ children }) => (
    <AuthProvider>
        <DataProvider>{children}</DataProvider>
    </AuthProvider>
);

// ─── AuthContext mutation integration ─────────────────────────────────────────

describe('AuthContext mutation integration', () => {
    it('login → updateProfile → logout leaves localStorage clean', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.login({ id: '1', name: 'Alice', email: 'alice@example.com' });
        });
        expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();

        act(() => {
            result.current.updateProfile({ name: 'Alice Updated', company: 'ACME' });
        });
        const mid = JSON.parse(localStorage.getItem(SESSION_KEY));
        expect(mid.name).toBe('Alice Updated');
        expect(mid.company).toBe('ACME');

        act(() => {
            result.current.logout();
        });
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
        expect(result.current.user.isAuthenticated).toBe(false);
    });

    it('completeWalletLogin → updateProfile keeps walletAddress intact', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.completeWalletLogin('GADDR_INTEG', 'stellar');
        });
        act(() => {
            result.current.updateProfile({ name: 'Merchant', company: 'MerchCo' });
        });

        expect(result.current.user.walletAddress).toBe('GADDR_INTEG');
        expect(result.current.user.name).toBe('Merchant');
        const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
        expect(stored.walletAddress).toBe('GADDR_INTEG');
        expect(stored.company).toBe('MerchCo');
    });

    it('completeWalletLogin strips XSS from profileDescription via normalizeUserData', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.completeWalletLogin('0xABC', 'starknet');
        });
        act(() => {
            result.current.updateProfile({
                profileDescription: '<p>Safe<script>alert(1)</script></p>',
            });
        });

        expect(result.current.user.profileDescription).toBe('<p>Safe</p>');
        const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
        expect(stored.profileDescription).toBe('<p>Safe</p>');
    });

    it('wallet state and user state stay consistent after completeWalletLogin', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.completeWalletLogin('0xDEF456', 'starknet');
        });

        expect(result.current.user.walletAddress).toBe(result.current.wallet.address);
        expect(result.current.user.walletType).toBe(result.current.walletType);
        expect(result.current.user.isAuthenticated).toBe(true);
        expect(result.current.wallet.isConnected).toBe(true);
    });

    it('disconnectAll clears session and wallet keys from localStorage', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.completeWalletLogin('GADDR_DISC', 'stellar');
        });
        expect(localStorage.getItem(WALLET_KEY)).toBe('GADDR_DISC');

        await act(async () => {
            await result.current.disconnectAll();
        });

        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
        expect(localStorage.getItem(WALLET_KEY)).toBeNull();
        expect(result.current.user.isAuthenticated).toBe(false);
        expect(result.current.wallet.isConnected).toBe(false);
    });
});

// ─── DataContext mutation integration ─────────────────────────────────────────

describe('DataContext mutation integration', () => {
    it('addCustomer → addInvoice → markCheckoutPaid updates customer totalSpent', () => {
        const { result } = renderHook(() => useData(), { wrapper });

        let customer, item, checkout;
        act(() => {
            customer = result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' });
            item     = result.current.addItem({ name: 'Widget', price: '50' });
            checkout = result.current.addCheckout({ title: 'Order', amount: '150' });
        });

        act(() => {
            result.current.markCheckoutPaid(checkout.id, customer.id);
        });

        const updated = result.current.customers.find(c => c.id === customer.id);
        expect(updated.totalSpent).toBe('150');
        expect(updated.invoiceCount).toBe(1);
        expect(result.current.checkouts.find(c => c.id === checkout.id).status).toBe('paid');
    });

    it('addInvoice resolves customer name from DataContext state', () => {
        const { result } = renderHook(() => useData(), { wrapper });

        let customer, item, invoice;
        act(() => {
            customer = result.current.addCustomer({ name: 'Carol', email: 'carol@example.com' });
            item     = result.current.addItem({ name: 'Service', price: '200' });
        });
        act(() => {
            invoice = result.current.addInvoice({
                customerId: customer.id,
                dueDate: '2025-12-31',
                items: [{ itemId: item.id, quantity: 2, price: '200' }],
            });
        });

        expect(invoice.customer).toBe('Carol');
        expect(invoice.amount).toBe('400');
        expect(invoice.status).toBe('pending');
    });

    it('deleteItems removes items and does not affect customers or invoices', () => {
        const { result } = renderHook(() => useData(), { wrapper });

        let i1, i2;
        act(() => {
            result.current.addCustomer({ name: 'Dave', email: 'dave@example.com' });
            i1 = result.current.addItem({ name: 'A', price: '10' });
            i2 = result.current.addItem({ name: 'B', price: '20' });
        });

        act(() => {
            result.current.deleteItems([i1.id]);
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].id).toBe(i2.id);
        expect(result.current.customers).toHaveLength(1);
    });

    it('sequential checkouts accumulate customer spend correctly', async () => {
        const { result } = renderHook(() => useData(), { wrapper });

        let customer, chk1, chk2;
        act(() => {
            customer = result.current.addCustomer({ name: 'Eve', email: 'eve@example.com' });
        });
        act(() => {
            chk1 = result.current.addCheckout({ title: 'P1', amount: '100' });
        });
        await act(async () => {
            await Promise.resolve();
        });
        act(() => {
            chk2 = result.current.addCheckout({ title: 'P2', amount: '250' });
        });
        act(() => {
            result.current.markCheckoutPaid(chk1.id, customer.id);
            result.current.markCheckoutPaid(chk2.id, customer.id);
        });

        const updated = result.current.customers.find(c => c.id === customer.id);
        expect(updated.totalSpent).toBe('350');
        expect(updated.invoiceCount).toBe(2);
    });
});

// ─── Cross-context integration ────────────────────────────────────────────────

describe('cross-context integration (Auth + Data)', () => {
    it('auth login does not reset DataContext state', () => {
        const { result: authResult } = renderHook(() => useAuth(), { wrapper });
        const { result: dataResult } = renderHook(() => useData(), { wrapper });

        act(() => {
            dataResult.current.addCustomer({ name: 'Frank', email: 'frank@example.com' });
        });
        expect(dataResult.current.customers).toHaveLength(1);

        act(() => {
            authResult.current.login({ id: '99', name: 'Admin', email: 'admin@example.com' });
        });

        // DataContext state must be unaffected by auth mutations
        expect(dataResult.current.customers).toHaveLength(1);
        expect(dataResult.current.customers[0].name).toBe('Frank');
    });

    it('auth logout does not reset DataContext state', () => {
        const { result: authResult } = renderHook(() => useAuth(), { wrapper });
        const { result: dataResult } = renderHook(() => useData(), { wrapper });

        act(() => {
            authResult.current.login({ id: '1', name: 'Alice', email: 'a@a.com' });
            dataResult.current.addCheckout({ title: 'CHK', amount: '99' });
        });
        act(() => {
            authResult.current.logout();
        });

        expect(dataResult.current.checkouts).toHaveLength(1);
        expect(authResult.current.user.isAuthenticated).toBe(false);
    });
});
