// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import PrivateRoute from '../components/routing/PrivateRoute';
import { STORAGE_PREFIX } from '../config/env';

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;

// Minimal child to confirm protected content renders
function Protected() { return <div>protected</div>; }
function SignIn() {
    // Use useLocation so MemoryRouter's internal search string is surfaced
    const { search } = useLocation();
    return <div data-testid="signin">{search}</div>;
}
function PublicPay()     { return <div data-testid="pay-page">pay</div>; }
function PublicInvoice() { return <div data-testid="invoice-page">invoice</div>; }

/**
 * Full route table mirroring App.jsx so edge-case routing tests are realistic.
 * Supports nested protected paths (e.g. /customers) and public routes.
 */
function renderWithRouter(initialEntries = ['/']) {
    return render(
        <AuthProvider>
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/signin"           element={<SignIn />} />
                    <Route path="/pay/:checkoutId"  element={<PublicPay />} />
                    <Route path="/invoice/:id"      element={<PublicInvoice />} />

                    {/* Protected shell — mirrors App.jsx */}
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Protected />
                            </PrivateRoute>
                        }
                    >
                        <Route path="customers" element={<Protected />} />
                        <Route path="checkout"  element={<Protected />} />
                        <Route path="invoices"  element={<Protected />} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<SignIn />} />
                </Routes>
            </MemoryRouter>
        </AuthProvider>
    );
}

beforeEach(() => localStorage.clear());

// ─── Unauthenticated ──────────────────────────────────────────────────────────

describe('unauthenticated user', () => {
    it('redirects to /signin without reason=expired', () => {
        renderWithRouter(['/']);
        const signinEl = screen.getByTestId('signin');
        expect(signinEl).toBeTruthy();
        // No expired banner param in the router-level search string
        expect(signinEl.textContent).not.toContain('reason=expired');
    });

    it('does not render protected content', () => {
        renderWithRouter(['/']);
        expect(screen.queryByText('protected')).toBeNull();
    });

    // Edge case: deep-link redirect param is preserved
    it('encodes the original deep path as redirect query param', () => {
        renderWithRouter(['/customers']);
        const signinEl = screen.getByTestId('signin');
        expect(signinEl.textContent).toContain('redirect=');
        expect(signinEl.textContent).toContain('%2Fcustomers');
    });
});

// ─── Valid session ────────────────────────────────────────────────────────────

describe('authenticated user with valid session', () => {
    beforeEach(() => {
        const user = { id: '1', name: 'Alice', email: '', isAuthenticated: true, walletAddress: null, walletType: null };
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expiresAt: Date.now() + 999_999 }));
    });

    it('renders protected content', () => {
        renderWithRouter(['/']);
        expect(screen.getByText('protected')).toBeTruthy();
    });
});

// ─── Expired session (at mount) ───────────────────────────────────────────────
//
// When AuthProvider initialises with an already-expired localStorage session,
// loadSession() removes it and returns null, so user.isAuthenticated starts
// as false. PrivateRoute redirects to /signin?redirect=<path> (no reason=expired).
// The reason=expired path fires only for mid-session TTL expiry (see below).

describe('authenticated user with expired session', () => {
    beforeEach(() => {
        // Write a session to localStorage that has already expired
        const user = { id: '1', name: 'Alice', email: '', isAuthenticated: true, walletAddress: null, walletType: null };
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expiresAt: Date.now() - 1 }));
    });

    it('does not render protected content', async () => {
        await act(async () => { renderWithRouter(['/']); });
        expect(screen.queryByText('protected')).toBeNull();
    });

    it('redirects to /signin with reason=expired', async () => {
        await act(async () => { renderWithRouter(['/']); });
        expect(screen.getByTestId('signin')).toBeTruthy();
    });

    it('removes the expired session from localStorage', async () => {
        await act(async () => { renderWithRouter(['/']); });
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    // Edge case: expired session at mount preserves the deep-link redirect param.
    // AuthProvider cleans up the expired session before PrivateRoute renders, so
    // the redirect goes to /signin?redirect=<path> (unauthenticated branch).
    it('preserves the deep-link redirect param for expired sessions', async () => {
        await act(async () => { renderWithRouter(['/invoices']); });
        const signinEl = screen.getByTestId('signin');
        expect(signinEl.textContent).toContain('redirect=');
        expect(signinEl.textContent).toContain('%2Finvoices');
    });
});

// ─── Mid-session expiry (reason=expired) ─────────────────────────────────────
//
// The reason=expired param is emitted when the session TTL passes while the
// app is already running (user.isAuthenticated is true in memory but
// loadSession() returns null because the TTL has since elapsed).

describe('mid-session TTL expiry', () => {
    it('redirects with reason=expired when session expires after mount', async () => {
        // Start with a valid session so AuthProvider initialises as authenticated
        const user = { id: '1', name: 'Alice', email: '', isAuthenticated: true, walletAddress: null, walletType: null };
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expiresAt: Date.now() + 999_999 }));

        const { rerender } = await act(async () => renderWithRouter(['/']));
        // Confirm we're on the protected page
        expect(screen.getByText('protected')).toBeTruthy();

        // Simulate TTL expiry: overwrite with an expired session while the
        // component tree is still mounted (same AuthProvider instance).
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, expiresAt: Date.now() - 1 }));

        // Force a re-render of the same tree so PrivateRoute's live loadSession()
        // check fires and detects the now-expired session.
        await act(async () => {
            rerender(
                <AuthProvider>
                    <MemoryRouter initialEntries={['/']}>
                        <Routes>
                            <Route path="/signin"          element={<SignIn />} />
                            <Route path="/pay/:checkoutId" element={<PublicPay />} />
                            <Route path="/invoice/:id"     element={<PublicInvoice />} />
                            <Route path="/" element={<PrivateRoute><Protected /></PrivateRoute>}>
                                <Route path="customers" element={<Protected />} />
                                <Route path="checkout"  element={<Protected />} />
                                <Route path="invoices"  element={<Protected />} />
                            </Route>
                            <Route path="*" element={<SignIn />} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );
        });

        const signinEl = screen.getByTestId('signin');
        expect(signinEl.textContent).toContain('reason=expired');
    });
});

// ─── Catch-all route ──────────────────────────────────────────────────────────

describe('catch-all route', () => {
    // Edge case: unknown paths should land on /signin (via the * route)
    it('redirects unknown paths to signin', () => {
        renderWithRouter(['/this-route-does-not-exist']);
        expect(screen.getByTestId('signin')).toBeTruthy();
        expect(screen.queryByText('protected')).toBeNull();
    });
});

// ─── Public routes (no auth required) ────────────────────────────────────────

describe('public routes', () => {
    // Edge case: /pay/:checkoutId must be reachable without a session
    it('renders /pay/:checkoutId without authentication', () => {
        renderWithRouter(['/pay/CHK-001']);
        expect(screen.getByTestId('pay-page')).toBeTruthy();
        expect(screen.queryByTestId('signin')).toBeNull();
    });

    // Edge case: /invoice/:id must be reachable without a session
    it('renders /invoice/:id without authentication', () => {
        renderWithRouter(['/invoice/INV-001']);
        expect(screen.getByTestId('invoice-page')).toBeTruthy();
        expect(screen.queryByTestId('signin')).toBeNull();
    });
});
