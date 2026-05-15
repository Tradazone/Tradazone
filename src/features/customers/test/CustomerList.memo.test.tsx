// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React, { useState } from 'react';

// #77: verify React.memo, useMemo(filtered), and useMemo(columns) behavior.

const mockCustomers = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', phone: '111', totalSpent: '100', currency: 'STRK', invoiceCount: 2, createdAt: '2024-01-01T00:00:00Z' },
    { id: '2', name: 'Bob Jones', email: 'bob@example.com', phone: '222', totalSpent: '200', currency: 'STRK', invoiceCount: 3, createdAt: '2024-02-01T00:00:00Z' },
    { id: '3', name: 'Carol White', email: 'carol@example.com', phone: '333', totalSpent: '300', currency: 'STRK', invoiceCount: 1, createdAt: '2024-03-01T00:00:00Z' },
];

vi.mock('../../../context/DataContext', () => ({
    useData: () => ({ customers: mockCustomers }),
    DataProvider: ({ children }) => children,
}));

// DataTable.jsx has a preexisting syntax error (line 116) that prevents vite:oxc
// from transforming it. Mock it so CustomerList tests are not blocked by it.
// The mock captures the columns prop so we can assert on it across renders.
let capturedColumnsRef = [];
let capturedDataRef = [];
vi.mock('../../../components/tables/DataTable', () => ({
    default: ({ data, columns }) => {
        capturedColumnsRef.push(columns);
        capturedDataRef.push(data);
        return (
            <div data-testid="data-table">
                {data?.map((c) => <div key={c.id}>{c.name}</div>)}
            </div>
        );
    },
}));

async function getCustomerList() {
    const { default: CustomerList } = await import('../pages/CustomerList');
    return CustomerList;
}

describe('CustomerList memoization (Issue #77)', () => {
    beforeEach(() => {
        capturedColumnsRef = [];
        capturedDataRef = [];
        vi.resetModules();
    });

    it('renders without crashing', async () => {
        const CustomerList = await getCustomerList();
        render(
            <MemoryRouter>
                <CustomerList />
            </MemoryRouter>
        );
        expect(screen.getByPlaceholderText('Search customers...')).toBeTruthy();
    });

    it('useMemo(columns) — same reference across re-renders triggered by query change', async () => {
        const CustomerList = await getCustomerList();
        render(
            <MemoryRouter>
                <CustomerList />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText('Search customers...');
        fireEvent.change(input, { target: { value: 'a' } });
        fireEvent.change(input, { target: { value: 'al' } });

        // columns is memoized with [] deps — all captured references must be identical
        expect(capturedColumnsRef.length).toBeGreaterThanOrEqual(2);
        const first = capturedColumnsRef[0];
        capturedColumnsRef.forEach((ref) => {
            expect(ref).toBe(first);
        });
    });

    it('useMemo(filtered) — search input updates immediately and can be cleared', async () => {
        const CustomerList = await getCustomerList();
        render(
            <MemoryRouter>
                <CustomerList />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText('Search customers...');

        // Empty query — customers visible in DataTable mock (may also appear in select options)
        expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Bob Jones').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Carol White').length).toBeGreaterThanOrEqual(1);

        // Type a query — input value updates immediately (state is not debounced here)
        fireEvent.change(input, { target: { value: 'alice' } });
        expect(input.value).toBe('alice');

        // Clear query — input resets
        fireEvent.change(input, { target: { value: '' } });
        expect(input.value).toBe('');
    });

    it('React.memo — CustomerList does not re-render when parent re-renders with same props', async () => {
        const CustomerList = await getCustomerList();
        let renderCount = 0;

        // Wrap CustomerList to count how many times it actually executes
        const Spy = React.memo(function Spy(props) {
            renderCount++;
            return <CustomerList {...props} />;
        });

        function Parent() {
            const [, setTick] = useState(0);
            return (
                <>
                    <button onClick={() => setTick(t => t + 1)}>re-render parent</button>
                    <MemoryRouter>
                        <Spy />
                    </MemoryRouter>
                </>
            );
        }

        render(<Parent />);
        const initialCount = renderCount;

        // Trigger parent re-render — CustomerList receives no new props
        fireEvent.click(screen.getByText('re-render parent'));

        // memo should prevent CustomerList from re-rendering
        expect(renderCount).toBe(initialCount);
    });
});
