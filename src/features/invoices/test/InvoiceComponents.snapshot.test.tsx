// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import InvoiceHeader from '../components/InvoiceHeader';
import InvoiceFooter from '../components/InvoiceFooter';
import InvoiceSummary from '../components/InvoiceSummary';
import InvoiceTable from '../components/InvoiceTable';
import InvoiceLayout from '../components/InvoiceLayout';

describe('Invoice Components Snapshots', () => {
  describe('InvoiceHeader Component', () => {
    it('should match snapshot for invoice header', () => {
      const { container } = render(<InvoiceHeader />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('InvoiceFooter Component', () => {
    it('should match snapshot for invoice footer with default props', () => {
      const { container } = render(<InvoiceFooter />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice footer with notes', () => {
      const { container } = render(<InvoiceFooter notes="Thank you for your business!" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice footer with payment link', () => {
      const { container } = render(<InvoiceFooter paymentLink="https://pay.example.com/invoice123" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice footer with all props', () => {
      const { container } = render(
        <InvoiceFooter
          notes="Payment due within 30 days"
          paymentLink="https://pay.example.com/invoice456"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('InvoiceSummary Component', () => {
    it('should match snapshot for invoice summary with default values', () => {
      const { container } = render(<InvoiceSummary />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice summary with values', () => {
      const { container } = render(
        <InvoiceSummary subtotal={1000} tax={100} total={1100} currency="STRK" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice summary with different currency', () => {
      const { container } = render(
        <InvoiceSummary subtotal={500} tax={50} total={550} currency="USD" />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('InvoiceTable Component', () => {
    it('should match snapshot for empty invoice table', () => {
      const { container } = render(<InvoiceTable items={[]} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice table with one item', () => {
      const items = [
        { name: 'Web Development', price: '500', quantity: 1 },
      ];
      const { container } = render(<InvoiceTable items={items} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice table with multiple items', () => {
      const items = [
        { name: 'Web Development', price: '500', quantity: 1 },
        { name: 'Design Services', price: '300', quantity: 2 },
        { name: 'Consulting', price: '200', quantity: 3 },
      ];
      const { container } = render(<InvoiceTable items={items} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice table with four items', () => {
      const items = [
        { name: 'Item 1', price: '100', quantity: 1 },
        { name: 'Item 2', price: '200', quantity: 2 },
        { name: 'Item 3', price: '300', quantity: 3 },
        { name: 'Item 4', price: '400', quantity: 4 },
      ];
      const { container } = render(<InvoiceTable items={items} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('InvoiceLayout Component', () => {
    const mockInvoice = {
      id: 'INV-001',
      createdAt: '2024-01-15',
      dueDate: '2024-02-15',
      customer: 'John Doe',
      currency: 'STRK',
      items: [
        { name: 'Web Development', price: '500', quantity: 1 },
        { name: 'Design Services', price: '300', quantity: 2 },
      ],
    };

    const mockCustomer = {
      name: 'John Doe',
      email: 'john@example.com',
      address: '123 Main St, New York, NY 10001',
    };

    const mockSender = {
      name: 'Tradazone',
      email: 'billing@tradazone.com',
    };

    it('should match snapshot for complete invoice layout', () => {
      const { container } = render(
        <InvoiceLayout
          invoice={mockInvoice}
          customer={mockCustomer}
          sender={mockSender}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice layout with minimal data', () => {
      const minimalInvoice = {
        id: 'INV-002',
        createdAt: '2024-01-20',
        dueDate: '2024-02-20',
        customer: 'Jane Smith',
        currency: 'USD',
        items: [],
      };
      const { container } = render(
        <InvoiceLayout
          invoice={minimalInvoice}
          customer={null}
          sender={null}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for invoice layout with single item', () => {
      const singleItemInvoice = {
        id: 'INV-003',
        createdAt: '2024-01-25',
        dueDate: '2024-02-25',
        customer: 'Bob Johnson',
        currency: 'STRK',
        items: [
          { name: 'Consulting', price: '1000', quantity: 1 },
        ],
      };
      const { container } = render(
        <InvoiceLayout
          invoice={singleItemInvoice}
          customer={{ name: 'Bob Johnson', email: 'bob@example.com' }}
          sender={{ name: 'Tradazone', email: 'billing@tradazone.com' }}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
