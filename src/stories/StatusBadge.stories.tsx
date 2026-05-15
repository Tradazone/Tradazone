import type { Meta, StoryObj } from '@storybook/react';
// @ts-ignore
import StatusBadge from '../components/tables/StatusBadge';

const meta: Meta = {
  title:     'Components/StatusBadge',
  component: StatusBadge,
  tags:      ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['paid', 'pending', 'sent', 'unpaid', 'overdue', 'active', 'inactive'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Paid: Story     = { args: { status: 'paid' } };
export const Pending: Story  = { args: { status: 'pending' } };
export const Sent: Story     = { args: { status: 'sent' } };
export const Unpaid: Story   = { args: { status: 'unpaid' } };
export const Overdue: Story  = { args: { status: 'overdue' } };
export const Active: Story   = { args: { status: 'active' } };
export const Inactive: Story = { args: { status: 'inactive' } };

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {['paid', 'pending', 'sent', 'unpaid', 'overdue', 'active', 'inactive'].map(s => (
        <StatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};
