// @ts-nocheck
/**
 * @fileoverview useFocusTrap - accessibility hook for modal focus management.
 *
 * ISSUE #36: Focus trap implementation for modal accessibility.
 * Category: UI/UX
 * Priority: Medium
 * Affected Area: Checkout flow (and all modals)
 *
 * ISSUE #40: Focus is not trapped correctly within the modal in AuthContext.
 * Category: Accessibility
 * Priority: High
 * Affected Area: AuthContext
 * Description: The auth wallet modal could lose focus to elements outside the
 * dialog because the previous trap only listened on the modal container. This
 * hook now enforces the trap at the document level so AuthContext-driven modals
 * keep keyboard focus contained and restore it safely on close.
 *
 * This hook implements proper focus management for modal dialogs:
 * - Traps focus within the modal (Tab/Shift+Tab cycle through focusable elements)
 * - Redirects stray focus back into the modal when focus escapes
 * - Sets initial focus to the first focusable element
 * - Restores focus to the trigger element when modal closes
 * - Handles Escape key to close modal
 *
 * @module useFocusTrap
 */

import { useEffect, useRef } from 'react';

/**
 * Query selector for all focusable elements within a container.
 * Includes buttons, links, inputs, textareas, selects, and elements with tabindex >= 0.
 */
const FOCUSABLE_ELEMENTS = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS)).filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.hidden) return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;
        return true;
    });
}

/**
 * useFocusTrap - manages focus within a modal dialog for accessibility.
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the modal is currently open
 * @param {() => void} options.onClose - Callback to close the modal (triggered by Escape key)
 * @param {boolean} [options.initialFocus=true] - Whether to focus first element on mount
 * @param {boolean} [options.restoreFocus=true] - Whether to restore focus on unmount
 *
 * @returns {React.RefObject} - Ref to attach to the modal container element
 */
export function useFocusTrap({ isOpen, onClose, initialFocus = true, restoreFocus = true }) {
    const containerRef = useRef(null);
    const previousActiveElement = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        previousActiveElement.current = document.activeElement;

        const container = containerRef.current;
        if (!container) return;

        let initialFocusTimeoutId = null;
        let restoreFocusTimeoutId = null;

        if (!container.hasAttribute('tabindex')) {
            container.setAttribute('tabindex', '-1');
        }

        const focusFirstElement = () => {
            const focusableElements = getFocusableElements(container);
            const target = focusableElements[0] || container;

            if (target instanceof HTMLElement) {
                target.focus();
            }
        };

        if (initialFocus) {
            initialFocusTimeoutId = window.setTimeout(() => {
                focusFirstElement();
            }, 10);
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusableElements = getFocusableElements(container);
            if (focusableElements.length === 0) {
                event.preventDefault();
                focusFirstElement();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (!container.contains(activeElement)) {
                event.preventDefault();
                (event.shiftKey ? lastElement : firstElement).focus();
                return;
            }

            if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
                return;
            }

            if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        const handleFocusIn = (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (container.contains(target)) return;
            focusFirstElement();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('focusin', handleFocusIn);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('focusin', handleFocusIn);

            if (initialFocusTimeoutId !== null) {
                window.clearTimeout(initialFocusTimeoutId);
            }

            if (restoreFocus && previousActiveElement.current instanceof HTMLElement) {
                restoreFocusTimeoutId = window.setTimeout(() => {
                    previousActiveElement.current?.focus();
                }, 10);
            }
        };
    }, [isOpen, onClose, initialFocus, restoreFocus]);

    return containerRef;
}

export default useFocusTrap;
