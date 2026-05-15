// @ts-nocheck
/**
 * webhook.js
 *
 * ISSUE: #144 (CI pipeline test coverage gap)
 * Category: Testing & QA
 * Affected Area: CI pipeline
 * Description: Zero unit tests coverage found for the critical logic in CI pipeline.
 * This file contains the dispatchWebhook critical logic that now has explicit regression coverage.
 *
 * Client-side webhook dispatcher for Tradazone checkout events.
 *
 * Supported events:
 *   - user.signed_up           fired when a wallet is connected for the first time
 *   - checkout.route.entered   fired when user navigates to /checkout or /checkout/create
 *                              (Issue #119 — App Routing / CheckoutRoutesShell)
 *   - checkout.created         fired when a new checkout link is created
 *   - checkout.paid            fired when a checkout is marked as paid
 *   - checkout.viewed          fired when a checkout page is opened
 *
 * Webhook endpoints are stored per-user in localStorage under WEBHOOK_KEY.
 * Each dispatch sends a POST request with a JSON body:
 *   { event, payload, timestamp, id }
 *
 * A single retry is attempted after RETRY_DELAY_MS on network failure.
 */

export const WEBHOOK_KEY = 'tradazone_webhook_url';
const RETRY_DELAY_MS = 1000;

/**
 * On first load, seed localStorage from the build-time env variable
 * VITE_WEBHOOK_URL if no URL has been saved by the user yet.
 * This lets staging/production deployments ship with a pre-configured
 * endpoint without requiring manual in-app setup.
 */
const ENV_WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || '';
if (ENV_WEBHOOK_URL && !localStorage.getItem(WEBHOOK_KEY)) {
    try { localStorage.setItem(WEBHOOK_KEY, ENV_WEBHOOK_URL); } catch { /* quota / SSR */ }
}

/** Persist the webhook endpoint URL. Pass null/empty to clear. */
export function setWebhookUrl(url) {
    if (!url) {
        localStorage.removeItem(WEBHOOK_KEY);
        return;
    }
    if (!isValidWebhookUrl(url)) {
        throw new Error('Invalid webhook URL: must be a valid http/https URL');
    }
    localStorage.setItem(WEBHOOK_KEY, url);
}

/** Retrieve the currently configured webhook endpoint URL, or null. */
export function getWebhookUrl() {
    return localStorage.getItem(WEBHOOK_KEY) || null;
}

/** Returns true if the string is a valid http/https URL. */
export function isValidWebhookUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Dispatch a webhook event to the configured endpoint.
 *
 * @param {string} event   - Event name, e.g. 'checkout.created'
 * @param {object} payload - Event-specific data
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
export async function dispatchWebhook(event, payload) {
    if (!event || typeof event !== 'string' || !event.trim()) {
        return { ok: false, error: 'invalid_event' };
    }

    if (payload === undefined || payload === null || typeof payload !== 'object') {
        return { ok: false, error: 'invalid_payload' };
    }

    const url = getWebhookUrl();
    if (!url) return { ok: false, error: 'no_url_configured' };

    const body = JSON.stringify({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        event,
        payload,
        timestamp: new Date().toISOString(),
    });

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    };

    try {
        const res = await fetch(url, options);
        return { ok: res.ok, status: res.status };
    } catch (err) {
        // BUG FIX #16: Log the initial network error instead of silently swallowing it.
        // Previously the empty catch block obscured DNS, CORS, and timeout failures.
        console.error(
            `[Webhook] Initial dispatch failed for event "${event}" to ${url}: ${err.message}`
        );

        // Single retry after delay
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        try {
            const res = await fetch(url, options);
            return { ok: res.ok, status: res.status };
        } catch (retryErr) {
            console.error(
                `[Webhook] Retry also failed for event "${event}" to ${url}: ${retryErr.message}`
            );
            return { ok: false, error: retryErr.message };
        }
    }
}
