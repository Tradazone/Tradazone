// @ts-nocheck
/**
 * @fileoverview AuthContext — application-wide authentication and wallet state.
 * eslint-disable react-refresh/only-export-components
 *
 * ISSUE: #109 (Vulnerable session token storage in CI pipeline)
 * Category: Security & Compliance
 * Priority: Medium
 * Affected Area: AuthContext / CI Pipeline
 * Description: Session tokens were being stored in cleartext localStorage,
 * making them vulnerable to XSS and potential leakage in CI logs/artifacts.
 * Remediated by moving sensitive session data to sessionStorage while 
 * maintaining non-sensitive profile info in localStorage for user convenience.
 * Also fixed malformed CI workflow files containing merge conflict markers.
 *
 * ISSUE: #115 (Rich text descriptions in the auth/profile flow)
 * Category: Feature Enhancement
 * Priority: High
 * Affected Area: AuthContext
 * Description: The authenticated user model did not persist any description
 * field, and Profile Settings had no way to save a rich text business
 * description through the auth session. The fix keeps the editor UI out of
 * AuthContext to protect the context bundle budget, while persisting a
 * sanitized `profileDescription` string and exposing `updateProfile()` for
 * profile forms that depend on auth state.
 *
 * ISSUE: #171 (Build size limits for AuthContext)
 * Category: DevOps & Infrastructure
 * Affected Area: AuthContext
 * Description: Implement production build size limits and monitoring for AuthContext.
 * This context is large due to multi-wallet support; size limits and monitoring
 * are enforced in vite.config.js and CI to prevent bundle bloat.
 *
 * ISSUE #69: Excessive context API updates in SignIn caused unnecessary re-renders when the
 * full `user` object updated (e.g. profile fields) while `isAuthenticated` stayed the same.
 * Resolution: `AuthSessionContext` exposes only `user.isAuthenticated` (a boolean primitive).
 * React skips re-rendering consumers when the value is unchanged (`true === true`), so SignIn
 * can subscribe via {@link useAuthIsAuthenticated} instead of {@link useAuthUser} for
 * redirect/export logic. Initial profile seeding on SignIn uses {@link loadSession} to avoid
 * subscribing to the full user object for one-time draft hydration.
 *
 * ISSUE #71: Excessive context API updates in Auth module cause full application re-renders
 * Category: Performance & Scalability
 * Priority: Critical
 * Affected Area: Auth module
 * Description: Fixed excessive re-renders caused by multiple independent state updates
 * in completeWalletLogin(). Previously, separate setWallet(), setWalletType(), and
 * setUser() calls triggered 3 independent render cycles, causing the entire app to
 * re-render 3 times per wallet connection. Leveraged React 18's automatic batching
 * within the functional setState callback to ensure all updates occur in a single
 * render cycle. The authContextValue is already properly memoized with useMemo,
 * preventing unnecessary context propagation.
 *
 * ISSUE: Race condition detected in the AuthContext when submitting forms rapidly
 * Category: Bug/Edge Case
 * Priority: High
 * Affected Area: AuthContext
 * Description: Fixed race conditions that occurred when wallet connection functions
 * were called rapidly in succession. The following fixes were implemented:
 *
 * ## Race Condition Fixes Applied:
 *
 * 1. **Unified Connection Guard**: Replaced the EVM-only `isConnecting` boolean flag
 *    with a unified `connectingWalletType` state that tracks which wallet type is
 *    currently connecting. This prevents concurrent connection attempts across ALL
 *    wallet types (Stellar, Starknet, EVM).
 *
 * 2. **Connection Guards in All Wallet Functions**:
 *    - `connectStarknetWallet()`: Added guard to prevent concurrent Starknet connections
 *    - `connectStellarWallet()`: Added guard to prevent concurrent Stellar connections
 *    - `connectEvmWallet()`: Updated to use unified connection guard
 *    - All functions now return `{ success: false, error: "already_connecting" }` when
 *      a connection is already in progress
 *
 * 3. **Atomic State Updates in completeWalletLogin()**:
 *    - Implemented functional state updates using `setUser((currentUser) => {...})`
 *    - Added idempotency check: if the same address is already authenticated, returns
 *      early without re-executing state updates
 *    - Ensures wallet state, user state, and localStorage are updated atomically
 *
 * 4. **Proper Cleanup on Connection Completion**:
 *    - All wallet connection functions now properly reset `connectingWalletType` to
 *      `null` on both success and failure paths
 *    - Prevents the connection guard from getting stuck in a "connecting" state
 *
 * 5. **Backward Compatibility**:
 *    - Maintained `isConnecting` as a derived boolean flag for components that depend
 *      on it (e.g., ConnectWalletModal)
 *    - No breaking changes to the public API
 *
 * ## Testing:
 * Comprehensive race condition tests added to AuthContext.test.jsx covering:
 * - Concurrent completeWalletLogin calls
 * - Idempotency of completeWalletLogin for same address
 * - Concurrent login calls
 * - Rapid logout/login cycles
 * - State consistency verification
 *
 * Manages user identity, wallet connection, and session persistence for
 * Tradazone. Exposes a `connectWallet` function that is the primary entry
 * point used by {@link ConnectWalletModal}.
 *
 * ## Session storage
 * Sessions are persisted to `localStorage` under the key `tradazone_auth`
 * as a JSON envelope `{ user, expiresAt }`. Sessions expire after 7 days.
 * The last-connected wallet address is separately stored under `tradazone_last_wallet`
 * to power the "welcome back" hint on the sign-in page.
 *
 * ## Wallet types supported
 * | Type               | Network   | Connection method          |
 * |--------------------|-----------|----------------------------|
 * | `'stellar'`        | Stellar   | `connectStellarWallet()`   |
 * | `'starknet'`       | Starknet  | `connectStarknetWallet()`  |
 * | `'starknet_generic'` | Starknet | `connectStarknetWallet()`  |
 * | `'evm'`            | EVM       | `connectEvmWallet()`       |
 *
 * ## Dark mode / theming
 * Theme preference (dark/light mode) is intentionally **not** managed here.
 * It is a UI concern independent of authentication. See
 * `src/context/ThemeContext.jsx` and {@link useTheme} for theme state.
 *
 * ISSUE: #106 (Missing CSP baseline for AuthContext)
 * Category: Security & Compliance
 * Priority: Low
 * Affected Area: AuthContext
 * Description: Auth-related routes now enforce a centralized Content Security
 * Policy baseline through the shared app shell (`index.html`) and a runtime
 * meta sync helper so auth screens are protected even during SPA navigation.
 *
 * @module AuthContext
 */

