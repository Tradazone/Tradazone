/// <reference types="vite/client" />
import {
    customersService,
    itemsService,
    invoicesService,
    checkoutsService,
} from './supabaseData';
import type { Customer, Invoice, Item, Checkout } from '../types';

export function sanitizeText(value: unknown): string {
    if (typeof value !== 'string') return String(value ?? '');
    return value.replace(/<[^>]*>/g, '');
}

interface PaginationResult<T> {
    data:       T[];
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
}

export function paginate<T>(items: T[], page = 1, limit = 10): PaginationResult<T> {
    const safePage  = Math.max(1, Math.floor(page));
    const safeLimit = Math.max(1, Math.floor(limit));
    const total     = items.length;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const clampedPage = Math.min(safePage, totalPages);
    const start = (clampedPage - 1) * safeLimit;
    return { data: items.slice(start, start + safeLimit), page: clampedPage, limit: safeLimit, total, totalPages };
}

let _onUnauthorized: () => void = () => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    window.location.assign(`${base}/signin?reason=expired`);
};

export function setUnauthorizedHandler(handler: () => void): void {
    _onUnauthorized = handler;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<unknown> {
    const defaultOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
            ...(options.headers as Record<string, string>),
        },
        ...options,
    };
    const response = await fetch(url, defaultOptions);
    if (response.status === 401) {
        _onUnauthorized();
        return { ok: false, error: 'ERR_TOKEN_EXPIRED', status: 401 };
    }
    if (!response.ok) {
        const body = await response.json().catch((parseError: Error) => {
            console.error(`[API Gateway] Failed to parse error response (status ${response.status}): ${parseError.message}`);
            return { message: `API error ${response.status}` };
        });
        const safeMessage = sanitizeText(body.message) || `API error ${response.status}`;
        throw Object.assign(new Error(safeMessage), { status: response.status, body });
    }
    return response.json();
}

export { apiFetch };

const api = {
    customers: {
        list:   (walletAddress: string)                   => customersService.list(walletAddress),
        upsert: (walletAddress: string, data: Customer)   => customersService.upsert(walletAddress, data),
        delete: (id: string)                              => customersService.delete(id),
    },
    invoices: {
        list:      (walletAddress: string)                => invoicesService.list(walletAddress),
        upsert:    (walletAddress: string, inv: Invoice)  => invoicesService.upsert(walletAddress, inv),
        delete:    (id: string)                           => invoicesService.delete(id),
        getPublic: (id: string)                           => invoicesService.getPublic(id),
    },
    checkouts: {
        list:           (walletAddress: string)               => checkoutsService.list(walletAddress),
        upsert:         (walletAddress: string, chk: Checkout)=> checkoutsService.upsert(walletAddress, chk),
        delete:         (id: string)                          => checkoutsService.delete(id),
        getPublic:      (id: string)                          => checkoutsService.getPublic(id),
        incrementViews: (id: string)                          => checkoutsService.incrementViews(id),
    },
    items: {
        list:       (walletAddress: string)               => itemsService.list(walletAddress),
        upsert:     (walletAddress: string, item: Item)   => itemsService.upsert(walletAddress, item),
        bulkDelete: (ids: string[])                       => itemsService.bulkDelete(ids),
    },
};

export default api;
