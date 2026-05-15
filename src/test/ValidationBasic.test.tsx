// @ts-nocheck
/**
 * Basic validation test to verify our fixes work
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AddCustomer from '../pages/customers/AddCustomer';

const mockUseData = vi.fn(() => ({
    addCustomer: vi.fn()
}));

// Mock the context providers
vi.mock('../context/DataContext', () => ({
    useData: (...args) => mockUseData(...args),
}));

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Basic Validation Test', () => {
    test('AddCustomer shows validation errors', () => {
        const mockAddCustomer = vi.fn();
        mockUseData.mockReturnValue({
            addCustomer: mockAddCustomer
        });

        const { container } = renderWithRouter(<AddCustomer />);

        const form = container.querySelector('form');
        fireEvent.submit(form);

        // Check if validation errors appear
        expect(screen.getByText('Customer name is required')).toBeInTheDocument();
        expect(screen.getByText('Email address is required')).toBeInTheDocument();

        // Verify addCustomer was not called
        expect(mockAddCustomer).not.toHaveBeenCalled();
    });
});
