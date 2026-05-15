// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CheckoutDetail from '../pages/CheckoutDetail';

const { mockUseCheckoutData } = vi.hoisted(() => ({
  mockUseCheckoutData: vi.fn(),
}));

vi.mock('../../../context/DataContext', () => ({
  useCheckoutData: () => mockUseCheckoutData(),
}));

function renderCheckoutDetail(checkoutId = 'CHK-CSV-001') {
  return render(
    <MemoryRouter initialEntries={[`/checkout/${checkoutId}`]}>
      <Routes>
        <Route path="/checkout/:id" element={<CheckoutDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CheckoutDetail CSV export (Issue #138)', () => {
  const createObjectURL = vi.fn(() => 'blob:checkout-detail-csv');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    mockUseCheckoutData.mockReturnValue({
      recordCheckoutView: vi.fn(),
      checkouts: [
        {
          id: 'CHK-CSV-001',
          title: 'Acme "Premium"',
          description: 'Notes, with comma',
          amount: '50',
          currency: 'STRK',
          status: 'active',
          views: 10,
          payments: 2,
          createdAt: '2026-03-15T00:00:00.000Z',
          paymentLink: 'https://pay.tradazone.com/CHK-CSV-001',
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

  it('exports the current checkout to a downloadable CSV file', async () => {
    const user = userEvent.setup();
    renderCheckoutDetail();

    await user.click(screen.getByRole('button', { name: /export to csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const csvBlob = createObjectURL.mock.calls[0][0];
    expect(csvBlob).toBeInstanceOf(Blob);

    const csvText = await csvBlob.text();
    expect(csvText).toContain('Field,Value');
    expect(csvText).toContain('ID,CHK-CSV-001');
    expect(csvText).toContain('"Acme ""Premium"""');
    expect(csvText).toContain('"Notes, with comma"');
    expect(csvText).toContain('Payment Link,https://pay.tradazone.com/CHK-CSV-001');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:checkout-detail-csv');
  });
});
