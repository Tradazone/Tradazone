// @ts-nocheck
/**
 * @fileoverview Integration tests for AuthContext mutations in App Routing — Issue #148
 *
 * ISSUE: #148 — Introduce integration tests for the Context mutations in App Routing.
 * Category: Testing & QA
 * Priority: High
 * Affected Area: App Routing
 *
 * These tests drive real AuthContext mutations against the routing guard to
 * verify that login, wallet login, profile mutation, and logout continue to
 * produce the expected protected-route behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuthActions, useAuthUser } from '../context/AuthContext';
import PrivateRoute from '../components/routing/PrivateRoute';

function RoutingMutationToolbar() {
  const navigate = useNavigate();
  const actions = useAuthActions();
  const user = useAuthUser();

  return (
    <div>
      <button onClick={() => navigate('/customers')}>Go Customers</button>
      <button onClick={() => actions.login({ id: '1', name: 'Trader', email: 'trader@example.com' })}>
        Login
      </button>
      <button onClick={() => actions.completeWalletLogin('0xabc123', 'starknet')}>
        Wallet Login
      </button>
      <button onClick={() => actions.updateProfile({ company: 'Tradazone Labs' })}>
        Update Profile
      </button>
      <button onClick={() => actions.logout()}>
        Logout
      </button>
      <div data-testid="auth-company">{user.company || 'no-company'}</div>
    </div>
  );
}

function ProtectedPage() {
  return <div data-testid="protected-page">protected customers page</div>;
}

function SignInPage() {
  const location = useLocation();
  return <div data-testid="signin-page">{location.search}</div>;
}

function renderHarness(initialEntries = ['/signin']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <RoutingMutationToolbar />
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route
            path="/customers"
            element={
              <PrivateRoute>
                <ProtectedPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('App Routing context mutations (Issue #148)', () => {
  it('redirects unauthenticated users away from protected routes', () => {
    renderHarness(['/customers']);

    expect(screen.getByTestId('signin-page').textContent).toContain('redirect=%2Fcustomers');
    expect(screen.queryByTestId('protected-page')).toBeNull();
  });

  it('allows authenticated navigation to protected routes after login', () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go Customers' }));

    expect(screen.getByTestId('protected-page')).toBeTruthy();
    expect(screen.queryByTestId('signin-page')).toBeNull();
  });

  it('keeps the protected route mounted through profile-only mutations after wallet login', () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Wallet Login' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go Customers' }));

    expect(screen.getByTestId('protected-page')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Update Profile' }));

    expect(screen.getByTestId('protected-page')).toBeTruthy();
    expect(screen.getByTestId('auth-company').textContent).toBe('Tradazone Labs');
  });

  it('redirects back to signin when logout mutates auth state on a protected route', () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go Customers' }));
    expect(screen.getByTestId('protected-page')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByTestId('signin-page').textContent).toContain('redirect=%2Fcustomers');
    expect(screen.queryByTestId('protected-page')).toBeNull();
  });
});
