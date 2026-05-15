// @ts-nocheck
/**
 * Issue #119 — Checkout webhooks when entering protected checkout routes (App Routing).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CheckoutRoutesShell from '../../../components/routing/CheckoutRoutesShell';

const dispatchWebhook = vi.fn();

vi.mock('../../../services/webhook', () => ({
  dispatchWebhook: (...args) => dispatchWebhook(...args),
}));

function Tree({ initialEntries }) {
  return (
    <MemoryRouter basename="/Tradazone" initialEntries={initialEntries}>
      <Routes>
        <Route element={<CheckoutRoutesShell />}>
          <Route path="checkout" element={<div data-testid="list">list</div>} />
          <Route path="checkout/create" element={<div data-testid="create">create</div>} />
          <Route path="checkout/:id" element={<div data-testid="detail">detail</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('CheckoutRoutesShell (Issue #119)', () => {
  beforeEach(() => {
    dispatchWebhook.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches checkout.route.entered for /checkout (list)', () => {
    render(<Tree initialEntries={['/Tradazone/checkout']} />);
    expect(dispatchWebhook).toHaveBeenCalledWith('checkout.route.entered', {
      screen: 'list',
      path: '/checkout',
    });
  });

  it('dispatches checkout.route.entered for /checkout/create', () => {
    render(<Tree initialEntries={['/Tradazone/checkout/create']} />);
    expect(dispatchWebhook).toHaveBeenCalledWith('checkout.route.entered', {
      screen: 'create',
      path: '/checkout/create',
    });
  });

  it('does not dispatch for /checkout/:id (detail uses checkout.viewed elsewhere)', () => {
    render(<Tree initialEntries={['/Tradazone/checkout/CHK-001']} />);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });
});
