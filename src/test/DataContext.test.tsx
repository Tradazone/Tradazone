// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DataProvider, useData, useCheckoutData } from '../context/DataContext';
import api from '../services/api';

// ISSUE VERIFICATION: "Missing alt tags on critical <img> elements in DataContext"
// STATUS: Confirmed false positive. DataContext.jsx is a pure React Context provider
// that manages state (customers, invoices, checkouts, items). It contains NO <img>
// elements, NO JSX rendering, and NO UI components. Alt tag accessibility issues
// are not applicable to this file.

// localStorage is available in jsdom; clear it before each test
beforeEach(() => localStorage.clear());

const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>;
const flushOperations = () => Promise.resolve();

// ─── addCustomer ────────────────────────────────────────────────────────────

describe('addCustomer', () => {
  it('creates a customer with required fields', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer;
    act(() => {
      customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
    });
    expect(customer.name).toBe('Alice');
    expect(customer.email).toBe('alice@example.com');
    expect(customer.id).toBeTruthy();
    expect(customer.totalSpent).toBe('0');
    expect(customer.invoiceCount).toBe(0);
  });

  it('appends customer to the list', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await act(async () => {
      result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
    });
    await flushOperations();
    await act(async () => {
      result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' });
    });
    expect(result.current.customers).toHaveLength(2);
  });

  it('assigns unique ids to each customer', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c1, c2;
    await act(async () => {
      c1 = result.current.addCustomer({ name: 'A', email: 'a@a.com' });
    });
    await flushOperations();
    await act(async () => {
      c2 = result.current.addCustomer({ name: 'B', email: 'b@b.com' });
    });
    expect(c1.id).not.toBe(c2.id);
  });

    it('sets createdAt to a full ISO timestamp', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));

        const { result } = renderHook(() => useData(), { wrapper });
        let customer;
        act(() => {
            customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
        });

        expect(customer.createdAt).toBe('2026-01-02T03:04:05.000Z');

        vi.useRealTimers();
    });
});

// ─── addItem ─────────────────────────────────────────────────────────────────

describe('addItem', () => {
  it('creates an item with defaults', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let item;
    act(() => {
      item = result.current.addItem({ name: 'Consulting', price: '100' });
    });
    expect(item.name).toBe('Consulting');
    expect(item.price).toBe('100');
    expect(item.type).toBe('service');
    expect(item.unit).toBe('unit');
    expect(item.currency).toBe('STRK');
  });

  it('respects provided type and unit', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let item;
    act(() => {
      item = result.current.addItem({ name: 'Widget', price: '50', type: 'product', unit: 'piece' });
    });
    expect(item.type).toBe('product');
    expect(item.unit).toBe('piece');
  });
});

// ─── deleteItems ─────────────────────────────────────────────────────────────

