import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
// @ts-ignore
import LoadingSpinner from '../components/ui/LoadingSpinner';

const meta: Meta = {
  title:     'Components/LoadingSpinner',
  component: LoadingSpinner,
  tags:      ['autodocs'],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InContext: Story = {
  render: () => (
    <div className="flex items-center justify-center min-h-[200px] bg-gray-50">
      <LoadingSpinner />
    </div>
  ),
};
