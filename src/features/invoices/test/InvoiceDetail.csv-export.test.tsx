// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InvoiceDetail from '../pages/InvoiceDetail';

const { mockUseAuth, mockUseData, mockLoadSession } = vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockUseData: vi.fn(),
    mockLoadSession: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
    loadSession: () => mockLoadSession(),
}));

vi.mock('../../../context/DataContext', () => ({
    useData: () => mockUseData(),
}));

function renderInvoiceDetail(invoiceId = 'INV-CSV-001') {
    return render(
        <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
            <Routes>
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('InvoiceDetail CSV export', () => {
    const createObjectURL = vi.fn(() => 'blob:invoice-csv');
    const revokeObjectURL = vi.fn();

    beforeEach(() => {
        mockLoadSession.mockReturnValue({ id: 'session-user' });
        mockUseAuth.mockReturnValue({
            user: { name: 'Emma', email: 'emma@example.com' },
        });
        mockUseData.mockReturnValue({
            invoices: [
                {
                    id: 'INV-CSV-001',
                    customer: 'Acme, Inc.',
                    customerId: 'cust-1',
                    status: 'pending',
                    dueDate: '2026-03-30T00:00:00.000Z',
                    createdAt: '2026-03-01T00:00:00.000Z',
                    items: [
                        { name: 'Design "Audit"', quantity: 2, price: '10.5' },
                        { name: 'API Integration', quantity: 1, price: '20' },
                    ],
                },
            ],
            customers: [
                { id: 'cust-1', email: 'billing@acme.test' },
            ],
        });

        Object.defineProperty(globalThis.URL, 'createObjectURL', {
            value: createObjectURL,
            configurable: true,
            writable: true,
        });
        Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
            value: revokeObjectURL,
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('exports invoice line items to a downloadable CSV file', async () => {
        const user = userEvent.setup();
        renderInvoiceDetail();

        await user.click(screen.getByRole('button', { name: /export to csv/i }));

        expect(createObjectURL).toHaveBeenCalledTimes(1);

        const csvBlob = createObjectURL.mock.calls[0][0];
        expect(csvBlob).toBeInstanceOf(Blob);

        const csvText = await csvBlob.text();
        expect(csvText).toContain('Invoice ID,INV-CSV-001');
        expect(csvText).toContain('Customer,"Acme, Inc."');
        expect(csvText).toContain('Item,Quantity,Price (STRK),Total (STRK)');
        expect(csvText).toContain('"Design ""Audit""",2,10.5,21');
        expect(csvText).toContain('API Integration,1,20,20');
        expect(csvText).toContain('Grand Total,,,41');

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:invoice-csv');
    });

    it('sanitizes invoice text before rendering and exporting', async () => {
        const user = userEvent.setup();
        mockUseData.mockReturnValue({
            invoices: [
                {
                    id: 'INV-<script>alert(1)</script>-001',
                    customer: 'Acme <img src=x onerror=alert(1)> Corp',
                    customerId: 'cust-2',
                    status: 'pending',
                    dueDate: '2026-03-30T00:00:00.000Z',
                    createdAt: '2026-03-01T00:00:00.000Z',
                    items: [
                        { name: 'Website <script>alert(1)</script> Audit', quantity: 1, price: '50' },
                    ],
                },
            ],
            customers: [
                { id: 'cust-2', email: 'billing<script>@acme.test' },
            ],
        });

        renderInvoiceDetail(encodeURIComponent('INV-<script>alert(1)</script>-001'));

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('INV--001');
        expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
        expect(screen.getAllByText((content) => content.includes('billing')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Website Audit').length).toBeGreaterThan(0);
        expect(document.querySelector('script')).toBeNull();

        await user.click(screen.getByRole('button', { name: /export to csv/i }));

        const csvBlob = createObjectURL.mock.calls[0][0];
        const csvText = await csvBlob.text();
        expect(csvText).toContain('Invoice ID,INV--001');
        expect(csvText).toContain('Customer,Acme Corp');
        expect(csvText).toContain('Website Audit,1,50,50');
        expect(csvText).not.toContain('<script>');
        expect(csvText).not.toContain('onerror');
    });
});
