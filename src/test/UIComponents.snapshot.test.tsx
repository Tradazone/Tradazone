// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import EmptyState from '../components/ui/EmptyState';
import { FileText } from 'lucide-react';

describe('UI Components Snapshots', () => {
  describe('Logo Component', () => {
    it('should match snapshot for light variant', () => {
      const { container } = render(<Logo variant="light" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for dark variant', () => {
      const { container } = render(<Logo variant="dark" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with custom className', () => {
      const { container } = render(<Logo variant="light" className="h-10" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('EmptyState Component', () => {
    it('should match snapshot for empty state with icon', () => {
      const { container } = render(
        <MemoryRouter>
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to get started"
            actionLabel="Create Invoice"
            actionPath="/invoices/create"
          />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for empty state without action', () => {
      const { container } = render(
        <MemoryRouter>
          <EmptyState
            icon={FileText}
            title="No items found"
            description="Try adjusting your search criteria"
          />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for empty state without icon', () => {
      const { container } = render(
        <MemoryRouter>
          <EmptyState
            title="No data available"
            description="Check back later for updates"
          />
        </MemoryRouter>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
