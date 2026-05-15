// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import { DataProvider } from '../../../context/DataContext';
import InvoiceDetail from '../pages/InvoiceDetail';
import { STORAGE_PREFIX } from '../../../config/env';

// #21: verify that an expired session redirects instead of silently showing stale data.

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;

const validUser = {
    id: '1',
    name: 'Emma',
    email: 'emma@example.com',
    isAuthenticated: true,
    walletAddress: null,
    walletType: null,
};

// Minimal SignIn stub — uses useLocation so MemoryRouter's search string is visible
function SignIn() {
    const { search } = useLocation();
    return <div data-testid="signin-page">{search}</div>;
}

function renderInvoiceDetail(invoiceId = 'INV-001') {
    return render(
        <AuthProvider>
            <DataProvider>
                <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
                    <Routes>
                        <Route path="/signin" element={<SignIn />} />
                        <Route path="/invoices/:id" element={<InvoiceDetail />} />
                    </Routes>
                </MemoryRouter>
            </DataProvider>
        </AuthProvider>
    );
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

describe('InvoiceDetail — valid session', () => {
    beforeEach(() => {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ user: validUser, expiresAt: Date.now() + 999_999 })
        );
    });

    it('does not redirect when the session is live', async () => {
        await act(async () => { renderInvoiceDetail(); });
        expect(screen.queryByTestId('signin-page')).toBeNull();
    });

    it('renders the "Invoice not found" fallback for an unknown ID', async () => {
        await act(async () => { renderInvoiceDetail('INV-UNKNOWN'); });
        expect(screen.getByText('Invoice not found')).toBeTruthy();
    });
});

describe('InvoiceDetail — expired session (Issue #21)', () => {
    beforeEach(() => {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ user: validUser, expiresAt: Date.now() - 1 })
        );
    });

    it('redirects to /signin when the token is expired', async () => {
        await act(async () => { renderInvoiceDetail(); });
        expect(screen.getByTestId('signin-page')).toBeTruthy();
    });

    it('includes reason=expired in the redirect URL', async () => {
        await act(async () => { renderInvoiceDetail(); });
        const signinEl = screen.getByTestId('signin-page');
        expect(signinEl.textContent).toContain('reason=expired');
    });

    it('does not render invoice content after expiration', async () => {
        await act(async () => { renderInvoiceDetail(); });
        expect(screen.queryByText('Invoice Details')).toBeNull();
        expect(screen.queryByText('Items')).toBeNull();
    });
});

describe('InvoiceDetail — no session', () => {
    it('redirects to /signin when sessionStorage has no session', async () => {
        await act(async () => { renderInvoiceDetail(); });
        expect(screen.getByTestId('signin-page')).toBeTruthy();
    });
});
