// @ts-nocheck
/**
 * Mobile Layout Overflow Tests
 * 
 * Tests to prevent regressions in mobile layout overflow issues.
 * Covers main layout components, tables, and responsive containers.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import DataTable from '../components/tables/DataTable';
import Home from '../pages/dashboard/Home';
import InvoicePreview from '../pages/invoices/InvoicePreview';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ThemeProvider } from '../context/ThemeContext';

// Mock viewport size
const mockViewport = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Test wrapper with providers
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Mobile Layout Overflow Tests', () => {
  const mobileViewports = [320, 375, 390, 430];

  beforeEach(() => {
    // Reset to default viewport before each test
    mockViewport(1024);
  });

  afterEach(() => {
    // Reset to desktop viewport after each test
    mockViewport(1024);
  });

  describe('Main Layout Container', () => {
    it.each(mobileViewports)('should not exceed viewport width at %dpx', (width) => {
      mockViewport(width);
      
      const { container } = render(<Layout />, { wrapper: TestWrapper });

      // Get the main container element
      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toBeTruthy();
      
      // Check that container doesn't exceed viewport width
      const containerWidth = mainContainer?.scrollWidth || 0;
      expect(containerWidth).toBeLessThanOrEqual(width);
    });
  });

  describe('Home Page Layout', () => {
    it.each(mobileViewports)('should adapt to mobile viewport at %dpx', (width) => {
      mockViewport(width);
      
      render(<Home />, { wrapper: TestWrapper });

      // Check that main container exists and is responsive
      const mainContainer = document.querySelector('[class*="max-w-none"]');
      expect(mainContainer).toBeTruthy();
      
      // Verify responsive classes are applied
      expect(mainContainer).toHaveClass('w-full', 'max-w-none', 'lg:max-w-[1100px]');
    });
  });

  describe('DataTable Responsive Behavior', () => {
    const mockColumns = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'amount', header: 'Amount' },
      { key: 'status', header: 'Status' },
    ];

    const mockData = [
      { id: '1', name: 'Test Item', amount: '100', status: 'active' },
      { id: '2', name: 'Another Item', amount: '200', status: 'pending' },
    ];

    it.each(mobileViewports)('should have horizontal scroll wrapper at %dpx', (width) => {
      mockViewport(width);
      
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={() => {}}
        />
      );

      // Check that table has horizontal scroll wrapper
      const scrollWrapper = document.querySelector('.overflow-x-auto');
      expect(scrollWrapper).toBeTruthy();
      
      // Check that table has responsive minimum width
      const table = document.querySelector('table');
      expect(table).toBeTruthy();
      expect(table).toHaveClass('min-w-[500px]', 'sm:min-w-[600px]');
    });

    it('should maintain table functionality on mobile', () => {
      mockViewport(375);
      
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={() => {}}
        />
      );

      // Verify table structure is intact
      expect(screen.getByText('ID')).toBeTruthy();
      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByText('Test Item')).toBeTruthy();
      
      // Check that scroll wrapper allows horizontal scrolling
      const scrollWrapper = document.querySelector('.overflow-x-auto');
      expect(scrollWrapper).toHaveClass('-webkit-overflow-scrolling-touch');
    });
  });

  describe('Invoice Preview Responsive Layout', () => {
    it.each(mobileViewports)('should render without errors at %dpx', (width) => {
      mockViewport(width);
      
      expect(() => {
        render(<InvoicePreview />, { wrapper: TestWrapper });
      }).not.toThrow();
    });
  });

  describe('Navigation Components', () => {
    it.each(mobileViewports)('should not overflow on mobile at %dpx', (width) => {
      mockViewport(width);
      
      const { container } = render(<Layout />, { wrapper: TestWrapper });

      // Check header
      const header = container.querySelector('header');
      expect(header).toBeTruthy();
      const headerWidth = header?.scrollWidth || 0;
      expect(headerWidth).toBeLessThanOrEqual(width);

      // Check bottom navigation (mobile only)
      const bottomNav = container.querySelector('.lg:hidden');
      if (bottomNav) {
        const navWidth = bottomNav.scrollWidth;
        expect(navWidth).toBeLessThanOrEqual(width);
      }
    });
  });
});