/* eslint-disable react-refresh/only-export-components -- provider, hooks, and session helpers are intentionally co-exported */

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { STORAGE_PREFIX, SESSION_TTL_MS, ALLOW_MOCK_WALLET } from '../config/env';
import { useDiscoveredProviders } from '../utils/wallet-discovery';
import { normalizeRichTextHtml } from '../utils/richText';
import { ensureContentSecurityPolicyMeta } from '../security/csp';
import { supabase } from '../lib/supabase';

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : null;

const AuthContext = createContext(null);
const AuthUserContext = createContext(null);
/** @type {import('react').Context<boolean | null>} Boolean session flag only — avoids re-renders on unrelated user field updates (Issue #69). */
const AuthSessionContext = createContext(null);
const AuthActionsContext = createContext(null);
const AuthWalletStateContext = createContext(null);
const AuthWalletCatalogContext = createContext(null);

const isDevBypass = import.meta.env.DEV;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_KEY = `${STORAGE_PREFIX}_auth`;
const WALLET_KEY  = `${STORAGE_PREFIX}_last_wallet`;

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {'stellar' | 'starknet' | 'evm' | 'starknet_generic'} WalletType
 * Identifies which blockchain network/protocol a wallet uses.
 */

/**
 * @typedef {Object} UserData
 * Shape of the authenticated user record stored in state and localStorage.
 *
 * @property {string | null} id              - Wallet address used as the user ID.
 * @property {string}        name            - Merchant display name or abbreviated wallet address.
 * @property {string}        email           - Contact email persisted in the session.
 * @property {string | null} avatar          - Profile image URL or `null`.
 * @property {boolean}       isAuthenticated - `true` once a wallet is connected.
 * @property {string | null} walletAddress   - Full connected wallet address.
 * @property {WalletType | null} walletType  - Which network the wallet is on.
 * @property {string}        phone           - Business phone number.
 * @property {string}        company         - Merchant or company name.
 * @property {string}        address         - Business address.
 * @property {string}        profileDescription - Sanitized rich text business description.
 */

/**
 * @typedef {Object} WalletState
 * Runtime wallet state held in context.
 *
 * @property {string}  address     - Full wallet address (empty string if not connected).
 * @property {string}  balance     - String representation of the balance, e.g. `"0"`.
 * @property {'XLM' | 'STRK' | 'ETH'} currency - Native currency token of the network.
 * @property {boolean} isConnected - Whether a wallet is currently connected.
 * @property {string}  chainId     - Network identifier:
 *   - `"stellar"` for Stellar
 *   - `"SN_MAIN"` / `"0x534e5f4d41494e"` for Starknet mainnet
 *   - EIP-155 numeric chain ID string (e.g. `"1"`) for EVM
 *   - `""` when not connected or unknown
 */

/**
 * @typedef {Object} ConnectWalletResult
 * Shape returned by {@link AuthContextValue#connectWallet} and all
 * internal `connect*` functions.
 *
 * On success:
 * ```json
 * { "success": true }
 * ```
 *
 * On failure:
 * ```json
 * { "success": false, "error": "not_installed" }
 * ```
 *
 * @property {true}   [success] - Present when connection succeeded.
 * @property {false}  [success] - Present when connection failed (with `error`).
 * @property {string} [error]   - Error code on failure. Known values:
 *   - `"not_installed"`     — wallet extension not found
 *   - `"rejected"`          — user dismissed / denied the request
 *   - `"already_connecting"` — an EVM connection attempt is already in flight
 *   - `"failed"`            — generic / unexpected failure
 *   - `"Wallet not connected"` — Starknet enable returned no accounts
 */

/**
 * @typedef {Object} AuthContextValue
 * Shape of the value provided by {@link AuthProvider} and consumed via
 * {@link useAuth}.
 *
 * @property {UserData}   user        - Current authenticated user record.
 * @property {React.Dispatch<React.SetStateAction<UserData>>} setUser
 *   Direct state setter — use with care; prefer `login` / `logout` instead.
 *
 * @property {WalletState} wallet     - Current wallet connection state.
 * @property {React.Dispatch<React.SetStateAction<WalletState>>} setWallet
 *   Direct state setter — use with care.
 *
 * @property {WalletType | null} walletType - Which wallet type is connected.
 *
 * @property {(userData: UserData) => void} login
 *   Authenticates a user from non-wallet credentials (email/password, OAuth).
 *   Persists a session to localStorage.
 *
 * @property {(updates: Partial<UserData>) => void} updateProfile
 *   Persists profile fields, including the rich text business description,
 *   without mutating wallet connection state.
 *
 * @property {() => void} logout
 *   Clears session, resets user and wallet state to defaults.
 *
 * @property {(type?: WalletType, provider?: unknown) => Promise<ConnectWalletResult>} connectWallet
 *   Entry point for wallet connection. Dispatches to the appropriate internal
 *   handler based on `type`. Passed as `connectWalletFn` prop to
 *   {@link ConnectWalletModal}.
 *
 *   Parameters:
 *   - `type`     — defaults to `'starknet'`.
 *   - `provider` — optional EIP-6963 provider object for `'evm'` connections.
 *     When omitted, falls back to `window.ethereum`.
 *
 * @property {() => Promise<void>} disconnectWallet
 *   Disconnects the current wallet. For Starknet, calls `disconnect()` from
 *   `get-starknet`. For Stellar/EVM there is no programmatic disconnect —
 *   simply calls `logout()`.
 *
 * @property {(address: string, type: WalletType) => void} completeWalletLogin
 *   Called directly by {@link ConnectWalletModal} for the LOBSTR flow (which
 *   manages its own connection state via `useLobstr`). Accepts the resolved
 *   address and type, then updates wallet state, user state, and session.
 *
 *   Payload:
 *   - `address` — the connected wallet's public address
 *   - `type`    — the wallet type (`'stellar'`, etc.)
 *
 * @property {string | null} lastWallet
 *   The address from the most recent successful connection, read from
 *   localStorage. Used by `SignIn` to show a "welcome back" hint.
 *
 * @property {boolean} isConnecting
 *   `true` while an EVM connection (`connectEvmWallet`) is in progress.
 *   Shared with consumers to disable re-entrant connection attempts.
 */

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Loads a valid (non-expired) session from sessionStorage (sensitive).
 *
 * ISSUE #109: Split storage to prevent session token leakage in CI/XSS.
 *
 * Session structure in sessionStorage: { user: UserData, expiresAt: number }
 * localStorage is used separately for profile persistence (not merged here).
 *
 * @returns {UserData | null} The stored user data, or `null` if absent/expired.
 */
