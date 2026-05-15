// @ts-nocheck
/**
 * App routing — React Router stack
 *
 * ADR-002: docs/adr/002-app-routing-stack.md (Issue #202)
 * - BrowserRouter + nested Routes; protected shell via PrivateRoute + Layout.
 *
 * PERFORMANCE: Route components are loaded via React.lazy() so the JS for 
 * each feature is fetched on-demand. Chart.js (used within the checkout flow) 
 * is further isolated in its own `charts` Rollup chunk.
 * See: src/components/ui/LazyChart.jsx and vite.config.js for details.
 *
 * Issue #38 — Missing accessible names on route loading surfaces (App Routing).
 * Issue #141 — Lack of visual snapshot testing for the App Routing components.
 * Issue #146 — Zero unit tests coverage found for the critical logic in App Routing.
 * Category: Testing / App Routing / UI/UX / accessibility
 * Affected: Suspense fallbacks while lazy chunks load (`/pay/:checkoutId`, checkout
 * routes) and the root Suspense fallback (`LoadingSpinner`).
 * Resolution: `role="status"`, `aria-live`, `aria-busy`, and explicit labels so
 * assistive tech users get parity with visual loading states. (Purely decorative
 * spinners use `aria-hidden`; informative images elsewhere use `alt` — see Logo,
 * auth illustrations.)
 *
 * ISSUE: #CSP-APP (No CSP headers defined for App Routing)
 * Category: Security & Compliance
 * Priority: Low
 * Affected Area: App Routing
 * Description: No Content Security Policy was enforced at the app-routing level,
 * leaving all routes unprotected against XSS and clickjacking on first paint and
 * during SPA navigation. Resolved by:
 *   1. Shipping the CSP baseline in `index.html` as a `<meta http-equiv>` tag so
 *      every route is protected from the very first byte served.
 *   2. Calling `ensureContentSecurityPolicyMeta()` (from `src/security/csp.js`) in
 *      `AuthProvider` on mount so the policy is re-asserted after any SPA navigation
 *      that might strip or replace the document head.
 * The shared policy constant `AUTH_CONTENT_SECURITY_POLICY` in `src/security/csp.js`
 * is the single source of truth for the CSP directive string used in both locations.
 * Tests: `src/test/AuthContext.csp.test.jsx`
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/routing/PrivateRoute';
import CheckoutRoutesShell from './components/routing/CheckoutRoutesShell';
import LoadingSpinner from './components/ui/LoadingSpinner';

const SignIn = lazy(() => import('./features/auth/pages/SignIn'));
const SignUp = lazy(() => import('./features/auth/pages/SignUp'));
const Home = lazy(() => import('./features/dashboard/pages/Home'));
const CustomerList = lazy(() => import('./features/customers/pages/CustomerList'));
const AddCustomer = lazy(() => import('./features/customers/pages/AddCustomer'));
const CustomerDetail = lazy(() => import('./features/customers/pages/CustomerDetail'));
const CheckoutList = lazy(() => import('./features/checkouts/pages/CheckoutList'));
const CreateCheckout = lazy(() => import('./features/checkouts/pages/CreateCheckout'));
const CheckoutDetail = lazy(() => import('./features/checkouts/pages/CheckoutDetail'));
const MailCheckout = lazy(() => import('./features/checkouts/pages/MailCheckout'));
const InvoiceList = lazy(() => import('./features/invoices/pages/InvoiceList'));
const CreateInvoice = lazy(() => import('./features/invoices/pages/CreateInvoice'));
const InvoiceDetail = lazy(() => import('./features/invoices/pages/InvoiceDetail'));
const InvoicePreview = lazy(() => import('./features/invoices/pages/InvoicePreview'));
const InvoicePayment  = lazy(() => import('./features/invoices/pages/InvoicePayment'));
const InvoiceCheckout = lazy(() => import('./features/invoices/pages/InvoiceCheckout'));
const ItemsList = lazy(() => import('./features/items/pages/ItemsList'));
const AddItem = lazy(() => import('./features/items/pages/AddItem'));
const ItemDetail = lazy(() => import('./features/items/pages/ItemDetail'));
const Settings = lazy(() => import('./features/settings/pages/Settings'));
const ProfileSettings = lazy(() => import('./features/settings/pages/ProfileSettings'));
const PaymentSettings = lazy(() => import('./features/settings/pages/PaymentSettings'));
const NotificationSettings = lazy(() => import('./features/settings/pages/NotificationSettings'));

import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';

 /**
 * Checkout webhooks — `src/services/webhook.js` (dispatchWebhook)
 *
 * Issue #119: Protected checkout list/create screens dispatch `checkout.route.entered`
 * from `CheckoutRoutesShell` when the user navigates to `/checkout` or `/checkout/create`.
 *
 * | Event                    | Where / trigger                                              |
 * |--------------------------|--------------------------------------------------------------|
 * | checkout.route.entered   | App Routing: CheckoutRoutesShell (list or create segment)   |
 * | checkout.created         | DataContext.addCheckout + CreateCheckout submit; payload    |
 * | checkout.viewed          | MailCheckout mount; DataContext.recordCheckoutView (detail)   |
 * | checkout.paid            | MailCheckout wallet connect; DataContext.markCheckoutPaid     |
 *
 * Endpoint: `VITE_WEBHOOK_URL` or Settings > Payments. See `webhook.js` for contract.
 */

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH ?? '/'}>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes — checkout payment page is lazy-loaded */}
            <Route
              path="/pay/:checkoutId"
              element={
                <Suspense
                  fallback={
                    <div
                      className="min-h-screen bg-brand"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                      aria-label="Loading checkout payment page"
                    />
                  }
                >
                  <MailCheckout />
                </Suspense>
              }
            />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/invoice/:id" element={<InvoicePreview />} />
            <Route
              path="/pay/invoice/:invoiceId"
              element={
                <Suspense
                  fallback={
                    <div
                      className="min-h-screen bg-brand"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                      aria-label="Loading payment page"
                    />
                  }
                >
                  <InvoiceCheckout />
                </Suspense>
              }
            />

            {/* Protected routes — require authentication */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/add" element={<AddCustomer />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoice />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="items" element={<ItemsList />} />
              <Route path="items/add" element={<AddItem />} />
              <Route path="items/:id" element={<ItemDetail />} />
              <Route
                element={
                  <Suspense
                    fallback={
                      <div
                        className="p-8 text-center text-sm text-gray-400"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        Loading…
                      </div>
                    }
                  >
                    <CheckoutRoutesShell />
                  </Suspense>
                }
              >
                <Route path="checkout" element={<CheckoutList />} />
                <Route path="checkout/create" element={<CreateCheckout />} />
                <Route path="checkout/:id" element={<CheckoutDetail />} />
              </Route>
              <Route path="settings" element={<Settings />}>
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="payments" element={<PaymentSettings />} />
                <Route path="notifications" element={<NotificationSettings />} />
                <Route path="password" element={<Navigate to="/settings/profile" replace />} />
              </Route>
            </Route>

            {/* Catch-all — redirect to signin */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
