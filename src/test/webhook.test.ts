// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    isValidWebhookUrl,
    setWebhookUrl,
    getWebhookUrl,
    dispatchWebhook,
    WEBHOOK_KEY,
} from '../services/webhook';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

// ─── isValidWebhookUrl ────────────────────────────────────────────────────────

describe('isValidWebhookUrl', () => {
    it('accepts https URLs', () => {
        expect(isValidWebhookUrl('https://example.com/hook')).toBe(true);
    });

    it('accepts http URLs', () => {
        expect(isValidWebhookUrl('http://localhost:4000/hook')).toBe(true);
    });

    it('rejects non-http protocols', () => {
        expect(isValidWebhookUrl('ftp://example.com/hook')).toBe(false);
    });

    it('rejects plain strings', () => {
        expect(isValidWebhookUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidWebhookUrl('')).toBe(false);
    });
});

// ─── setWebhookUrl / getWebhookUrl ────────────────────────────────────────────

describe('setWebhookUrl', () => {
    it('persists a valid URL to localStorage', () => {
        setWebhookUrl('https://example.com/hook');
        expect(localStorage.getItem(WEBHOOK_KEY)).toBe('https://example.com/hook');
    });

    it('throws on an invalid URL', () => {
        expect(() => setWebhookUrl('not-a-url')).toThrow('Invalid webhook URL');
    });

    it('removes the key when called with null', () => {
        setWebhookUrl('https://example.com/hook');
        setWebhookUrl(null);
        expect(localStorage.getItem(WEBHOOK_KEY)).toBeNull();
    });

    it('removes the key when called with empty string', () => {
        setWebhookUrl('https://example.com/hook');
        setWebhookUrl('');
        expect(localStorage.getItem(WEBHOOK_KEY)).toBeNull();
    });
});

describe('getWebhookUrl', () => {
    it('returns null when nothing is stored', () => {
        expect(getWebhookUrl()).toBeNull();
    });

    it('returns the stored URL', () => {
        localStorage.setItem(WEBHOOK_KEY, 'https://example.com/hook');
        expect(getWebhookUrl()).toBe('https://example.com/hook');
    });
});

// ─── dispatchWebhook ──────────────────────────────────────────────────────────

describe('dispatchWebhook', () => {
    it('returns invalid_event when event is empty', async () => {
        const result = await dispatchWebhook('', { id: 'CHK-001' });
        expect(result).toEqual({ ok: false, error: 'invalid_event' });
    });

    it('returns invalid_payload when payload is not an object', async () => {
        const result = await dispatchWebhook('checkout.created', null);
        expect(result).toEqual({ ok: false, error: 'invalid_payload' });
    });

    it('returns no_url_configured when no URL is set', async () => {
        const result = await dispatchWebhook('checkout.created', { id: 'CHK-001' });
        expect(result).toEqual({ ok: false, error: 'no_url_configured' });
    });

    it('POSTs to the configured URL with correct headers', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.created', { id: 'CHK-001', amount: '100' });

        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toBe('https://example.com/hook');
        expect(opts.method).toBe('POST');
        expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('sends correct event name and payload in body', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.created', { id: 'CHK-001', amount: '50' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.created');
        expect(body.payload).toEqual({ id: 'CHK-001', amount: '50' });
        expect(body.timestamp).toBeTruthy();
        expect(body.id).toMatch(/^evt_/);
    });

    it('returns ok:true on 200 response', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

        const result = await dispatchWebhook('user.signed_up', { walletAddress: '0xabc' });
        expect(result).toEqual({ ok: true, status: 200 });
    });

    it('returns ok:false on non-2xx response', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

        const result = await dispatchWebhook('checkout.created', { id: 'CHK-001' });
        expect(result).toEqual({ ok: false, status: 500 });
    });

    it('retries once on network failure and succeeds on retry', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.useFakeTimers();

        const mockFetch = vi.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        const promise = dispatchWebhook('checkout.created', { id: 'CHK-001' });
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ ok: true, status: 200 });
        vi.useRealTimers();
    });

    it('returns error after both attempts fail', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.useFakeTimers();

        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
        vi.stubGlobal('fetch', mockFetch);

        const promise = dispatchWebhook('checkout.created', { id: 'CHK-001' });
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.ok).toBe(false);
        expect(result.error).toBe('Network error');
        vi.useRealTimers();
    });

    it('dispatches user.signed_up event correctly', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('user.signed_up', { walletAddress: 'GADDR', walletType: 'stellar' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('user.signed_up');
        expect(body.payload.walletType).toBe('stellar');
    });

    it('dispatches checkout.paid event correctly', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.paid', { id: 'CHK-001', amount: '200', currency: 'STRK' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.paid');
        expect(body.payload.id).toBe('CHK-001');
    });
});

// ─── checkout route webhook triggers ─────────────────────────────────────────────────────

describe('checkout route webhook triggers', () => {
    it('checkout.created includes id, title, amount, currency, paymentLink', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.created', {
            id: 'CHK-001',
            title: 'Pro Plan',
            amount: '150',
            currency: 'STRK',
            paymentLink: 'https://pay.tradazone.com/CHK-001',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.created');
        expect(body.payload).toMatchObject({
            id: 'CHK-001',
            title: 'Pro Plan',
            amount: '150',
            currency: 'STRK',
            paymentLink: 'https://pay.tradazone.com/CHK-001',
        });
    });

    it('checkout.viewed includes id and title', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.viewed', { id: 'CHK-002', title: 'Starter Plan' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.viewed');
        expect(body.payload).toMatchObject({ id: 'CHK-002', title: 'Starter Plan' });
    });

    it('checkout.paid includes id, amount, currency, walletType', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.paid', {
            id: 'CHK-003',
            amount: '200',
            currency: 'STRK',
            walletType: 'starknet',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.paid');
        expect(body.payload).toMatchObject({
            id: 'CHK-003',
            amount: '200',
            currency: 'STRK',
            walletType: 'starknet',
        });
    });

    it('checkout.route.entered includes screen and path (Issue #119)', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.route.entered', {
            screen: 'list',
            path: '/checkout',
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.route.entered');
        expect(body.payload).toEqual({ screen: 'list', path: '/checkout' });
    });

    it('does not dispatch when no webhook URL is configured', async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        const result = await dispatchWebhook('checkout.created', { id: 'CHK-001' });
        expect(mockFetch).not.toHaveBeenCalled();
        expect(result).toEqual({ ok: false, error: 'no_url_configured' });
    });
});