export function loadSession() {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return null;
    try {
        // 1. Check sensitive ephemeral session in sessionStorage
        const rawSession = sessionStorage.getItem(SESSION_KEY);
        if (!rawSession) {
            // No active session in sessionStorage
            if (isDevBypass) {
                return {
                    id: "0xDEV_BYPASS_ADDRESS",
                    name: "Developer (Bypass)",
                    email: "dev@example.com",
                    avatar: null,
                    isAuthenticated: true,
                    walletAddress: "0xDEV_BYPASS_ADDRESS",
                    walletType: "evm",
                    phone: "",
                    company: "",
                    address: "",
                    profileDescription: "",
                };
            }
            try {
                localStorage.removeItem(SESSION_KEY);
            } catch (e) {
                // Ignore cleanup errors
            }
            return null;
        }

        const session = JSON.parse(rawSession);
        
        // 2. Validate session structure
        if (!session.expiresAt) {
            console.warn('[Auth] Session missing expiresAt timestamp');
            sessionStorage.removeItem(SESSION_KEY);
            try {
                localStorage.removeItem(SESSION_KEY);
            } catch (e) {
                // Ignore cleanup errors
            }
            return null;
        }

        // 3. Check expiration
        if (Date.now() > session.expiresAt) {
            // Session has expired
            sessionStorage.removeItem(SESSION_KEY);
            try {
                localStorage.removeItem(SESSION_KEY);
            } catch (e) {
                // Ignore cleanup errors
            }
            return null;
        }

        // 4. Validate user object exists
        if (!session.user) {
            console.warn('[Auth] Session missing user object');
            sessionStorage.removeItem(SESSION_KEY);
            try {
                localStorage.removeItem(SESSION_KEY);
            } catch (e) {
                // Ignore cleanup errors
            }
            return null;
        }

        // Return user from sessionStorage (source of truth for active sessions)
        return normalizeUserData(session.user);
    } catch (error) {
        console.error('[Auth] Failed to load session:', error);
        // Clean up corrupted data
        try {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
        } catch (cleanupError) {
            console.error('[Auth] Failed to cleanup corrupted session:', cleanupError);
        }
        return null;
    }
}

/**
 * Persists a user session.
 * - Sensitive data (user object/tokens) goes to sessionStorage.
 * - Non-sensitive profile fields go to localStorage (backup only, not merged on load).
 *
 * @param {UserData} userData - The user data to persist.
 * @returns {void}
 */
export function saveSession(userData) {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    const normalizedUserData = normalizeUserData(userData);
    
    try {
        // 1. Ephemeral sensitive session to sessionStorage
        // This is the source of truth for active sessions
        const sessionPayload = {
            user: normalizedUserData,
            expiresAt: Date.now() + SESSION_TTL_MS,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));

        // 2. Persistent non-sensitive profile to localStorage
        // Strip sensitive fields like tokens that should only live in sessionStorage.
        // This is separate from sessionStorage to avoid merge complexity in loadSession.
        const { token, jwt, ...profile } = normalizedUserData;
        localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('[Auth] Failed to save session:', error);
        throw error; // Let caller handle storage quota exceeded, etc.
    }
}

/**
 * Removes the session from both sessionStorage and localStorage.
 * @returns {void}
 */
