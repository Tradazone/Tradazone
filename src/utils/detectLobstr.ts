// @ts-nocheck
/**
 * @fileoverview detectLobstr — polling utility to detect the LOBSTR
 * Signer Extension injection into `window`.
 *
 * Browser extensions inject their objects into `window` asynchronously, often
 * tens or hundreds of milliseconds after the page loads. A synchronous check
 * at module-load time would always return `false`. This utility polls on a
 * 100 ms interval until `window.lobstr` appears or the timeout expires.
 *
 * @module detectLobstr
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} WaitForLobstrOptions
 * (Not used as a parameter object — documented here for reference only.)
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for
 *   `window.lobstr` to appear. Defaults to `3000` ms if not supplied.
 */

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * waitForLobstr
 *
 * Polls `window.lobstr` at 100 ms intervals until it is truthy or the
 * timeout expires.
 *
 * ### Resolution behaviour
 * - Resolves `true`  — `window.lobstr` was detected within `timeout` ms.
 * - Resolves `false` — `timeout` elapsed without detecting `window.lobstr`.
 *
 * The promise **never rejects** — callers can safely `await` without a
 * try/catch.
 *
 * ### Why this is needed
 * The LOBSTR extension does not use EIP-6963 and instead injects a
 * `window.lobstr` object. The injection timing is non-deterministic:
 * - On a fast machine it may be present synchronously.
 * - On a slow machine or with extension startup delays it can arrive up
 *   to ~2 s after page load.
 *
 * A 3 s timeout covers all realistic cases without blocking the UI for
 * too long when the extension is genuinely absent.
 *
 * @param {number} [timeout=3000] - Maximum wait time in milliseconds.
 * @returns {Promise<boolean>} Resolves `true` if detected, `false` on timeout.
 *
 * @example
 * const detected = await waitForLobstr(3000);
 * if (!detected) {
 *   return { success: false, error: 'NOT_INSTALLED' };
 * }
 */
export function waitForLobstr(timeout = 3000) {
  return new Promise((resolve) => {
    // Fast path: already present
    if (window.lobstr) {
      return resolve(true);
    }

    // Poll every 100 ms
    const interval = setInterval(() => {
      if (window.lobstr) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve(true);
      }
    }, 100);

    // Timeout: give up and resolve false
    const timer = setTimeout(() => {
      clearInterval(interval);
      resolve(false);
    }, timeout);
  });
}