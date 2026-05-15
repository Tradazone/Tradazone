// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Trash2, Download } from 'lucide-react';
// @ts-ignore — Button.tsx uses @ts-nocheck
import Button from '../components/forms/Button';

const meta: Meta = {
  title:     'Components/Button',
  component: Button,
  tags:      ['autodocs'],
  argTypes: {
    variant:  { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size:     { control: 'select', options: ['small', 'medium', 'large'] },
    disabled: { control: 'boolean' },
    loading:  { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story       = { args: { children: 'Create Invoice', variant: 'primary' } };
export const Secondary: Story     = { args: { children: 'Cancel', variant: 'secondary' } };
export const Danger: Story        = { args: { children: 'Delete', variant: 'danger', icon: Trash2 } };
export const Ghost: Story         = { args: { children: 'View', variant: 'ghost' } };
export const WithIcon: Story      = { args: { children: 'Add Customer', variant: 'primary', icon: Plus } };
export const Loading: Story       = { args: { children: 'Saving…', variant: 'primary', loading: true } };
export const Disabled: Story      = { args: { children: 'Confirm', variant: 'primary', disabled: true } };
export const SmallSecondary: Story = { args: { children: 'Download', variant: 'secondary', size: 'small', icon: Download } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" loading>Loading</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};
