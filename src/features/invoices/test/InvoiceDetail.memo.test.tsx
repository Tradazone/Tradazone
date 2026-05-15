// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockInvoice = {
    id: 'INV-001',
    customer: 'Acme Corp',
    customerId: 'customer-1',
    status: 'pending',
    dueDate: '2026-03-30T00:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
    currency: 'STRK',
    items: [
        { name: 'Design Review', quantity: 1, price: '100' },
        { name: 'Implementation', quantity: 2, price: '150' },
    ],
};

const mockCustomer = {
    id: 'customer-1',
    email: 'billing@acme.test',
};

let mockSession;
let mockUser;
let mockData;
let invoiceLayoutRenderCount;

vi.mock('../../../context/AuthContext', () => ({
    loadSession: () => mockSession,
    useAuthUser: () => mockUser,
    useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../../context/DataContext', () => ({
    useData: () => mockData,
}));

vi.mock('../../../hooks/useDebounce', () => ({
    useDebounce: (value) => value,
}));

vi.mock('../components/InvoiceLayout', async () => {
    const ReactModule = await vi.importActual('react');

    return {
        default: ReactModule.forwardRef(function MockInvoiceLayout(_props, ref) {
            invoiceLayoutRenderCount += 1;
            return <div ref={ref} data-testid="pdf-layout" />;
        }),
    };
});

import InvoiceDetail from '../pages/InvoiceDetail';

function renderInvoiceDetail() {
    return render(
        <MemoryRouter initialEntries={['/invoices/INV-001']}>
            <Routes>
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
            </Routes>
        </MemoryRouter>
    );
}

beforeEach(() => {
    mockSession = { user: { id: '1' } };
    mockUser = { name: 'Emma', email: 'emma@example.com' };
    mockData = {
        invoices: [mockInvoice],
        customers: [mockCustomer],
    };
    invoiceLayoutRenderCount = 0;
});

describe('InvoiceDetail memoization', () => {
    it('does not rerender the hidden PDF invoice layout while filtering items', async () => {
        const user = userEvent.setup();
        renderInvoiceDetail();

        expect(invoiceLayoutRenderCount).toBe(1);

        await user.type(screen.getByPlaceholderText('Filter items...'), 'Impl');

        expect(invoiceLayoutRenderCount).toBe(1);
    });

    it('still filters invoice rows correctly after the memoization change', async () => {
        const user = userEvent.setup();
        renderInvoiceDetail();

        const table = screen.getByRole('table');
        expect(within(table).getByText('Design Review')).toBeInTheDocument();
        expect(within(table).getByText('Implementation')).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText('Filter items...'), 'Design');

        expect(within(table).getByText('Design Review')).toBeInTheDocument();
        expect(within(table).queryByText('Implementation')).toBeNull();
    });
});
