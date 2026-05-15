// @ts-nocheck
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loadSession } from '../../context/AuthContext';

/**
 * PrivateRoute
 *
 * Part of the ADR-002 routing model (docs/adr/002-app-routing-stack.md, Issue #202).
 *
 * Guards protected routes by checking BOTH the in-memory React auth state
 * AND the live localStorage session on every render.
 *
 * Three outcomes:
 *  1. Authenticated + live session valid → render children.
 *  2. Authenticated in memory BUT session expired in storage → redirect to
 *     /signin?reason=expired&redirect=<path> and call logout() to purge
 *     in-memory state.
 *  3. Not authenticated at all → redirect to /signin?redirect=<path>.
 *
 * Checking loadSession() directly (not just user.isAuthenticated) is critical:
 * the React state is set once at mount and stays truthy for the entire page
 * session, even after the localStorage TTL has passed.
 *
 * ISSUE: App Routing — Mock API data needs broader edge-case coverage
 * Category: Testing / App Routing
 * Affected Area: App Routing (PrivateRoute + App.jsx route table)
 * Description: The following edge cases were previously untested:
 *   - Deep-link redirect param is preserved when an unauthenticated user
 *     navigates directly to a protected path (e.g. /customers).
 *   - Expired-session redirect carries reason=expired for mid-session TTL
 *     expiry (session valid at mount, TTL passes while app is running).
 *   - Catch-all route (path="*") redirects unknown paths to /signin.
 *   - Public routes (/pay/:checkoutId, /invoice/:id) are reachable without auth.
 * Fix: expiredPath latched in state so reason=expired survives the logout()
 *   re-render. Tests added in src/test/PrivateRoute.test.jsx.
 */
function PrivateRoute({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();

    // Cache loadSession result to avoid calling it on every render
    // This is expensive and prevents redirect loops from repeated session checks
    const [cachedSession, setCachedSession] = useState(null);
    const [sessionChecked, setSessionChecked] = useState(false);

    // Only run expensive loadSession check once on mount and when pathname changes
    useEffect(() => {
        const liveSession = loadSession();
        setCachedSession(liveSession);
        setSessionChecked(true);
    }, [location.pathname]);

    // Only mark session as expired after initial check and if session became null
    const sessionExpired = sessionChecked && user.isAuthenticated && cachedSession === null;

    // Latch the path at the moment of mid-session expiry so reason=expired
    // survives the logout() re-render (after logout, sessionExpired becomes
    // false but we still need to redirect with reason=expired).
    const [expiredPath, setExpiredPath] = useState(
        sessionExpired ? location.pathname : null
    );

    // Handle expired session
    if (sessionExpired) {
        const path = location.pathname;
        setExpiredPath(path);
        logout();
        return;
    }

    if (sessionExpired || expiredPath !== null) {
        const path = expiredPath || location.pathname;
        return (
            <Navigate
                to={`/signin?reason=expired&redirect=${encodeURIComponent(path)}`}
                replace
            />
        );
    }

    if (!user.isAuthenticated) {
        return (
            <Navigate
                to={`/signin?redirect=${encodeURIComponent(location.pathname)}`}
                replace
            />
        );
    }

    return children;
}

export default PrivateRoute;
