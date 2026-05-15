import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /date$/i } },
    layout: 'centered',
    backgrounds: {
      default: 'page',
      values: [
        { name: 'page',  value: '#F5F6FA' },
        { name: 'white', value: '#FFFFFF' },
        { name: 'dark',  value: '#1E293B' },
      ],
    },
  },
};

export default preview;