function clearSession() {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

/**
 * Default (unauthenticated) user object.
 * @type {UserData}
 */
const EMPTY_USER = {
    id: isDevBypass ? "0xDEV_BYPASS_ADDRESS" : null,
    name: isDevBypass ? "Developer (Bypass)" : "",
    email: isDevBypass ? "dev@example.com" : "",
    avatar: null,
    isAuthenticated: isDevBypass,
    walletAddress: isDevBypass ? "0xDEV_BYPASS_ADDRESS" : null,
    walletType: isDevBypass ? "evm" : null,
    phone: "",
    company: "",
    address: "",
    profileDescription: "",
};

function normalizeUserData(userData = {}) {
    /**
     * Business rule: auth/profile writes may be partial or stale (e.g. legacy
     * sessions, wallet-only payloads, or profile-only updates). We normalize to
     * the full UserData contract and sanitize rich text so every caller (login,
     * updateProfile, session restore, wallet-connect) persists a safe, stable
     * shape.
     */
    return {
        ...EMPTY_USER,
        ...userData,
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        company: userData.company || "",
        address: userData.address || "",
        profileDescription: normalizeRichTextHtml(userData.profileDescription || ""),
    };
}

const EMPTY_WALLET = {
    address: "",
    balance: "0",
    currency: "STRK",
    isConnected: false,
    chainId: "",
};

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

/**
 * AuthProvider
 *
 * Wraps the application (or a subtree) with authentication and wallet state.
 * Must be an ancestor of any component that calls {@link useAuth}.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
    /** @type {[UserData, React.Dispatch<React.SetStateAction<UserData>>]} */
    const [user, setUser] = useState({ ...EMPTY_USER });

    /**
     * Guards against concurrent wallet connection attempts across all wallet types.
     * Tracks which wallet type is currently connecting to prevent race conditions.
     * @type {[WalletType | null, React.Dispatch<React.SetStateAction<WalletType | null>>]}
     */
    const [connectingWalletType, setConnectingWalletType] = useState(null);

    /**
     * Legacy isConnecting flag for backward compatibility.
     * Derived from connectingWalletType state.
     * @type {boolean}
     */
    const isConnecting = connectingWalletType !== null;

    /**
     * Runtime wallet connection state.
     * @type {[WalletState, React.Dispatch<React.SetStateAction<WalletState>>]}
     */
    const [wallet, setWallet] = useState({ ...EMPTY_WALLET });

    /** @type {[WalletType | null, React.Dispatch<React.SetStateAction<WalletType | null>>]} */
    const [walletType, setWalletType] = useState(null);

    /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
    const [lastWallet, setLastWallet] = useState(null);

    useEffect(() => {
        // Prefer Supabase session; fall back to legacy sessionStorage
        supabase.auth.getSession().then(({ data: { session } }) => {
            const meta = session?.user?.user_metadata;
            if (meta?.wallet_address) {
                const walletType = meta.wallet_type || 'starknet';
                const addr       = meta.wallet_address;
                const currency   = walletType === 'stellar' ? 'XLM' : walletType === 'evm' ? 'ETH' : 'STRK';
                setUser(normalizeUserData({
                    id:             addr,
                    name:           meta.name  || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    email:          meta.email || '',
                    isAuthenticated: true,
                    walletAddress:  addr,
                    walletType,
                }));
                setWallet({ address: addr, isConnected: true, balance: '0', currency, chainId: '' });
                setWalletType(walletType);
            } else {
                // Legacy fallback
                const saved = loadSession();
                if (saved) {
                    setUser(saved);
                    setWallet({
                        ...EMPTY_WALLET,
                        address:     saved.walletAddress || '',
                        currency:    saved.walletType === 'stellar' ? 'XLM' : 'STRK',
                        isConnected: !!saved.walletAddress,
                        chainId:     saved.walletType === 'stellar' ? 'stellar' : '',
                    });
                    setWalletType(saved.walletType || null);
                }
            }
            const storedLastWallet = localStorage.getItem(WALLET_KEY);
            if (storedLastWallet) setLastWallet(storedLastWallet);
        });
    }, []);

    // ── Wallet Detection ─────────────────────────────────────────────────────

    const discoveredProviders = useDiscoveredProviders();

    /** @type {[InstalledWallets, React.Dispatch<React.SetStateAction<InstalledWallets>>]} */
    const [installed, setInstalled] = useState({
        lobstr: false,
        argent: false,
        metamask: false,
        phantom: false,
        base: false,
        discovered: [],
    });

    useEffect(() => {
        ensureContentSecurityPolicyMeta();
    }, []);

    useEffect(() => {
        /**
         * Re-evaluates installed providers using both EIP-6963 discovery and
         * legacy globals. Timed re-checks account for extensions that inject
         * asynchronously after initial app bootstrap.
         */
        const checkInstallations = () => {
            const eth = window.ethereum;

            const hasLobstr = typeof window !== 'undefined' && !!window.lobstr;
            const hasArgent = typeof window !== 'undefined' && !!(window.starknet_argentX || window.starknet?.argentX);

            const hasMetaMask = discoveredProviders.some(p => p.info.rdns === 'io.metamask') || !!(eth && eth.isMetaMask);
            const hasPhantom  = discoveredProviders.some(p => p.info.rdns === 'app.phantom')  || !!(window.phantom?.ethereum || (eth && eth.isPhantom));
            const hasBase     = discoveredProviders.some(p => p.info.rdns === 'com.coinbase.wallet') || !!window.coinbaseWalletExtension || !!(eth && eth.isCoinbaseWallet);

            setInstalled({
                lobstr: hasLobstr,
                argent: hasArgent,
                metamask: hasMetaMask,
                phantom: hasPhantom,
                base: hasBase,
                discovered: discoveredProviders,
            });
        };

        checkInstallations();
        const timer  = setTimeout(checkInstallations, 1000);
        const timer2 = setTimeout(checkInstallations, 2500);
        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, [discoveredProviders]);

    /**
     * Centralized provider configuration.
     * Calculated as a memoized value to prevent unnecessary re-renders.
     */
    const availableWallets = useMemo(() => {
        /**
         * Stable curated entries keep wallet ordering and labels predictable for
         * UI/tests; discovered EIP-6963 providers are appended to avoid duplicate
         * first-party entries (MetaMask/Phantom/Base) when both static and
         * discovered metadata exist.
         */
        const staticWallets = [
            { id: 'stellar', name: 'LOBSTR', network: 'stellar', networkName: 'Stellar Network', isRecommended: true, isInstalled: installed.lobstr },
            { id: 'starknet', name: 'Argent', network: 'starknet', networkName: 'Starknet Network', isInstalled: installed.argent },
            { id: 'metamask', name: 'MetaMask', network: 'evm', networkName: 'EVM Network', isInstalled: installed.metamask, rdns: 'io.metamask' },
            { id: 'phantom', name: 'Phantom', network: 'evm', networkName: 'Solana / EVM', isInstalled: installed.phantom, rdns: 'app.phantom' },
            { id: 'base', name: 'Base Account', network: 'evm', networkName: 'Smart Wallet / EVM', isInstalled: installed.base, rdns: 'com.coinbase.wallet' },
            { id: 'starknet_generic', name: 'Other Starknet Wallets', network: 'starknet', networkName: 'Braavos, etc.', isInstalled: false, isSecondary: true },
            { id: 'evm_generic', name: 'EVM / Browser Wallets', network: 'evm', networkName: 'Any injected Web3 provider', isInstalled: false, isSecondary: true }
        ];

        // Add discovered EIP-6963 providers
        const knownRdns = ['io.metamask', 'app.phantom', 'com.coinbase.wallet'];
        const discoveredWallets = discoveredProviders
            .filter(p => !knownRdns.includes(p.info.rdns))
            .map(p => ({
                id: `discovered_${p.info.uuid}`,
                name: p.info.name,
                network: 'evm',
                networkName: 'EVM Network',
                isInstalled: true,
                iconUri: p.info.icon,
                provider: p.provider
            }));

        return [...staticWallets, ...discoveredWallets];
    }, [installed, discoveredProviders]);

    // ── completeWalletLogin ──────────────────────────────────────────────────

    /**
     * Finalises a wallet login when the connection flow is managed externally
     * (e.g. by `useLobstr` in {@link ConnectWalletModal}).
     *
     * Updates wallet state, user state, and persists the session.
     *
     * RACE CONDITION FIX: Uses functional state updates to ensure atomic operations
     * and prevent concurrent calls from overwriting each other's state.
     *
     * ISSUE #71 FIX: Batched state updates to prevent multiple re-renders.
     * Previously, separate setWallet, setWalletType, and setUser calls triggered
     * 3 independent render cycles. Now all state is updated in a single batch,
     * reducing full-app re-renders from 3 to 1 per wallet connection.
     *
     * @param {string} address - Connected wallet address.
     * @param {WalletType} type - Wallet network type.
     * @returns {void}
     */
    const completeWalletLogin = useCallback((address, type) => {
        // Guard: prevent duplicate completion for the same address
        setUser((currentUser) => {
            if (currentUser.walletAddress === address && currentUser.isAuthenticated) {
                return currentUser; // Already completed, no-op
            }

            const currency = type === "stellar" ? "XLM" : "STRK";
            const chainId  = type === "stellar" ? "stellar" : "";

            /** @type {WalletState} */
            const walletState = { address, isConnected: true, chainId, balance: "0", currency };
            
            /** @type {UserData} */
            const userData = normalizeUserData({
                ...currentUser,
                id: address,
                name: currentUser.name || `${address.slice(0, 6)}...${address.slice(-4)}`,
                email: currentUser.email || "",
                avatar: currentUser.avatar || null,
                isAuthenticated: true,
                walletAddress: address,
                walletType: type,
            });

            // ISSUE #71 FIX: Batch all state updates together using React 18's automatic batching
            // This ensures only one render cycle instead of three separate ones
            setWallet(walletState);
            setWalletType(type);
            localStorage.setItem(WALLET_KEY, address);
            setLastWallet(address);
            saveSession(userData);

            // Authenticate with Supabase (non-blocking, fire-and-forget)
            authenticateWithSupabase(address, type).catch(() => {});

            return userData;
        });
    }, [authenticateWithSupabase]);

    // ── Standard auth ────────────────────────────────────────────────────────

    /**
     * Authenticates a user from non-wallet credentials.
     *
     * @param {UserData} userData - User data from external auth provider.
     * @returns {void}
     */
    const login = useCallback((userData) => {
        const authed = normalizeUserData({ ...userData, isAuthenticated: true });
        setUser(authed);
        saveSession(authed);
    }, []);

    /**
     * ISSUE #115: Profile settings need a persistent, sanitized rich text
     * description without moving editor implementation into AuthContext.
     *
     * @param {Partial<UserData>} updates - User profile updates to merge.
     * @returns {void}
     */
    const updateProfile = useCallback((updates) => {
        setUser((currentUser) => {
            const nextUser = normalizeUserData({
                ...currentUser,
                ...updates,
                isAuthenticated: currentUser.isAuthenticated,
            });

            if (nextUser.isAuthenticated) {
                saveSession(nextUser);
            }

            return nextUser;
        });
    }, []);

    /**
     * Authenticates the connected wallet with Supabase via the auth-wallet Edge Function.
     * - EVM wallets: full SIWE (personal_sign + ethers.verifyMessage on the server).
     * - Starknet / Stellar: address-claim auth (no signature — upgradeable later).
     * Non-blocking: failures are logged but do NOT interrupt the wallet connection flow.
     *
     * @param {string}   address     - Connected wallet address.
     * @param {string}   walletType  - 'evm' | 'starknet' | 'stellar'
     * @param {Function} [signFn]    - Async fn(message) → signature string (EVM only).
     */
    const authenticateWithSupabase = useCallback(async (address, walletType, signFn = null) => {
        if (!SUPABASE_FUNCTIONS_URL) return;
        try {
            // 1. Request a nonce
            const nonceRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-wallet`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ action: 'nonce', address, walletType }),
            });
            if (!nonceRes.ok) throw new Error('nonce request failed');
            const { nonce } = await nonceRes.json();

            // 2. Sign the challenge message (EVM only for now)
            const message   = `Sign this message to authenticate with Tradazone.\n\nWallet: ${address}\nNonce: ${nonce}`;
            let   signature = address; // default: address-claim for non-EVM
            if (walletType === 'evm' && typeof signFn === 'function') {
                signature = await signFn(message);
            }

            // 3. Verify and get a one-time token
            const verifyRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-wallet`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ action: 'verify', address, signature, walletType }),
            });
            if (!verifyRes.ok) {
                const body = await verifyRes.json().catch(() => ({}));
                throw new Error(body.error || 'verify failed');
            }
            const { access_token, refresh_token, error: verifyError } = await verifyRes.json();
            if (verifyError) throw new Error(verifyError);

            // 4. Activate the real Supabase session (auto-refresh works)
            const { error: sessionErr } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });
            if (sessionErr) throw sessionErr;

            if (import.meta.env.DEV) {
                console.log(`[Auth] Supabase session established for ${address.slice(0, 10)}…`);
            }
        } catch (err) {
            // Non-fatal — local session already set, data sync may be unavailable
            if (import.meta.env.DEV) {
                console.warn('[Auth] Supabase auth failed:', err?.message ?? err);
            }
        }
    }, []);

    /**
     * Clears session data and resets all state to unauthenticated defaults.
     * @returns {void}
     */
    const logout = useCallback(() => {
        clearSession();
        supabase.auth.signOut().catch(() => {}); // best-effort
        setUser({ ...EMPTY_USER });
        setWallet({ ...EMPTY_WALLET });
        setWalletType(null);
    }, []);

    // ── Starknet (Argent / Braavos) ──────────────────────────────────────────

    /**
     * Connects a Starknet wallet (Argent X, Braavos, or any `window.starknet`
     * provider).
     *
     * ### Detection order
     * 1. `window.starknet_argentX` — Argent X dedicated key
     * 2. `window.starknet`         — generic Starknet provider
     *
     * ### `enable()` call
     * Calls `starknetProvider.enable({ starknetVersion: "v4" })` and falls back
     * to `enable()` without arguments if the first call throws (version
     * negotiation fallback).
     *
     * ### Address extraction
     * Address may be at:
     * - `starknetProvider.selectedAddress`
     * - `starknetProvider.account.address`
     * - `enableResult[0]` (first element of accounts array)
     *
     * ### Dev fallback
     * If all real connection attempts fail for unexpected reasons, the function
     * falls back to a hardcoded mock address for local development. This is
     * intentional and should be removed before production deployment.
     *
     * RACE CONDITION FIX: Added connection guard to prevent concurrent attempts.
     *
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectStarknetWallet = useCallback(async () => {
        // Guard: prevent concurrent Starknet connection attempts
        if (connectingWalletType !== null) {
            return { success: false, error: "already_connecting" };
        }

        setConnectingWalletType("starknet");
        try {
            const starknetProvider = window.starknet_argentX || window.starknet;

            if (!starknetProvider) {
                throw new Error("No Starknet wallet extension found");
            }

            // Request account access; try v4 first then fall back
            const enableResult = await starknetProvider.enable({ starknetVersion: "v4" }).catch(() => {
                return starknetProvider.enable();
            });

            if (starknetProvider.isConnected || (enableResult && enableResult.length > 0)) {
                const addr =
                    starknetProvider.selectedAddress ||
                    (starknetProvider.account && starknetProvider.account.address) ||
                    enableResult[0];

                if (!addr) {
                    throw new Error("Could not retrieve Starknet address");
                }

                const chainIdInfo = starknetProvider.chainId || "SN_MAIN";

                /** @type {WalletState} */
                const walletState = { address: addr, isConnected: true, chainId: chainIdInfo, balance: "0", currency: "STRK" };
                setWallet(walletState);
                setWalletType("starknet");
                localStorage.setItem(WALLET_KEY, addr);

                /** @type {UserData} */
                const userData = {
                    id: addr,
                    name: starknetProvider.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    email: "",
                    avatar: null,
                    isAuthenticated: true,
                    walletAddress: addr,
                    walletType: "starknet",
                };
                setUser(userData);
                saveSession(userData);

                // Authenticate with Supabase (address-claim, non-blocking)
                authenticateWithSupabase(addr, 'starknet').catch(() => {});

                // Subscribe to account changes for the session lifetime
                if (starknetProvider.on) {
                    starknetProvider.on("accountsChanged", (accounts) => {
                        if (!accounts || accounts.length === 0) {
                            logout();
                        } else {
                            const newAddress = accounts[0];
                            setWallet((prev) => ({ ...prev, address: newAddress }));
                            setUser((prev) => {
                                const updated = normalizeUserData({ ...prev, walletAddress: newAddress, id: newAddress });
                                saveSession(updated);
                                return updated;
                            });
                            localStorage.setItem(WALLET_KEY, newAddress);
                            setLastWallet(newAddress);
                        }
                    });
                }

                setConnectingWalletType(null);
                return { success: true };
            }

            setConnectingWalletType(null);
            return { success: false, error: "Wallet not connected" };
        } catch (error) {
            console.error("Starknet native connect failed:", error);

            if (error.message?.includes("No Starknet wallet") || error.message?.includes("not found")) {
                setConnectingWalletType(null);
                return { success: false, error: "not_installed" };
            }

            if (error.message?.includes("User rejected") || error.message?.includes("declined")) {
                setConnectingWalletType(null);
                return { success: false, error: "rejected" };
            }

            // ── Dev / demo fallback ─────────────────────────────────────────────
            // Mock wallet fallback — only permitted outside production
            if (!ALLOW_MOCK_WALLET) {
                setConnectingWalletType(null);
                return { success: false, error: 'not_installed' };
            }
            const mockAddr = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
            /** @type {WalletState} */
            const walletState = { address: mockAddr, isConnected: true, chainId: "SN_MAIN", balance: "0", currency: "STRK" };
            setWallet(walletState);
            setWalletType("starknet");
            localStorage.setItem(WALLET_KEY, mockAddr);

            /** @type {UserData} */
            const userData = {
                id: mockAddr,
                name: "Wallet User",
                email: "",
                avatar: null,
                isAuthenticated: true,
                walletAddress: mockAddr,
                walletType: "starknet",
            };
            setUser(userData);
            saveSession(userData);
            authenticateWithSupabase(mockAddr, 'starknet').catch(() => {});
            setConnectingWalletType(null);
            return { success: true };
        }
    }, [connectingWalletType, logout, authenticateWithSupabase]);

    // ── Stellar (LOBSTR via AuthContext — alternative path) ─────────────────

    /**
     * Connects a Stellar wallet via the LOBSTR Signer Extension API.
     *
     * > **Note:** {@link ConnectWalletModal} uses `useLobstr().connect()` and
     * > then calls `completeWalletLogin()` directly, bypassing this function.
     * > `connectStellarWallet` is therefore an alternative/fallback path
     * > (e.g. for use outside the modal).
     *
     * ### Public-key normalisation
     * The LOBSTR `getPublicKey()` API may return:
     * - A plain G‑address string
     * - `{ publicKey: "G..." }`
     * - `{ error: "LOCKED" | ... }`
     *
     * RACE CONDITION FIX: Added connection guard to prevent concurrent attempts.
     *
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectStellarWallet = useCallback(async () => {
        // Guard: prevent concurrent Stellar connection attempts
        if (connectingWalletType !== null) {
            return { success: false, error: "already_connecting" };
        }

        setConnectingWalletType("stellar");
        try {
            const lobstr = await import("@lobstrco/signer-extension-api");

            // Check extension presence (soft check; getPublicKey prompts anyway)
            await lobstr.isConnected();

            const pkResult = await lobstr.getPublicKey();

            let addr = "";
            if (typeof pkResult === "string" && pkResult.startsWith("G")) {
                addr = pkResult;
            } else if (pkResult && pkResult.publicKey) {
                addr = pkResult.publicKey;
            } else if (pkResult && pkResult.error) {
                throw new Error(pkResult.error);
            } else {
                throw new Error("Could not retrieve public key from LOBSTR");
            }

            /** @type {WalletState} */
            const walletState = { address: addr, isConnected: true, chainId: "stellar", balance: "0", currency: "XLM" };
            setWallet(walletState);
            setWalletType("stellar");
            localStorage.setItem(WALLET_KEY, addr);

            /** @type {UserData} */
            const userData = {
                id: addr,
                name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                email: "",
                avatar: null,
                isAuthenticated: true,
                walletAddress: addr,
                walletType: "stellar",
            };
            setUser(userData);
            saveSession(userData);

            // Authenticate with Supabase (address-claim, non-blocking)
            authenticateWithSupabase(addr, 'stellar').catch(() => {});

            setConnectingWalletType(null);
            return { success: true };
        } catch (error) {
            console.error("Stellar wallet connect failed:", error);

            setConnectingWalletType(null);

            if (error.message?.includes("not installed") || error.message?.includes("LOBSTR")) {
                return { success: false, error: "not_installed" };
            }

            if (error.message?.includes("User declined") ||
                error.message?.includes("rejected") ||
                error.message?.includes("cancelled")) {
                return { success: false, error: "rejected" };
            }

            return { success: false, error: "failed", message: error.message };
        }
    }, [connectingWalletType]);

    // ── EVM / Browser Wallets ────────────────────────────────────────────────

    /**
     * Connects an EVM wallet using `eth_requestAccounts` (EIP-1102).
     *
     * ### Provider resolution
     * - If `specificProvider` is supplied (from EIP-6963 discovery), uses it.
     * - Otherwise falls back to `window.ethereum` (legacy injection).
     *
     * ### Request payload sent to the wallet
     * ```js
     * provider.send('eth_requestAccounts', [])
     * // Returns: string[] — array of hex-encoded EVM addresses
     * ```
     *
     * ### Account-change subscription
     * After connection, subscribes to `accountsChanged` events on the provider.
     * If all accounts are removed (user disconnects in the extension), `logout()`
     * is called automatically.
     *
     * RACE CONDITION FIX: Updated to use unified connection guard.
     *
     * @param {import('ethers').Eip1193Provider | null} [specificProvider=null]
     *   Optional EIP-6963 provider. When `null`, falls back to `window.ethereum`.
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectEvmWallet = useCallback(async (specificProvider = null) => {
        // Guard: prevent double-invocation (returned to caller as an error code)
        if (connectingWalletType !== null) return { success: false, error: "already_connecting" };

        setConnectingWalletType("evm");
        try {
            const injectedProvider = specificProvider || window.ethereum;

            if (!injectedProvider) {
                throw new Error("EVM Wallet not installed");
            }

            const { BrowserProvider } = await import("ethers");
            const provider = new BrowserProvider(injectedProvider);

            // EIP-1102: request account access — prompts user in extension
            const accounts = await provider.send("eth_requestAccounts", []);
            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts returned");
            }

            const addr    = accounts[0];
            const network = await provider.getNetwork();

            /** @type {WalletState} */
            const walletState = {
                address: addr,
                isConnected: true,
                chainId: network.chainId.toString(),
                balance: "0",
                currency: "ETH",
            };
            setWallet(walletState);
            setWalletType("evm");
            localStorage.setItem(WALLET_KEY, addr);

            /** @type {UserData} */
            const userData = {
                id: addr,
                name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                email: "",
                avatar: null,
                isAuthenticated: true,
                walletAddress: addr,
                walletType: "evm",
            };
            setUser(userData);
            saveSession(userData);

            // SIWE: sign a challenge message, verify server-side, issue Supabase session.
            // Awaited so the sign prompt appears before the modal closes.
            await authenticateWithSupabase(addr, 'evm', async (message) => {
                return injectedProvider.request({ method: 'personal_sign', params: [message, addr] });
            });

            // Subscribe to account changes for the session lifetime
            if (injectedProvider.on) {
                injectedProvider.on("accountsChanged", (newAccounts) => {
                    if (newAccounts.length === 0) {
                        logout();
                    } else {
                        const newAddress = newAccounts[0];
                        setWallet((prev) => ({ ...prev, address: newAddress }));
                        setUser((prev) => {
                            const updated = normalizeUserData({ ...prev, walletAddress: newAddress, id: newAddress });
                            saveSession(updated);
                            return updated;
                        });
                        localStorage.setItem(WALLET_KEY, newAddress);
                        setLastWallet(newAddress);
                    }
                });
            }

            setConnectingWalletType(null);
            return { success: true };
        } catch (error) {
            console.error("EVM wallet connect failed:", error);
            setConnectingWalletType(null);

            if (error.message?.includes("not installed") || error.message?.includes("EVM")) {
                return { success: false, error: "not_installed" };
            }

            // EIP-1193 user-rejection error code
            if (error.code === 4001 || error.message?.includes("rejected")) {
                return { success: false, error: "rejected" };
            }
            return { success: false, error: "failed" };
        }
    }, [connectingWalletType, logout]);

    // ── Public: connectWallet ────────────────────────────────────────────────

    /**
     * Public wallet connection entry point. Used as the `connectWalletFn` prop
     * on {@link ConnectWalletModal} and as `connectWallet` from `useAuth()`.
     *
     * Dispatches to the appropriate internal handler based on `type`.
     *
     * | `type`               | Internal function           |
     * |----------------------|-----------------------------|
     * | `'stellar'`          | `connectStellarWallet()`    |
     * | `'evm'`              | `connectEvmWallet(provider)`|
     * | `'starknet_generic'` | `connectStarknetWallet()`   |
     * | `'starknet'`         | `connectStarknetWallet()`   |
     * | _(default)_          | `connectStarknetWallet()`   |
     *
     * @param {WalletType} [type='starknet'] - Wallet protocol to connect.
     * @param {import('ethers').Eip1193Provider | null} [provider=null]
     *   Optional EIP-6963 provider object. Only used when `type === 'evm'`.
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectWallet = useCallback(async (type = "starknet", provider = null) => {
        if (type === "stellar")          return connectStellarWallet();
        if (type === "evm")              return connectEvmWallet(provider);
        if (type === "starknet_generic") return connectStarknetWallet();
        return connectStarknetWallet();
    }, [connectEvmWallet, connectStarknetWallet, connectStellarWallet]);

    // ── disconnectWallet ─────────────────────────────────────────────────────

    /**
     * Disconnects the current wallet and clears the session.
     *
     * For Starknet, attempts a programmatic disconnect via `get-starknet`.
     * For Stellar and EVM wallets there is no programmatic disconnect in the
     * respective extension APIs — the function simply calls `logout()` to
     * clear local state.
     *
     * @returns {Promise<void>}
     */
    const disconnectWallet = useCallback(async () => {
        if (walletType === "starknet") {
            try {
                const { disconnect } = await import("get-starknet");
                await disconnect();
            } catch {
                // Swallow: disconnect is best-effort; always clear local state
            }

        }
        logout();
    }, [logout, walletType]);

    // ── disconnectAll ────────────────────────────────────────────────────────

    /**
     * Bulk-disconnects all wallet sessions.
     *
     * Clears every wallet-related key from localStorage and resets all auth
     * and wallet state to unauthenticated defaults. For Starknet, a
     * programmatic disconnect is attempted before clearing local state.
     *
     * Intended for use by {@link ConnectWalletModal} to let users remove all
     * connected wallets in a single action.
     *
     * @returns {Promise<void>}
     */
    const disconnectAll = useCallback(async () => {
        if (walletType === "starknet") {
            try {
                const { disconnect } = await import("get-starknet");
                await disconnect();
            } catch {
                // best-effort
            }
        }
        localStorage.removeItem(WALLET_KEY);
    setLastWallet(null);
        logout();
    }, [logout, walletType]);

    const authActionsValue = useMemo(() => ({
        setUser,
        setWallet,
        login,
        updateProfile,
        logout,
        connectWallet,
        disconnectWallet,
        disconnectAll,
        completeWalletLogin,
    }), [
        login,
        updateProfile,
        logout,
        connectWallet,
        disconnectWallet,
        disconnectAll,
        completeWalletLogin,
    ]);

    const authWalletStateValue = useMemo(() => ({
        wallet,
        walletType,
        lastWallet,
        isConnecting,
    }), [
        wallet,
        walletType,
        lastWallet,
        isConnecting,
    ]);

    const authWalletCatalogValue = useMemo(() => ({
        installed,
        availableWallets,
    }), [
        installed,
        availableWallets,
    ]);

    const authContextValue = useMemo(() => ({
        user,
        ...authActionsValue,
        ...authWalletStateValue,
        ...authWalletCatalogValue,
    }), [
        user,
        authActionsValue,
        authWalletStateValue,
        authWalletCatalogValue,
    ]);

    // ── Context value ────────────────────────────────────────────────────────

    return (
        <AuthContext.Provider value={authContextValue}>
            <AuthUserContext.Provider value={user}>
                <AuthSessionContext.Provider value={user.isAuthenticated}>
                    <AuthActionsContext.Provider value={authActionsValue}>
                        <AuthWalletStateContext.Provider value={authWalletStateValue}>
                            <AuthWalletCatalogContext.Provider value={authWalletCatalogValue}>
                                {children}
                            </AuthWalletCatalogContext.Provider>
                        </AuthWalletStateContext.Provider>
                    </AuthActionsContext.Provider>
                </AuthSessionContext.Provider>
            </AuthUserContext.Provider>
        </AuthContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * useAuth
 *
 * Returns the {@link AuthContextValue} from the nearest `AuthProvider`.
 * Throws if called outside of an `AuthProvider` tree.
 *
 * @returns {AuthContextValue}
 * @throws {Error} If called outside an `AuthProvider`.
 *
 * @example
 * const { connectWallet, user, wallet } = useAuth();
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}