describe('deleteItems', () => {
  it('removes multiple items from the list by ids', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let i1, i2, i3;
    act(() => {
      i1 = result.current.addItem({ name: 'Item 1', price: '10' });
      i2 = result.current.addItem({ name: 'Item 2', price: '20' });
      i3 = result.current.addItem({ name: 'Item 3', price: '30' });
    });
    expect(result.current.items).toHaveLength(3);

    act(() => {
      // Mock the API for this test to avoid network logs
      vi.spyOn(api.items, 'bulkDelete').mockResolvedValue(true);
      result.current.deleteItems([i1.id, i3.id]);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(i2.id);
  });

  it('calls api.items.bulkDelete through the gateway', async () => {
    // Spy on the API gateway method
    const bulkDeleteSpy = vi.spyOn(api.items, 'bulkDelete').mockResolvedValue(true);

    const { result } = renderHook(() => useData(), { wrapper });
    let i1, i2;
    act(() => {
        i1 = result.current.addItem({ name: 'Item 1', price: '10' });
        i2 = result.current.addItem({ name: 'Item 2', price: '20' });
    });

    act(() => {
        result.current.deleteItems([i1.id, i2.id]);
    });

    expect(bulkDeleteSpy).toHaveBeenCalledWith([i1.id, i2.id]);
    bulkDeleteSpy.mockRestore();
  });
});

// ─── addInvoice ──────────────────────────────────────────────────────────────

describe('addInvoice', () => {
  it('calculates total correctly from items', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, item, invoice;
    act(() => {
      customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
      item = result.current.addItem({ name: 'Dev', price: '200' });
    });
    act(() => {
      invoice = result.current.addInvoice({
        customerId: customer.id,
        dueDate: '2025-12-31',
        items: [{ itemId: item.id, quantity: 3, price: '200' }],
      });
    });
    // 3 × 200 = 600
    expect(invoice.amount).toBe('600');
        // Pin day semantics to UTC midnight ISO
        expect(invoice.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });

    it('sets createdAt to full ISO and normalizes dueDate', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-03T04:05:06.000Z'));

        const { result } = renderHook(() => useData(), { wrapper });
        let customer, item, invoice;
        act(() => {
            customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
            item = result.current.addItem({ name: 'Dev', price: '200' });
        });
        act(() => {
            invoice = result.current.addInvoice({
                customerId: customer.id,
                dueDate: '2025-12-31',
                items: [{ itemId: item.id, quantity: 1, price: '200' }],
            });
        });

        expect(invoice.createdAt).toBe('2026-02-03T04:05:06.000Z');
        expect(invoice.dueDate).toBe('2025-12-31T00:00:00.000Z');

        vi.useRealTimers();
    });

  it('generates sequential INV-XXX ids', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c, it1, inv1, inv2;
    await act(async () => {
      c = result.current.addCustomer({ name: 'Alice', email: 'a@a.com' });
      it1 = result.current.addItem({ name: 'X', price: '10' });
    });
    await act(async () => {
      inv1 = result.current.addInvoice({ customerId: c.id, dueDate: '2025-01-01', items: [{ itemId: it1.id, quantity: 1, price: '10' }] });
    });
    await flushOperations();
    await act(async () => {
      inv2 = result.current.addInvoice({ customerId: c.id, dueDate: '2025-01-02', items: [{ itemId: it1.id, quantity: 1, price: '10' }] });
    });
    expect(inv1.id).toBe('INV-001');
    expect(inv2.id).toBe('INV-002');
  });

  it('resolves customer name from customerId', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c, it1, invoice;
    act(() => {
      c = result.current.addCustomer({ name: 'Bob', email: 'bob@b.com' });
      it1 = result.current.addItem({ name: 'Y', price: '50' });
    });
    act(() => {
      invoice = result.current.addInvoice({ customerId: c.id, dueDate: '2025-06-01', items: [{ itemId: it1.id, quantity: 1, price: '50' }] });
    });
    expect(invoice.customer).toBe('Bob');
  });

  it('falls back to "Unknown" for missing customer', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let it1, invoice;
    act(() => {
      it1 = result.current.addItem({ name: 'Z', price: '30' });
    });
    act(() => {
      invoice = result.current.addInvoice({ customerId: 'nonexistent', dueDate: '2025-06-01', items: [{ itemId: it1.id, quantity: 1, price: '30' }] });
    });
    expect(invoice.customer).toBe('Unknown');
  });

  it('sets status to "pending" by default', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c, it1, invoice;
    act(() => {
      c = result.current.addCustomer({ name: 'C', email: 'c@c.com' });
      it1 = result.current.addItem({ name: 'W', price: '10' });
    });
    act(() => {
      invoice = result.current.addInvoice({ customerId: c.id, dueDate: '2025-01-01', items: [{ itemId: it1.id, quantity: 1, price: '10' }] });
    });
    expect(invoice.status).toBe('pending');
  });
});

// ─── addCheckout ─────────────────────────────────────────────────────────────

describe('addCheckout', () => {
  it('generates sequential CHK-XXX ids', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk1, chk2;
    await act(async () => {
      chk1 = result.current.addCheckout({ title: 'Plan A', amount: '100' });
    });
    await flushOperations();
    await act(async () => {
      chk2 = result.current.addCheckout({ title: 'Plan B', amount: '200' });
    });
    expect(chk1.id).toBe('CHK-001');
    expect(chk2.id).toBe('CHK-002');
  });

  it('sets status to "active" by default', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50' });
    });
    expect(chk.status).toBe('active');
  });

  it('defaults currency to STRK when not provided', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50' });
    });
    expect(chk.currency).toBe('STRK');
  });

  it('respects provided currency', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50', currency: 'XLM' });
    });
    expect(chk.currency).toBe('XLM');
  });

  it('generates a paymentLink containing the checkout id', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50' });
    });
    expect(chk.paymentLink).toContain(chk.id);
  });
});

// ─── useData guard ───────────────────────────────────────────────────────────

describe('useData', () => {
  it('throws when used outside DataProvider', () => {
    // Suppress expected console.error from React
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useData())).toThrow('useData must be used within a DataProvider');
    spy.mockRestore();
  });
});

// ─── markCheckoutPaid ─────────────────────────────────────────────────────────

