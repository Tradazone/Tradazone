// @ts-nocheck
/**
 * @fileoverview Race condition tests for DataContext
 * 
 * Tests the race condition fixes implemented to prevent duplicate
 * form submissions and concurrent operation conflicts in DataContext.
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock webhook dispatch
vi.mock('../services/webhook', () => ({
    dispatchWebhook: vi.fn(),
    setWebhookUrl: vi.fn(),
    getWebhookUrl: vi.fn(),
}));

const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>;
const flushOperations = () => Promise.resolve();

describe('DataContext Race Condition Prevention', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('addCustomer - Concurrent Submission Prevention', () => {
        test('prevents duplicate concurrent addCustomer calls', () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // Simulate rapid concurrent calls
            let results = [];
            act(() => {
                // First call
                const result1 = result.current.addCustomer({
                    name: 'Customer 1',
                    email: 'customer1@test.com'
                });
                results.push(result1);
                
                // Second call (should be blocked by race condition guard)
                const result2 = result.current.addCustomer({
                    name: 'Customer 2',
                    email: 'customer2@test.com'
                });
                results.push(result2);
            });

            // One should succeed and one should be blocked (return null)
            const successful = results.filter(r => r !== null);
            expect(successful.length).toBe(1);
            
            // Verify customer was created
            expect(result.current.customers.length).toBe(1);
            expect(result.current.customers[0].name).toMatch(/Customer [12]/);
        });

        test('allows sequential addCustomer calls after operation completes', async () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // First customer
            await act(async () => {
                result.current.addCustomer({
                    name: 'Customer 1',
                    email: 'customer1@test.com'
                });
            });
            
            expect(result.current.customers.length).toBe(1);
            await flushOperations();
            
            // Second customer (should work since first operation is complete)
            await act(async () => {
                result.current.addCustomer({
                    name: 'Customer 2',
                    email: 'customer2@test.com'
                });
            });
            
            expect(result.current.customers.length).toBe(2);
            expect(result.current.customers[1].name).toBe('Customer 2');
        });
    });

    describe('addCheckout - Concurrent Submission Prevention', () => {
        test('prevents duplicate concurrent addCheckout calls', () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // Simulate rapid concurrent calls
            let results = [];
            act(() => {
                // First call
                const result1 = result.current.addCheckout({
                    title: 'Checkout 1',
                    amount: '100'
                });
                results.push(result1);
                
                // Second call (should be blocked)
                const result2 = result.current.addCheckout({
                    title: 'Checkout 2',
                    amount: '200'
                });
                results.push(result2);
            });

            // One should succeed and one should be blocked (return null)
            const successful = results.filter(r => r !== null);
            expect(successful.length).toBe(1);
            
            // Verify checkout was created
            expect(result.current.checkouts.length).toBe(1);
            expect(result.current.checkouts[0].title).toMatch(/Checkout [12]/);
        });

        test('allows sequential addCheckout calls', async () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // First checkout
            await act(async () => {
                result.current.addCheckout({
                    title: 'Checkout 1',
                    amount: '100'
                });
            });
            
            expect(result.current.checkouts.length).toBe(1);
            await flushOperations();
            
            // Second checkout
            await act(async () => {
                result.current.addCheckout({
                    title: 'Checkout 2',
                    amount: '200'
                });
            });
            
            expect(result.current.checkouts.length).toBe(2);
            expect(result.current.checkouts[1].title).toBe('Checkout 2');
        });
    });

    describe('addInvoice - Concurrent Submission Prevention', () => {
        test('prevents duplicate concurrent addInvoice calls', () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // First add a customer for the invoice
            act(() => {
                result.current.addCustomer({
                    name: 'Test Customer',
                    email: 'test@test.com'
                });
            });
            
            const customerId = result.current.customers[0].id;
            
            // Simulate rapid concurrent calls
            let results = [];
            act(() => {
                // First call
                const result1 = result.current.addInvoice({
                    customerId: customerId,
                    items: [{ itemId: 'item1', quantity: 1, price: '50' }]
                });
                results.push(result1);
                
                // Second call (should be blocked)
                const result2 = result.current.addInvoice({
                    customerId: customerId,
                    items: [{ itemId: 'item1', quantity: 2, price: '100' }]
                });
                results.push(result2);
            });

            // One should succeed and one should be blocked (return null)
            const successful = results.filter(r => r !== null);
            expect(successful.length).toBe(1);
            
            // Verify invoice was created
            expect(result.current.invoices.length).toBe(1);
        });

        test('captures current snapshot to avoid stale closure issues', () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // Add customer
            act(() => {
                result.current.addCustomer({
                    name: 'Snapshot Customer',
                    email: 'snapshot@test.com'
                });
            });
            
            const customerId = result.current.customers[0].id;
            
            // Add item
            act(() => {
                result.current.addItem({
                    name: 'Test Item',
                    price: '75'
                });
            });
            
            const itemId = result.current.items[0].id;
            
            // Add invoice - should capture current state correctly
            act(() => {
                result.current.addInvoice({
                    customerId: customerId,
                    items: [{ itemId: itemId, quantity: 2, price: '75' }]
                });
            });
            
            expect(result.current.invoices.length).toBe(1);
            expect(result.current.invoices[0].customer).toBe('Snapshot Customer');
            expect(result.current.invoices[0].items[0].name).toBe('Test Item');
        });
    });

    describe('State Consistency Under Load', () => {
        test('maintains consistent state during rapid operations', async () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // Sequential operations respecting guard cleanup
            await act(async () => {
                result.current.addCustomer({ name: 'C1', email: 'c1@test.com' });
            });
            await flushOperations();
            await act(async () => {
                result.current.addCustomer({ name: 'C2', email: 'c2@test.com' });
            });
            await flushOperations();
            await act(async () => {
                result.current.addCustomer({ name: 'C3', email: 'c3@test.com' });
            });
            await flushOperations();
            await act(async () => {
                result.current.addCheckout({ title: 'CHK1', amount: '50' });
            });
            await flushOperations();
            await act(async () => {
                result.current.addCheckout({ title: 'CHK2', amount: '100' });
            });
            await flushOperations();
            await act(async () => {
                result.current.addItem({ name: 'Item1', price: '25' });
                result.current.addItem({ name: 'Item2', price: '50' });
            });
            
            // Verify all operations completed successfully
            expect(result.current.customers.length).toBe(3);
            expect(result.current.checkouts.length).toBe(2);
            expect(result.current.items.length).toBe(2);
            
            // Verify data integrity
            expect(result.current.customers[2].name).toBe('C3');
            expect(result.current.checkouts[1].title).toBe('CHK2');
            expect(result.current.items[1].name).toBe('Item2');
        });

        test('operation tracking prevents duplicate IDs', () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // Attempt to create multiple customers rapidly
            const timestamps = [];
            act(() => {
                for (let i = 0; i < 5; i++) {
                    const customer = result.current.addCustomer({
                        name: `Customer ${i}`,
                        email: `c${i}@test.com`
                    });
                    if (customer) {
                        timestamps.push(customer.createdAt);
                    }
                }
            });
            
            // Only one should succeed due to operation tracking
            expect(result.current.customers.length).toBe(1);
            
            // Verify timestamp is valid ISO format
            expect(timestamps[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('Error Handling and Cleanup', () => {
        test('operation ID is cleaned up after completion', async () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            // First operation
            await act(async () => {
                result.current.addCustomer({
                    name: 'Customer 1',
                    email: 'c1@test.com'
                });
            });
            
            expect(result.current.customers.length).toBe(1);
            await flushOperations();
            
            // After operation completes, should be able to add another
            await act(async () => {
                result.current.addCustomer({
                    name: 'Customer 2',
                    email: 'c2@test.com'
                });
            });
            
            expect(result.current.customers.length).toBe(2);
        });

        test('localStorage is updated correctly for each operation', () => {
            const { result } = renderHook(() => useData(), { wrapper });
            
            act(() => {
                result.current.addCustomer({
                    name: 'LocalStorage Test',
                    email: 'ls@test.com'
                });
            });
            
            // Verify localStorage.setItem was called
            expect(localStorageMock.setItem).toHaveBeenCalled();
            
            // Verify the data was serialized correctly
            const saveCalls = localStorageMock.setItem.mock.calls.filter(
                call => call[0] === 'tradazone_customers'
            );
            expect(saveCalls.length).toBeGreaterThan(0);
            
            const savedData = JSON.parse(saveCalls[0][1]);
            expect(savedData[0].name).toBe('LocalStorage Test');
        });
    });
});
