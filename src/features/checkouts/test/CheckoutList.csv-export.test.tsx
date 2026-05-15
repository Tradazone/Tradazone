// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutList from '../pages/CheckoutList';

const { mockUseCheckoutData } = vi.hoisted(() => ({
  mockUseCheckoutData: vi.fn(),
}));

vi.mock('../../../context/DataContext', () => ({
  useCheckoutData: () => mockUseCheckoutData(),
  useFilteredData: ({ data }) => data || [],
  useDataFilters: () => ({ filters: {}, setFilters: vi.fn() }),
}));

describe('CheckoutList CSV export (Issue #138)', () => {
  const createObjectURL = vi.fn(() => 'blob:checkout-list-csv');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    mockUseCheckoutData.mockReturnValue({
      checkouts: [
        {
          id: 'CHK-001',
          title: 'Pro, Plan',
          description: 'Line one\nLine two',
          amount: '99',
          currency: 'STRK',
          status: 'active',
          views: 3,
          payments: 1,
          createdAt: '2026-03-01T12:00:00.000Z',
          paymentLink: 'https://pay.tradazone.com/CHK-001',
        },
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

  it('exports all checkouts to a downloadable CSV file', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CheckoutList />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /export to csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const csvBlob = createObjectURL.mock.calls[0][0];
    expect(csvBlob).toBeInstanceOf(Blob);

    const csvText = await csvBlob.text();
    expect(csvText).toContain('ID,Title,Description,Amount,Currency,Status,Views,Payments,Created (UTC),Payment Link');
    expect(csvText).toContain('"Pro, Plan"');
    expect(csvText).toMatch(/"Line one\nLine two"/);
    expect(csvText).toContain('CHK-001,');
    expect(csvText).toContain('https://pay.tradazone.com/CHK-001');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:checkout-list-csv');
  });

  it('does not render Export when there are no checkouts', () => {
    mockUseCheckoutData.mockReturnValue({ checkouts: [] });
    render(
      <MemoryRouter>
        <CheckoutList />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /export to csv/i })).not.toBeInTheDocument();
  });
});
