// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateCheckout from '../pages/checkouts/CreateCheckout';
import { DataProvider } from '../context/DataContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CreateCheckout E2E UI Flow', () => {
  it('should fill out and submit the checkout form successfully', async () => {
    render(
      <MemoryRouter>
        <DataProvider>
          <CreateCheckout />
        </DataProvider>
      </MemoryRouter>
    );

    // Verify form renders
    expect(screen.getByRole('heading', { level: 1, name: 'Create Checkout' })).toBeInTheDocument();

    // Fill form elements using the accessible names (labels are linked via the newly added IDs)
    const titleInput = screen.getByLabelText(/Title/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    const amountInput = screen.getByLabelText(/Amount/i);

    fireEvent.change(titleInput, { target: { value: 'Test Checkout Plan' } });
    fireEvent.change(descriptionInput, { target: { value: 'A test description\nwith multiple lines' } });
    fireEvent.change(amountInput, { target: { value: '150' } });

    // Verify preview reflects changes
    expect(screen.getByText('Test Checkout Plan')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'P' && /A test description\s+with multiple lines/.test(content);
    })).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create Checkout/i });
    fireEvent.click(submitButton);

    // Verify navigation was triggered indicating successful creation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
    });
  });
});
