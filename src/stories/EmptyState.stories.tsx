import type { Meta, StoryObj } from '@storybook/react';
import { FileText, Users, ShoppingCart, Package } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
// @ts-ignore
import EmptyState from '../components/ui/EmptyState';

const meta: Meta = {
  title:     'Components/EmptyState',
  component: EmptyState,
  tags:      ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-lg mx-auto p-8 bg-white border border-gray-200 rounded-lg">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const NoInvoices: Story = {
  args: {
    icon:        FileText,
    title:       'No invoices yet',
    description: 'Create your first invoice and send it to a customer to get paid.',
    actionLabel: 'Create your first invoice',
    actionPath:  '/invoices/create',
  },
};

export const NoCustomers: Story = {
  args: {
    icon:        Users,
    title:       'No customers yet',
    description: 'Add your first customer to start sending invoices and tracking payments.',
    actionLabel: 'Add your first customer',
    actionPath:  '/customers/add',
  },
};

export const NoCheckouts: Story = {
  args: {
    icon:        ShoppingCart,
    title:       'No checkout links yet',
    description: 'Create a checkout link to accept one-click crypto payments from anyone.',
    actionLabel: 'Create your first checkout',
    actionPath:  '/checkout/create',
  },
};

export const NoItems: Story = {
  args: {
    icon:        Package,
    title:       'No items or services yet',
    description: 'Add your products or services to quickly include them in invoices.',
    actionLabel: 'Add your first item',
    actionPath:  '/items/add',
  },
};
