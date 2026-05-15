// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Button from '../components/forms/Button';
import Input from '../components/forms/Input';
import Select from '../components/forms/Select';
import Toggle from '../components/forms/Toggle';

describe('Form Components Snapshots', () => {
  describe('Button Component', () => {
    it('should match snapshot for primary variant', () => {
      const { container } = render(<Button>Click me</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for secondary variant', () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for danger variant', () => {
      const { container } = render(<Button variant="danger">Delete</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for ghost variant', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for small size', () => {
      const { container } = render(<Button size="small">Small</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for large size', () => {
      const { container } = render(<Button size="large">Large</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for disabled state', () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for loading state', () => {
      const { container } = render(<Button loading>Loading</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Input Component', () => {
    it('should match snapshot for default input', () => {
      const { container } = render(<Input placeholder="Enter text" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for input with label', () => {
      const { container } = render(<Input label="Email" placeholder="Enter email" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for required input', () => {
      const { container } = render(<Input label="Name" required placeholder="Enter name" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for input with error', () => {
      const { container } = render(<Input label="Email" error="Invalid email" placeholder="Enter email" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for input with hint', () => {
      const { container } = render(<Input label="Password" hint="Must be at least 8 characters" placeholder="Enter password" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for disabled input', () => {
      const { container } = render(<Input label="Username" disabled placeholder="Enter username" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for password input', () => {
      const { container } = render(<Input type="password" label="Password" placeholder="Enter password" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Select Component', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ];

    it('should match snapshot for default select', () => {
      const { container } = render(<Select options={options} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for select with label', () => {
      const { container } = render(<Select label="Choose option" options={options} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for required select', () => {
      const { container } = render(<Select label="Category" required options={options} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for select with error', () => {
      const { container } = render(<Select label="Status" error="Please select a status" options={options} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for disabled select', () => {
      const { container } = render(<Select label="Priority" disabled options={options} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for select with custom placeholder', () => {
      const { container } = render(<Select label="Type" placeholder="Select a type..." options={options} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('Toggle Component', () => {
    it('should match snapshot for unchecked toggle', () => {
      const { container } = render(<Toggle label="Enable notifications" checked={false} onChange={() => {}} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for checked toggle', () => {
      const { container } = render(<Toggle label="Enable notifications" checked={true} onChange={() => {}} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for disabled toggle', () => {
      const { container } = render(<Toggle label="Enable notifications" checked={false} disabled onChange={() => {}} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for toggle without label', () => {
      const { container } = render(<Toggle checked={false} onChange={() => {}} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
