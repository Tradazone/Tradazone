// @ts-nocheck
/**
 * @fileoverview wallet-discovery — EIP-6963 Multi Injected Provider Discovery.
 *
 * EIP-6963 is the standard that replaces the legacy `window.ethereum` pattern.
 * Instead of every wallet overwriting the same global, each extension fires a
 * `eip6963:announceProvider` CustomEvent on `window`, carrying its own
 * provider object and metadata. This module listens for those events and
 * exposes the discovered providers to the rest of the application.
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-6963} EIP-6963 specification
 * @module wallet-discovery
 */

import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EIP6963ProviderInfo
 * Metadata about a discovered EVM wallet provider, as defined by EIP-6963.
 *
 * @property {string} uuid  - A unique identifier (UUIDv4) assigned by the
 *   wallet extension. Used for deduplication across re-announcements.
 * @property {string} name  - Human-readable wallet name, e.g. `"MetaMask"`.
 * @property {string} icon  - Data URI of the wallet's icon image (PNG/SVG).
 * @property {string} rdns  - Reverse-DNS identifier that uniquely identifies
 *   the wallet across all browsers and platforms. Well-known values:
 *   - `"io.metamask"`          — MetaMask
 *   - `"app.phantom"`          — Phantom
 *   - `"com.coinbase.wallet"`  — Coinbase / Base Wallet
 */

/**
 * @typedef {Object} EIP6963ProviderDetail
 * A discovered EVM wallet provider as stored internally and returned to
 * consumers.
 *
 * @property {EIP6963ProviderInfo} info     - Wallet metadata (see above).
 * @property {import('ethers').Eip1193Provider} provider
 *   The EIP-1193 provider object injected by the wallet extension.
 *   Pass this directly to `new BrowserProvider(provider)` (ethers v6) or
 *   `new ethers.providers.Web3Provider(provider)` (ethers v5) to interact
 *   with the wallet.
 */

/**
 * @typedef {(providers: EIP6963ProviderDetail[]) => void} ProviderSubscriber
 * Callback signature for {@link subscribeToProviders}.
 * Invoked immediately with the current list, and again whenever the list
 * changes (i.e. a new provider announces itself).
 */

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/**
 * In-memory list of all discovered EIP-6963 providers for this page load.
 * Mutated only by {@link announceProvider}.
 * @type {EIP6963ProviderDetail[]}
 */
let providers = [];

/**
 * Set of active subscriber callbacks. Notified whenever `providers` changes.
 * @type {Set<ProviderSubscriber>}
 */
const listeners = new Set();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a snapshot of all EVM wallet providers discovered so far via
 * EIP-6963. Suitable for non-reactive (non-hook) call sites.
 *
 * @returns {EIP6963ProviderDetail[]} Immutable snapshot of the provider list.
 */
export function getDiscoveredProviders() {
  return providers;
}

/**
 * Subscribes to provider-list updates.
 *
 * The callback is invoked **immediately** with the current list (so the caller
 * sees providers that announced before the subscription), and then again each
 * time a new provider is discovered.
 *
 * @param {ProviderSubscriber} callback - Function to call on each update.
 * @returns {() => void} Unsubscribe function. Call it in a cleanup effect to
 *   prevent memory leaks.
 *
 * @example
 * const unsub = subscribeToProviders((list) => {
 *   const mm = list.find(p => p.info.rdns === 'io.metamask');
 * });
 * // later:
 * unsub();
 */
export function subscribeToProviders(callback) {
  listeners.add(callback);
  // Immediately emit the current state so the subscriber is not out-of-date
  callback(providers);
  return () => listeners.delete(callback);
}

// ---------------------------------------------------------------------------
// Internal: EIP-6963 event handler
// ---------------------------------------------------------------------------

/**
 * Handles an `eip6963:announceProvider` event fired by a wallet extension.
 *
 * Deduplicates by `info.uuid` so that wallets that re-announce (e.g. after a
 * page focus event) do not appear multiple times.
 *
 * @param {CustomEvent<{ info: EIP6963ProviderInfo, provider: unknown }>} event
 *   The EIP-6963 announce event. `event.detail` contains `info` and `provider`.
 * @returns {void}
 */
function announceProvider(event) {
  const { info, provider } = event.detail;

  // Skip re-announcements of already-registered providers
  if (providers.find((p) => p.info.uuid === info.uuid)) return;

  providers = [...providers, { info, provider }];
  listeners.forEach((callback) => callback(providers));
}

// ---------------------------------------------------------------------------
// Bootstrap: start listening when loaded in a browser context
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  // Listen for future provider announcements
  window.addEventListener("eip6963:announceProvider", announceProvider);

  // Trigger any providers that already announced before this script loaded
  window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * useDiscoveredProviders
 *
 * React hook that returns the live list of EIP-6963 discovered EVM wallet
 * providers. The component re-renders automatically whenever a new provider
 * announces itself.
 *
 * ### Usage
 * ```jsx
 * const providers = useDiscoveredProviders();
 *
 * // Find MetaMask specifically
 * const metamask = providers.find(p => p.info.rdns === 'io.metamask');
 *
 * // Pass its provider to ethers
 * const ethersProvider = new BrowserProvider(metamask.provider);
 * ```
 *
 * ### Known `rdns` values
 * | `rdns`                   | Wallet           |
 * |--------------------------|------------------|
 * | `"io.metamask"`          | MetaMask         |
 * | `"app.phantom"`          | Phantom          |
 * | `"com.coinbase.wallet"`  | Base / Coinbase  |
 *
 * @returns {EIP6963ProviderDetail[]} Reactive list of discovered providers.
 *   Empty array if no EIP-6963 wallets are installed.
 */
export function useDiscoveredProviders() {
  const [discovered, setDiscovered] = useState(providers);

  useEffect(() => {
    // subscribeToProviders returns the unsubscribe function — use as cleanup
    return subscribeToProviders(setDiscovered);
  }, []);

  return discovered;
}