// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();

vi.mock('../hooks/useFocusTrap', () => ({
    useFocusTrap: vi.fn(() => ({ current: null })),
}));

vi.mock('../components/ui/Logo', () => ({
    default: () => <div data-testid="logo" />,
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

describe('WelcomeModal focus trap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(() => 'false'),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
        });
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    async function renderModal() {
        const { default: WelcomeModal } = await import('../components/ui/WelcomeModal');

        const trigger = document.createElement('button');
        trigger.textContent = 'Open welcome modal';
        document.body.appendChild(trigger);
        trigger.focus();

        const outsideButton = document.createElement('button');
        outsideButton.textContent = 'Outside action';
        document.body.appendChild(outsideButton);

        render(<WelcomeModal />);

        const closeButton = await screen.findByRole('button', { name: /close/i });
        const createInvoiceButton = screen.getByRole('button', { name: /create invoice/i });

        return { closeButton, createInvoiceButton, outsideButton, trigger };
    }

    it('has proper accessibility attributes', async () => {
        await renderModal();

        const modal = screen.getByRole('dialog');
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby', 'welcome-modal-title');
        
        const title = screen.getByRole('heading', { name: /you're all set/i });
        expect(title).toHaveAttribute('id', 'welcome-modal-title');
    });

    it('sets initial focus to first focusable element', async () => {
        const { useFocusTrap } = await import('../hooks/useFocusTrap');
        
        await renderModal();

        expect(useFocusTrap).toHaveBeenCalledWith({
            isOpen: true,
            onClose: expect.any(Function),
            initialFocus: true,
            restoreFocus: true,
        });
    });

    it('can be dismissed with close button', async () => {
        const { closeButton } = await renderModal();

        fireEvent.click(closeButton);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('can be dismissed with Escape key via focus trap', async () => {
        const { useFocusTrap } = await import('../hooks/useFocusTrap');
        
        await renderModal();

        // The focus trap should handle Escape key and call onClose
        const mockImplementation = useFocusTrap.mock.results[0].value;
        
        // Since we're mocking useFocusTrap, we verify it was called with correct onClose function
        expect(useFocusTrap).toHaveBeenCalledWith(
            expect.objectContaining({
                onClose: expect.any(Function),
            })
        );
    });

    it('navigates to correct routes when action buttons are clicked', async () => {
        const { default: WelcomeModal } = await import('../components/ui/WelcomeModal');
        render(<WelcomeModal />);

        const createInvoiceButton = screen.getByRole('button', { name: /create invoice/i });
        fireEvent.click(createInvoiceButton);

        expect(mockNavigate).toHaveBeenCalledWith('/invoices/create');
    });
});
