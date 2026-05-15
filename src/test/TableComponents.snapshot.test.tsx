// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import DataTable from '../components/tables/DataTable';
import StatusBadge from '../components/tables/StatusBadge';

describe('Table Components Snapshots', () => {
  describe('DataTable Component', () => {
    const columns = [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'status', header: 'Status' },
    ];

    it('should match snapshot for empty data table', () => {
      const { container } = render(
        <DataTable columns={columns} data={[]} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for data table with one row', () => {
      const data = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
      ];
      const { container } = render(
        <DataTable columns={columns} data={data} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for data table with multiple rows', () => {
      const data = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Pending' },
      ];
      const { container } = render(
        <DataTable columns={columns} data={data} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for data table with custom empty message', () => {
      const { container } = render(
        <DataTable columns={columns} data={[]} emptyMessage="No customers found" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for data table with row click handler', () => {
      const data = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
      ];
      const mockOnRowClick = vi.fn();
      const { container } = render(
        <DataTable columns={columns} data={data} onRowClick={mockOnRowClick} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for data table with custom column width', () => {
      const columnsWithWidth = [
        { key: 'name', header: 'Name', width: '200px' },
        { key: 'email', header: 'Email', width: '250px' },
        { key: 'status', header: 'Status', width: '100px' },
      ];
      const data = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
      ];
      const { container } = render(
        <DataTable columns={columnsWithWidth} data={data} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for data table with custom render function', () => {
      const columnsWithRender = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        {
          key: 'status',
          header: 'Status',
          render: (value) => <StatusBadge status={value} />,
        },
      ];
      const data = [
        { id: 1, name: 'John Doe', email: 'john@example.com', status: 'paid' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'pending' },
      ];
      const { container } = render(
        <DataTable columns={columnsWithRender} data={data} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('StatusBadge Component', () => {
    it('should match snapshot for paid status', () => {
      const { container } = render(<StatusBadge status="paid" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for unpaid status', () => {
      const { container } = render(<StatusBadge status="unpaid" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for pending status', () => {
      const { container } = render(<StatusBadge status="pending" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for overdue status', () => {
      const { container } = render(<StatusBadge status="overdue" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for active status', () => {
      const { container } = render(<StatusBadge status="active" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for inactive status', () => {
      const { container } = render(<StatusBadge status="inactive" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for completed status', () => {
      const { container } = render(<StatusBadge status="completed" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for cancelled status', () => {
      const { container } = render(<StatusBadge status="cancelled" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for draft status', () => {
      const { container } = render(<StatusBadge status="draft" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for unknown status', () => {
      const { container } = render(<StatusBadge status="unknown" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for status with custom className', () => {
      const { container } = render(<StatusBadge status="paid" className="ml-2" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for case-insensitive status', () => {
      const { container } = render(<StatusBadge status="PAID" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
