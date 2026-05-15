// @ts-nocheck
/**
 * @fileoverview Visual snapshot tests for CustomerList — Issue #162
 *
 * ISSUE: #162 — Add visual snapshot testing for the CustomerList components.
 * Category: Testing & QA
 * Affected Area: CustomerList (`src/pages/customers/CustomerList.jsx`)
 *
 * Minimal DOM snapshots for the three main branches: loading, empty, and data table.
 * DataTable and RichTextEditor are stubbed so heavy dependencies stay out of the graph
 * and snapshots stay stable (no React useId churn in the editor).
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CustomerList from '../pages/CustomerList';

const snapshotCtx = vi.hoisted(() => ({
  customers: undefined as unknown[] | null | undefined,
  updateCustomerDescription: vi.fn(),
}));

vi.mock('../../../context/DataContext', () => ({
  DataProvider: ({ children }) => <>{children}</>,
  useData: () => ({
    customers: snapshotCtx.customers,
    updateCustomerDescription: snapshotCtx.updateCustomerDescription,
  }),
}));

vi.mock('../../../components/tables/DataTable', () => ({
  default: ({ data, emptyMessage }) => (
    <div data-testid="data-table-stub">
      <span data-testid="data-table-empty-msg">{emptyMessage}</span>
      <ul>
        {(data ?? []).map((row) => (
          <li key={row.id}>{row.name ?? row.id}</li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock('../../../components/forms/RichTextEditor', () => ({
  default: ({ label, value, placeholder }) => (
    <div data-testid="rich-text-editor-stub">
      <span className="rte-label">{label}</span>
      {placeholder != null ? <span className="rte-placeholder">{placeholder}</span> : null}
      <div className="rte-value">{value}</div>
    </div>
  ),
}));

describe('CustomerList visual snapshots (Issue #162)', () => {
  beforeEach(() => {
    snapshotCtx.updateCustomerDescription.mockClear();
  });

  it('matches snapshot — loading (customers still undefined)', () => {
    snapshotCtx.customers = undefined;
    const { container } = render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot — empty list', async () => {
    snapshotCtx.customers = [];
    const { container } = render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No customers yet/i)).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot — with customers', async () => {
    snapshotCtx.customers = [
      {
        id: 'c-1',
        name: 'Acme Corp',
        email: 'acme@example.com',
        phone: '555-0100',
        description: '<p>Preferred partner</p>',
        totalSpent: '100',
        currency: 'STRK',
        invoiceCount: 2,
        createdAt: '2024-06-15',
      },
    ];
    const { container } = render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Customer description/i)).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });
});
