// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivateRoute from '../components/routing/PrivateRoute';

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  loadSession: vi.fn(),
}));

// Import the mocked functions
import { useAuth, loadSession } from '../context/AuthContext';

describe('Routing Components Snapshots', () => {
  describe('PrivateRoute Component', () => {
    it('should match snapshot when user is authenticated and session is valid', () => {
      useAuth.mockReturnValue({
        user: { isAuthenticated: true },
        logout: vi.fn(),
      });
      loadSession.mockReturnValue({ token: 'valid-token' });

      const { container } = render(
        <MemoryRouter>
          <PrivateRoute>
            <div>Protected Content</div>
          </PrivateRoute>
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot when user is not authenticated', () => {
      useAuth.mockReturnValue({
        user: { isAuthenticated: false },
        logout: vi.fn(),
      });
      loadSession.mockReturnValue(null);

      const { container } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <PrivateRoute>
            <div>Protected Content</div>
          </PrivateRoute>
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot when session is expired', () => {
      useAuth.mockReturnValue({
        user: { isAuthenticated: true },
        logout: vi.fn(),
      });
      loadSession.mockReturnValue(null);

      const { container } = render(
        <MemoryRouter initialEntries={['/invoices']}>
          <PrivateRoute>
            <div>Protected Content</div>
          </PrivateRoute>
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with different redirect paths', () => {
      useAuth.mockReturnValue({
        user: { isAuthenticated: false },
        logout: vi.fn(),
      });
      loadSession.mockReturnValue(null);

      const { container } = render(
        <MemoryRouter initialEntries={['/settings/profile']}>
          <PrivateRoute>
            <div>Protected Content</div>
          </PrivateRoute>
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
