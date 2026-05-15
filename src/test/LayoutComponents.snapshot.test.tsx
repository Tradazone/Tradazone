// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Layout from '../components/layout/Layout';

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
    },
    logout: vi.fn(),
  }),
}));

describe('Layout Components Snapshots', () => {
  describe('Header Component', () => {
    it('should match snapshot for default header', () => {
      const { container } = render(
        <MemoryRouter>
          <Header onMenuToggle={() => {}} />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for header with menu toggle', () => {
      const mockToggle = vi.fn();
      const { container } = render(
        <MemoryRouter>
          <Header onMenuToggle={mockToggle} />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Sidebar Component', () => {
    it('should match snapshot for open sidebar', () => {
      const { container } = render(
        <MemoryRouter>
          <Sidebar open={true} onClose={() => {}} />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for closed sidebar', () => {
      const { container } = render(
        <MemoryRouter>
          <Sidebar open={false} onClose={() => {}} />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('BottomNav Component', () => {
    it('should match snapshot for bottom navigation', () => {
      const { container } = render(
        <MemoryRouter>
          <BottomNav />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Layout Component', () => {
    it('should match snapshot for default layout', () => {
      const { container } = render(
        <MemoryRouter>
          <Layout />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
