// @ts-nocheck
/**
 * @fileoverview Visual snapshot tests for App Routing components — Issue #141
 *
 * ISSUE: #141 — Lack of visual snapshot testing for the App Routing components.
 * ISSUE: #146 — Zero unit tests coverage found for the critical logic in App Routing.
 * Category: Testing / App Routing
 * Affected Area: App Routing (App.jsx route table, provider nesting, lazy loading)
 *
 * Ensures that the provider hierarchy (Theme > Auth > Data) and the route 
 * table in App.jsx remain consistent across refactors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ─── Shared Mocks ─────────────────────────────────────────────────────────────

// Mock providers to keep snapshots stable
vi.mock('../context/AuthContext', () => {
    const ActualReact = require('react');
    const AuthContext = ActualReact.createContext({ user: { isAuthenticated: false }, logout: () => {} });
    return {
        AuthProvider: ({ children }) => (
            <AuthContext.Provider value={{ user: { isAuthenticated: false }, logout: () => {} }}>
                {children}
            </AuthContext.Provider>
        ),
        useAuth: () => ActualReact.useContext(AuthContext),
        loadSession: () => null,
    };
});

vi.mock('../context/DataContext', () => ({
    DataProvider: ({ children }) => <div data-testid="data-provider">{children}</div>,
    useData: () => ({}),
}));

vi.mock('../context/ThemeContext', () => ({
    ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
    useTheme: () => ({ isDark: false, toggleTheme: () => {} }),
}));

// Mock routing components to capture the shell structure
vi.mock('../components/layout/Layout', () => ({
    default: ({ children }) => <div data-testid="layout-shell">Layout Shell {children}</div>,
}));

vi.mock('../components/routing/PrivateRoute', () => ({
    default: ({ children }) => {
        const { loadSession } = require('../context/AuthContext');
        if (!loadSession()) {
            return <div data-testid="signin-redirect-shell">Redirected to Sign In</div>;
        }
        return <div data-testid="private-shell">{children}</div>;
    },
}));

vi.mock('../components/ui/LoadingSpinner', () => ({
    default: () => <div data-testid="app-loading-spinner">Loading Tradazone...</div>,
}));

// Mock all lazy-loaded pages with a stable identifier
const mockPage = (name) => ({ default: () => <div data-testid={`${name.toLowerCase()}-page`}>{name} Page</div> });

vi.mock('../pages/auth/SignIn',              () => mockPage('SignIn'));
vi.mock('../pages/auth/SignUp',              () => mockPage('SignUp'));
vi.mock('../pages/dashboard/Home',          () => mockPage('Home'));
vi.mock('../pages/customers/CustomerList',  () => mockPage('CustomerList'));
vi.mock('../pages/customers/AddCustomer',   () => mockPage('AddCustomer'));
vi.mock('../pages/customers/CustomerDetail',() => mockPage('CustomerDetail'));
vi.mock('../pages/checkouts/CheckoutList',  () => mockPage('CheckoutList'));
vi.mock('../pages/checkouts/CreateCheckout',() => mockPage('CreateCheckout'));
vi.mock('../pages/checkouts/CheckoutDetail',() => mockPage('CheckoutDetail'));
vi.mock('../pages/checkouts/MailCheckout',  () => mockPage('MailCheckout'));
vi.mock('../pages/invoices/InvoiceList',    () => mockPage('InvoiceList'));
vi.mock('../pages/invoices/CreateInvoice',  () => mockPage('CreateInvoice'));
vi.mock('../pages/invoices/InvoiceDetail',  () => mockPage('InvoiceDetail'));
vi.mock('../pages/invoices/InvoicePreview', () => mockPage('InvoicePreview'));
vi.mock('../pages/items/ItemsList',         () => mockPage('ItemsList'));
vi.mock('../pages/items/AddItem',           () => mockPage('AddItem'));
vi.mock('../pages/items/ItemDetail',        () => mockPage('ItemDetail'));
vi.mock('../pages/settings/Settings',       () => mockPage('Settings'));
vi.mock('../pages/settings/ProfileSettings',() => mockPage('ProfileSettings'));
vi.mock('../pages/settings/PaymentSettings',() => mockPage('PaymentSettings'));
vi.mock('../pages/settings/NotificationSettings', () => mockPage('NotificationSettings'));
vi.mock('../pages/settings/PasswordSettings',     () => mockPage('PasswordSettings'));

// Mock BrowserRouter to use MemoryRouter's navigation instead
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        BrowserRouter: ({ children }) => <>{children}</>,
    };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('App Routing snapshots', () => {
    let App;

    beforeEach(async () => {
        vi.resetModules();
        ({ default: App } = await import('../App'));
    });

    it('matches snapshot for Public Route — /signin', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/Tradazone/signin']}>
                <App />
            </MemoryRouter>
        );
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for Public Route — /signup', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/Tradazone/signup']}>
                <App />
            </MemoryRouter>
        );
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for Protected Route — / (Unauthenticated Redirect)', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/Tradazone/']}>
                <App />
            </MemoryRouter>
        );
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for Protected Route — / (Authenticated)', async () => {
        // Mock authenticated session
        const { loadSession } = await import('../context/AuthContext');
        vi.mocked(loadSession).mockReturnValue({ token: 'mock-token' });

        const { container } = render(
            <MemoryRouter initialEntries={['/Tradazone/']}>
                <App />
            </MemoryRouter>
        );
        expect(container.firstChild).toMatchSnapshot();
    });

    it('renders protected nested /checkout route while authenticated', async () => {
        const { loadSession } = await import('../context/AuthContext');
        vi.mocked(loadSession).mockReturnValue({ token: 'mock-token' });

        render(
            <MemoryRouter initialEntries={['/Tradazone/checkout']}>
                <App />
            </MemoryRouter>
        );

        expect(screen.getByTestId('checkoutlist-page')).toBeTruthy();
    });

    it('matches snapshot for Public Route — /pay/:checkoutId (MailCheckout)', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/Tradazone/pay/CHK-123']}>
                <App />
            </MemoryRouter>
        );
        expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for Catch-all Route (Redirect to Sign In)', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/Tradazone/unknown-route']}>
                <App />
            </MemoryRouter>
        );
        expect(container.firstChild).toMatchSnapshot();
    });
});
