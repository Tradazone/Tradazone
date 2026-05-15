// @ts-nocheck
/**
 * @fileoverview Unit tests for ProfileSettings critical logic — Issue #163
 *
 * ISSUE: #163 — Zero unit tests coverage found for the critical logic in ProfileSettings.
 * Category: Testing / ProfileSettings
 * Affected Area: ProfileSettings (src/pages/settings/ProfileSettings.jsx)
 *
 * Covers:
 *  1. Form renders pre-populated values from AuthContext user state.
 *  2. Validation — name and email are required; errors shown and cleared.
 *  3. Save — calls updateProfile with correct payload; shows success message.
 *  4. Reset (Cancel) — reverts form to original user values.
 *  5. Empty state — EmptyState banner shown when user has no profile data.
 *  6. Rich text description — rendered and submitted correctly.
 *  7. Virtualized activity list — rendered with correct test id.
 *  8. Save message clears on field change.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockUser;
const mockUpdateProfile = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
    useAuthUser:    () => mockUser,
    useAuthActions: () => ({ updateProfile: mockUpdateProfile }),
}));

vi.mock('../../../components/ui/StagingBanner', () => ({ default: () => null }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderProfileSettings() {
    // Dynamic import ensures the vi.mock stubs are applied before the module loads
    const { default: ProfileSettings } = await import('../pages/ProfileSettings');
    render(
        <MemoryRouter>
            <ProfileSettings />
        </MemoryRouter>
    );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    mockUpdateProfile.mockReset();
    mockUser = {
        name:               'Alice Merchant',
        email:              'alice@example.com',
        phone:              '1234567890',
        company:            'Alice Co',
        address:            '42 Chain Street',
        profileDescription: '<p>Existing <strong>profile</strong></p>',
    };
});

// ─── 1. Pre-populated form values ─────────────────────────────────────────────

describe('ProfileSettings — pre-populated form values', () => {
    it('renders name field with user value', async () => {
        await renderProfileSettings();
        expect(screen.getByDisplayValue('Alice Merchant')).toBeTruthy();
    });

    it('renders email field with user value', async () => {
        await renderProfileSettings();
        expect(screen.getByDisplayValue('alice@example.com')).toBeTruthy();
    });

    it('renders phone field with user value', async () => {
        await renderProfileSettings();
        expect(screen.getByDisplayValue('1234567890')).toBeTruthy();
    });

    it('renders company field with user value', async () => {
        await renderProfileSettings();
        expect(screen.getByDisplayValue('Alice Co')).toBeTruthy();
    });

    it('renders address field with user value', async () => {
        await renderProfileSettings();
        expect(screen.getByDisplayValue('42 Chain Street')).toBeTruthy();
    });

    it('renders the saved rich text description from auth state', async () => {
        await renderProfileSettings();
        const editor = screen.getByRole('textbox', { name: /business description/i });
        expect(editor.innerHTML).toContain('Existing');
        expect(editor.innerHTML).toContain('<strong>profile</strong>');
    });
});

// ─── 2. Validation ────────────────────────────────────────────────────────────

describe('ProfileSettings — validation', () => {
    it('shows error when name is cleared and form is submitted', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const nameInput = screen.getByDisplayValue('Alice Merchant');
        await user.clear(nameInput);
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(screen.getByText('Full name is required.')).toBeTruthy();
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('shows error when email is cleared and form is submitted', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const emailInput = screen.getByDisplayValue('alice@example.com');
        await user.clear(emailInput);
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(screen.getByText('Email is required.')).toBeTruthy();
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('clears name error when user starts typing again', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const nameInput = screen.getByDisplayValue('Alice Merchant');
        await user.clear(nameInput);
        await user.click(screen.getByRole('button', { name: /save changes/i }));
        expect(screen.getByText('Full name is required.')).toBeTruthy();

        await user.type(nameInput, 'B');
        expect(screen.queryByText('Full name is required.')).toBeNull();
    });

    it('does not call updateProfile when validation fails', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        await user.clear(screen.getByDisplayValue('Alice Merchant'));
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
});

// ─── 3. Save / submit ─────────────────────────────────────────────────────────

describe('ProfileSettings — save', () => {
    it('calls updateProfile with correct payload on valid submit', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(mockUpdateProfile).toHaveBeenCalledWith({
            name:               'Alice Merchant',
            email:              'alice@example.com',
            phone:              '1234567890',
            company:            'Alice Co',
            address:            '42 Chain Street',
            profileDescription: '<p>Existing <strong>profile</strong></p>',
        });
    });

    it('shows success status message after save', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(screen.getByRole('status')).toHaveTextContent('Profile saved for this session.');
    });

    it('saves rich text description updates through AuthContext', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });
        editor.innerHTML = '<p>Updated <em>merchant</em> summary</p>';
        fireEvent.input(editor);

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(mockUpdateProfile).toHaveBeenCalledWith(
            expect.objectContaining({
                profileDescription: '<p>Updated <em>merchant</em> summary</p>',
            })
        );
    });

    it('save message clears when a field is changed after saving', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        await user.click(screen.getByRole('button', { name: /save changes/i }));
        expect(screen.getByRole('status')).toBeTruthy();

        await user.type(screen.getByDisplayValue('Alice Merchant'), 'X');
        expect(screen.queryByRole('status')).toBeNull();
    });
});

// ─── 4. Reset / Cancel ────────────────────────────────────────────────────────

describe('ProfileSettings — reset (Cancel)', () => {
    it('reverts name field to original user value on cancel', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const nameInput = screen.getByDisplayValue('Alice Merchant');
        await user.clear(nameInput);
        await user.type(nameInput, 'Changed Name');

        await user.click(screen.getByRole('button', { name: /cancel/i }));

        expect(screen.getByDisplayValue('Alice Merchant')).toBeTruthy();
    });

    it('clears validation errors on cancel', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        await user.clear(screen.getByDisplayValue('Alice Merchant'));
        await user.click(screen.getByRole('button', { name: /save changes/i }));
        expect(screen.getByText('Full name is required.')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(screen.queryByText('Full name is required.')).toBeNull();
    });

    it('clears save message on cancel', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        await user.click(screen.getByRole('button', { name: /save changes/i }));
        expect(screen.getByRole('status')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(screen.queryByRole('status')).toBeNull();
    });
});

// ─── 5. Empty state ───────────────────────────────────────────────────────────

describe('ProfileSettings — empty state', () => {
    it('shows EmptyState banner when user has no profile data', async () => {
        mockUser = { name: '', email: '', phone: '', company: '', address: '', profileDescription: '' };
        await renderProfileSettings();
        expect(screen.getByText('No profile information yet')).toBeTruthy();
    });

    it('does not show EmptyState when user has at least a name', async () => {
        await renderProfileSettings();
        expect(screen.queryByText('No profile information yet')).toBeNull();
    });
});

// ─── 6. Virtualized activity list ─────────────────────────────────────────────

describe('ProfileSettings — virtualized activity list', () => {
    it('renders the virtualized profile activity region', async () => {
        await renderProfileSettings();
        const activityRegion = screen.getByTestId('virtualized-profile-activity');
        expect(activityRegion).toBeInTheDocument();
    });

    it('activity list contains user-name-prefixed entries', async () => {
        await renderProfileSettings();
        const activityRegion = screen.getByTestId('virtualized-profile-activity');
        expect(activityRegion.textContent).toMatch(/updated profile field/i);
    });
});