/**
 * Returns only the authenticated user snapshot.
 *
 * ISSUE: #76
 * ProfileSettings only needs identity fields to seed its local form state.
 * Keeping that page subscribed to the full auth context caused it to re-render
 * for unrelated wallet-discovery and connection updates. This narrow hook
 * isolates user-only consumers from those broader context churns.
 *
 * @returns {UserData}
 * @throws {Error} If called outside an AuthProvider.
 */
export function useAuthUser() {
    const context = useContext(AuthUserContext);
    if (context === null) throw new Error("useAuthUser must be used within an AuthProvider");
    return context;
}

/**
 * Returns whether the user is authenticated — **boolean only** (Issue #69).
 *
 * Unlike {@link useAuthUser}, this does not subscribe to the full user object. When
 * `isAuthenticated` is unchanged, context consumers do not re-render (primitive `true`/`false`
 * identity), which keeps public routes like SignIn from re-rendering on profile-only updates.
 *
 * @returns {boolean}
 * @throws {Error} If called outside an AuthProvider.
 */
export function useAuthIsAuthenticated() {
    const context = useContext(AuthSessionContext);
    if (context === null) throw new Error("useAuthIsAuthenticated must be used within an AuthProvider");
    return context;
}

/**
 * Returns auth commands without subscribing to user, wallet, or wallet catalog
 * updates.
 *
 * ISSUE: #57
 * SignUp only needs stable connect/disconnect commands. Pulling them from the
 * monolithic auth context caused unrelated discovery updates to re-render the
 * route tree and modal. This selector-style hook isolates command-only
 * consumers from that churn.
 *
 * @returns {Pick<AuthContextValue, 'setUser' | 'setWallet' | 'login' | 'updateProfile' | 'logout' | 'connectWallet' | 'disconnectWallet' | 'disconnectAll' | 'completeWalletLogin'>}
 * @throws {Error} If called outside an AuthProvider.
 */
export function useAuthActions() {
    const context = useContext(AuthActionsContext);
    if (context === null) throw new Error("useAuthActions must be used within an AuthProvider");
    return context;
}

/**
 * Returns the live wallet session snapshot without subscribing to discovery
 * catalog updates.
 *
 * @returns {Pick<AuthContextValue, 'wallet' | 'walletType' | 'lastWallet' | 'isConnecting'>}
 * @throws {Error} If called outside an AuthProvider.
 */
export function useAuthWalletState() {
    const context = useContext(AuthWalletStateContext);
    if (context === null) throw new Error("useAuthWalletState must be used within an AuthProvider");
    return context;
}

/**
 * Returns the installed/discovered wallet catalog without subscribing to auth
 * identity or wallet session mutations.
 *
 * @returns {Pick<AuthContextValue, 'installed' | 'availableWallets'>}
 * @throws {Error} If called outside an AuthProvider.
 */
export function useAuthWalletCatalog() {
    const context = useContext(AuthWalletCatalogContext);
    if (context === null) throw new Error("useAuthWalletCatalog must be used within an AuthProvider");
    return context;
}
