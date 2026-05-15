// @ts-nocheck
/**
 * @fileoverview Form validation tests for Auth module fixes
 * 
 * Tests the form validation fixes implemented to prevent submission
 * without required fields in the Auth module and related forms.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddCustomer from '../pages/customers/AddCustomer';
import CreateCheckout from '../pages/checkouts/CreateCheckout';
import PasswordSettings from '../pages/settings/PasswordSettings';

const mockUseData = vi.fn(() => ({
    addCustomer: vi.fn(),
    addCheckout: vi.fn(() => ({ id: '123', title: 'Test', amount: '100', currency: 'STRK', paymentLink: 'test-link' })),
}));
const mockUseCheckoutData = vi.fn(() => ({
    addCheckout: vi.fn(() => ({ id: '123', title: 'Test', amount: '100', currency: 'STRK', paymentLink: 'test-link' })),
}));

// Mock the context providers
vi.mock('../context/DataContext', () => ({
    useData: (...args) => mockUseData(...args),
    useCheckoutData: (...args) => mockUseCheckoutData(...args),
}));

vi.mock('../services/webhook', () => ({
    dispatchWebhook: vi.fn()
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Form Validation Fixes', () => {
    beforeEach(() => {
        mockUseData.mockReset();
        mockUseData.mockReturnValue({
            addCustomer: vi.fn(),
            addCheckout: vi.fn(() => ({ id: '123', title: 'Test', amount: '100', currency: 'STRK', paymentLink: 'test-link' })),
        });
        mockUseCheckoutData.mockReset();
        mockUseCheckoutData.mockReturnValue({
            addCheckout: vi.fn(() => ({ id: '123', title: 'Test', amount: '100', currency: 'STRK', paymentLink: 'test-link' })),
        });
    });

    describe('AddCustomer Form', () => {
        test('prevents submission with empty required fields', async () => {
            const mockAddCustomer = vi.fn();
            mockUseData.mockReturnValue({
                addCustomer: mockAddCustomer
            });

            const { container } = renderWithRouter(<AddCustomer />);

            const form = container.querySelector('form');
            fireEvent.submit(form);

            // Should show validation errors
            await waitFor(() => {
                expect(screen.getByText('Customer name is required')).toBeInTheDocument();
                expect(screen.getByText('Email address is required')).toBeInTheDocument();
            });

            // Should not call addCustomer
            expect(mockAddCustomer).not.toHaveBeenCalled();
        });

        test('validates email format', async () => {
            const { container } = renderWithRouter(<AddCustomer />);
            
            const nameInput = screen.getByPlaceholderText('Enter customer name');
            const emailInput = screen.getByPlaceholderText('Enter email address');
            const form = container.querySelector('form');

            fireEvent.change(nameInput, { target: { value: 'John Doe' } });
            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });
        });

        test('clears errors when user starts typing', async () => {
            const { container } = renderWithRouter(<AddCustomer />);

            const form = container.querySelector('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Customer name is required')).toBeInTheDocument();
            });

            const nameInput = screen.getByPlaceholderText('Enter customer name');
            fireEvent.change(nameInput, { target: { value: 'John' } });

            await waitFor(() => {
                expect(screen.queryByText('Customer name is required')).not.toBeInTheDocument();
            });
        });
    });

    describe('CreateCheckout Form', () => {
        test('prevents submission with empty required fields', async () => {
            const mockAddCheckout = vi.fn();
            mockUseCheckoutData.mockReturnValue({
                addCheckout: mockAddCheckout
            });

            const { container } = renderWithRouter(<CreateCheckout />);

            const form = container.querySelector('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Checkout title is required')).toBeInTheDocument();
                expect(screen.getByText('Amount is required')).toBeInTheDocument();
            });

            expect(mockAddCheckout).not.toHaveBeenCalled();
        });

        test('validates amount is a positive number', async () => {
            const { container } = renderWithRouter(<CreateCheckout />);
            
            const titleInput = screen.getByPlaceholderText('Enter checkout title');
            const amountInput = screen.getByPlaceholderText('0.00');
            const form = container.querySelector('form');

            fireEvent.change(titleInput, { target: { value: 'Test Checkout' } });
            fireEvent.change(amountInput, { target: { value: '-10' } });
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid amount greater than 0')).toBeInTheDocument();
            });
        });
    });

    describe('PasswordSettings Form', () => {
        test('prevents submission with empty current password', async () => {
            const { container } = render(<PasswordSettings />);

            const form = container.querySelector('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Current password is required')).toBeInTheDocument();
                expect(screen.getByText('New password is required')).toBeInTheDocument();
                expect(screen.getByText('Please confirm your new password')).toBeInTheDocument();
            });
        });

        test('validates password length and matching', async () => {
            const { container } = render(<PasswordSettings />);
            
            const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
            const newPasswordInput = screen.getByPlaceholderText('Enter new password');
            const confirmPasswordInput = screen.getByPlaceholderText('Enter confirm new password');
            const form = container.querySelector('form');

            fireEvent.change(currentPasswordInput, { target: { value: 'oldpass' } });
            fireEvent.change(newPasswordInput, { target: { value: 'short' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'different' } });
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
                expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
            });
        });
    });
});
