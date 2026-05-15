// @ts-nocheck
/**
 * CheckoutRoutesShell — Issue #119 (webhooks + App Routing)
 *
 * Problem: Checkout webhooks for `checkout.created` / `checkout.viewed` / `checkout.paid`
 * were only tied to page-level or DataContext actions. Navigating to the protected
 * checkout list or create screens did not emit a routing-level signal for integrators.
 *
 * Resolution: When the user enters `/checkout` or `/checkout/create`, dispatch
 * `checkout.route.entered` with a small payload (`screen`, `path`). Detail (`/checkout/:id`)
 * and public pay (`/pay/:id`) continue to use existing `checkout.viewed` / `checkout.paid`
 * flows so we do not double-fire analytics for the same session.
 */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { dispatchWebhook } from '../../services/webhook';

/** @returns {'list' | 'create' | null} */
function checkoutScreenFromPathname(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (last === 'checkout') return 'list';
  if (prev === 'checkout' && last === 'create') return 'create';
  return null;
}

export default function CheckoutRoutesShell() {
  const { pathname } = useLocation();

  useEffect(() => {
    const screen = checkoutScreenFromPathname(pathname);
    if (!screen) return;
    dispatchWebhook('checkout.route.entered', { screen, path: pathname });
  }, [pathname]);

  return <Outlet />;
}
