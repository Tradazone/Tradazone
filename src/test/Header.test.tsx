// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Header from '../components/layout/Header';

vi.mock('../components/ui/Logo', () => ({ default: () => <div data-testid="logo" /> }));

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
    cleanup();
    mockUseAuth.mockReturnValue({ user: { name: '', avatar: null, isAuthenticated: false } });
});

describe('Header avatar alt text', () => {
    it('uses fallback alt text when user.name is empty', () => {
        render(<Header onMenuToggle={() => {}} />);
        const avatar = screen.getByRole('img', { name: 'User avatar' });
        expect(avatar).toBeTruthy();
    });

    it('uses user.name as alt text when available', () => {
        mockUseAuth.mockReturnValue({ user: { name: 'Alice', avatar: null, isAuthenticated: true } });
        render(<Header onMenuToggle={() => {}} />);
        expect(screen.getByRole('img', { name: 'Alice' })).toBeTruthy();
    });

    it('never renders an empty alt on the avatar', () => {
        render(<Header onMenuToggle={() => {}} />);
        const avatar = screen.getByRole('img', { name: 'User avatar' });
        expect(avatar.getAttribute('alt')).not.toBe('');
    });
});

describe('Header Issue #38 — icon-only controls', () => {
    it('exposes an accessible name on the notifications control', () => {
        render(<Header onMenuToggle={() => {}} />);
        expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });
});