describe('markCheckoutPaid', () => {
  it('marks the checkout status as paid', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, null); });
    expect(result.current.checkouts.find((c) => c.id === chk.id).status).toBe('paid');
  });

  it('increments checkout payments count', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, null); });
    expect(result.current.checkouts.find((c) => c.id === chk.id).payments).toBe(1);
  });

  it('updates customer totalSpent and invoiceCount', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk;
    act(() => { customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' }); });
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '200' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, customer.id); });
    const updated = result.current.customers.find((c) => c.id === customer.id);
    expect(updated.invoiceCount).toBe(1);
    expect(updated.totalSpent).toBe('200');
  });

  it('accumulates totalSpent across multiple paid checkouts', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk1, chk2;
    await act(async () => { customer = result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' }); });
    await act(async () => {
      chk1 = result.current.addCheckout({ title: 'Plan A', amount: '100' });
    });
    await flushOperations();
    await act(async () => {
      chk2 = result.current.addCheckout({ title: 'Plan B', amount: '150' });
    });
    act(() => {
      result.current.markCheckoutPaid(chk1.id, customer.id);
      result.current.markCheckoutPaid(chk2.id, customer.id);
    });
    const updated = result.current.customers.find((c) => c.id === customer.id);
    expect(updated.invoiceCount).toBe(2);
    expect(updated.totalSpent).toBe('250');
  });

  it('handles decimal checkout amounts without floating-point artifacts', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk1, chk2;

    await act(async () => {
      customer = result.current.addCustomer({ name: 'Decimal', email: 'decimal@example.com' });
    });

    await act(async () => {
      chk1 = result.current.addCheckout({ title: 'Plan A', amount: '0.1' });
    });
    await flushOperations();

    await act(async () => {
      chk2 = result.current.addCheckout({ title: 'Plan B', amount: '0.2' });
    });
    await flushOperations();

    act(() => {
      result.current.markCheckoutPaid(chk1.id, customer.id);
      result.current.markCheckoutPaid(chk2.id, customer.id);
    });

    const updated = result.current.customers.find((c) => c.id === customer.id);
    expect(updated.invoiceCount).toBe(2);
    expect(updated.totalSpent).toBe('0.3');
  });

  it('fires checkout.paid webhook with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);
    localStorage.setItem('tradazone_webhook_url', 'https://example.com/hook');

    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100', currency: 'STRK' }); });
    await act(async () => { result.current.markCheckoutPaid(chk.id, null, 'starknet'); });

    const calls = mockFetch.mock.calls.filter((c) => {
      try { return JSON.parse(c[1].body).event === 'checkout.paid'; } catch { return false; }
    });
    expect(calls.length).toBeGreaterThan(0);
    const body = JSON.parse(calls[0][1].body);
    expect(body.payload.id).toBe(chk.id);
    expect(body.payload.walletType).toBe('starknet');
  });

  it('does not update other customers when customerId is null', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk;
    act(() => { customer = result.current.addCustomer({ name: 'Carol', email: 'carol@example.com' }); });
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, null); });
    const unchanged = result.current.customers.find((c) => c.id === customer.id);
    expect(unchanged.invoiceCount).toBe(0);
    expect(unchanged.totalSpent).toBe('0');
  });
});

// ─── recordCheckoutView ──────────────────────────────────────────────────────

describe('recordCheckoutView', () => {
  it('increments the views count for a checkout', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    await act(async () => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '100' });
    });
    await flushOperations();
    await act(async () => {
      result.current.recordCheckoutView(chk.id);
    });
    const updated = result.current.checkouts.find((c) => c.id === chk.id);
    expect(updated.views).toBe(1);
  });

  it('fires checkout.viewed webhook with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);
    localStorage.setItem('tradazone_webhook_url', 'https://example.com/hook');

    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    await act(async () => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '100', currency: 'STRK' });
    });
    await flushOperations();
    await act(async () => {
      result.current.recordCheckoutView(chk.id);
    });

    const calls = mockFetch.mock.calls.filter((c) => {
      try { return JSON.parse(c[1].body).event === 'checkout.viewed'; } catch { return false; }
    });
    expect(calls.length).toBeGreaterThan(0);
    const body = JSON.parse(calls[0][1].body);
    expect(body.payload.id).toBe(chk.id);
    expect(body.payload.views).toBe(1);
  });
});

describe('useCheckoutData', () => {
  it('returns checkout-only context slice independently', () => {
    const { result } = renderHook(() => useCheckoutData(), { wrapper });
    expect(result.current.checkouts).toEqual([]);
    expect(typeof result.current.addCheckout).toBe('function');
    expect(typeof result.current.markCheckoutPaid).toBe('function');
  });
});

// ─── Security: no console.warn in production (issue: console-leak) ───────────

describe('duplicate-operation guard — no console.warn in production', () => {
  it('does not call console.warn when import.meta.env.DEV is false', async () => {
    vi.stubEnv('DEV', false);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useData(), { wrapper });

    // Trigger duplicate-operation paths by calling while lock is held
    act(() => {
      // First call acquires the lock; second fires before microtask releases it
      result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
      result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' });
    });

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('calls console.warn in development when duplicate operation is detected', () => {
    vi.stubEnv('DEV', true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useData(), { wrapper });

    act(() => {
      result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
      result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' });
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DataContext] Duplicate addCustomer operation detected, ignoring.')
    );

    warnSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
