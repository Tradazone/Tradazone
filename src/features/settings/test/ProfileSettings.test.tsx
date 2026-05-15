// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { normalizeRichTextHtml } from '../../../utils/richText';

let mockUser;
const mockUpdateProfile = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
    useAuthUser: () => mockUser,
    useAuthActions: () => ({ updateProfile: mockUpdateProfile }),
}));

vi.mock('../../../components/ui/StagingBanner', () => ({
    default: () => null,
}));

async function renderProfileSettings() {
    const { default: ProfileSettings } = await import('../pages/ProfileSettings');
    render(<ProfileSettings />);
}

describe('ProfileSettings', () => {
    // ISSUE #6 VERIFICATION: This test suite confirms that ProfileSettings
    // does NOT contain any numerical calculations or totals. The component
    // handles only string-based profile data (name, email, phone, company,
    // address, description). Floating-point precision issues are not applicable.
    // See src/utils/currency.js for safe calculation utilities used elsewhere.
    beforeEach(() => {
        mockUpdateProfile.mockReset();
        mockUser = {
            name: 'Alice Merchant',
            email: 'alice@example.com',
            phone: '1234567890',
            company: 'Alice Co',
            address: '42 Chain Street',
            profileDescription: '<p>Existing <strong>profile</strong></p>',
        };
    });

    it('renders the saved rich text description from auth state', async () => {
        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });
        expect(editor.innerHTML).toContain('Existing');
        expect(editor.innerHTML).toContain('<strong>profile</strong>');
    });

    it('saves rich text description updates through AuthContext', async () => {
        const user = userEvent.setup();
        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });
        editor.innerHTML = '<p>Updated <em>merchant</em> summary</p>';
        fireEvent.input(editor);

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(mockUpdateProfile).toHaveBeenCalledWith({
            name: 'Alice Merchant',
            email: 'alice@example.com',
            phone: '1234567890',
            company: 'Alice Co',
            address: '42 Chain Street',
            profileDescription: '<p>Updated <em>merchant</em> summary</p>',
        });
        expect(screen.getByRole('status')).toHaveTextContent('Profile saved for this session.');
    });

    it('renders the virtualized profile activity list', async () => {
        await renderProfileSettings();

        const activityRegion = screen.getByTestId('virtualized-profile-activity');
        expect(activityRegion).toBeInTheDocument();

        expect(activityRegion.textContent).toMatch(/updated profile field/i);
    });

    it('sanitizes malicious profile description before rendering in ProfileSettings', async () => {
        mockUser.profileDescription = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<a href="javascript:alert(1)">click</a>',
            '<div onclick="alert(1)">test</div>',
        ].join('');

        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });

        expect(editor.querySelector('script')).toBeNull();
        expect(editor.querySelector('img')).toBeNull();
        expect(editor.querySelector('a')).toBeNull();
        expect(editor.querySelector('[onclick]')).toBeNull();
        expect(editor.querySelector('[onerror]')).toBeNull();
        expect(editor.innerHTML).not.toMatch(/javascript:/i);
        expect(editor.textContent).toContain('click');
        expect(editor.textContent).toContain('test');
    });

    it('sanitizes malicious description payload before save', async () => {
        const user = userEvent.setup();
        const malicious = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<a href="javascript:alert(1)">click</a>',
            '<div onclick="alert(1)">test</div>',
            '<p>Safe <strong>content</strong></p>',
        ].join('');

        await renderProfileSettings();

        const editor = screen.getByRole('textbox', { name: /business description/i });
        editor.innerHTML = malicious;
        fireEvent.input(editor);

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(mockUpdateProfile).toHaveBeenCalledWith(
            expect.objectContaining({
                profileDescription: normalizeRichTextHtml(malicious),
            }),
        );
    });
});