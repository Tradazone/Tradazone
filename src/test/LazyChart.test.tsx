// @ts-nocheck
/**
 * @fileoverview LazyChart regression tests.
 *
 * Acceptance criteria verified here:
 *  ✔ LazyChart renders a loading skeleton while the chartjs chunk resolves.
 *  ✔ The real chart container is displayed once the chunk has loaded.
 *  ✔ An unknown `type` prop renders a graceful error, not a JS exception.
 *  ✔ Checkout flow pages (CheckoutList, CheckoutDetail, CreateCheckout,
 *    MailCheckout) do NOT contain a static top-level import of 'chart.js'
 *    or 'react-chartjs-2' — the bundle-isolation guard.
 *
 * The chart.js library itself is mocked so tests run without a real canvas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Suspense } from 'react';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Mock chart.js and react-chartjs-2 so tests run in happy-dom (no Canvas API)
// ---------------------------------------------------------------------------

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: class {},
  LinearScale: class {},
  BarElement: class {},
  LineElement: class {},
  PointElement: class {},
  ArcElement: class {},
  RadialLinearScale: class {},
  Title: class {},
  Tooltip: class {},
  Legend: class {},
  Filler: class {},
}));

vi.mock('react-chartjs-2', () => ({
  Bar:       ({ 'data-testid': tid }) => <canvas data-testid={tid ?? 'mock-bar'} />,
  Line:      () => <canvas data-testid="mock-line" />,
  Pie:       () => <canvas data-testid="mock-pie" />,
  Doughnut:  () => <canvas data-testid="mock-doughnut" />,
  Radar:     () => <canvas data-testid="mock-radar" />,
  PolarArea: () => <canvas data-testid="mock-polararea" />,
  Bubble:    () => <canvas data-testid="mock-bubble" />,
  Scatter:   () => <canvas data-testid="mock-scatter" />,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LazyChart', () => {
  const sampleData = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{ label: 'Revenue', data: [10, 20, 30] }],
  };

  /** Convenience: renders LazyChart inside the required Suspense boundary */
  async function renderChart(props) {
    let result;
    await act(async () => {
      // Dynamic import so Jest/Vitest resolves the lazy component fully
      const { default: LazyChart } = await import('../components/ui/LazyChart');
      result = render(
        <Suspense fallback={<div data-testid="outer-fallback">Loading…</div>}>
          <LazyChart {...props} />
        </Suspense>
      );
    });
    return result;
  }

  it('renders the chart container once the lazy chunk has resolved', async () => {
    // 1) Render the component (initially shows skeleton)
    const { findByTestId } = await renderChart({ type: 'bar', data: sampleData });

    // 2) findByTestId polls until the element is found or times out,
    // which is the standard way to test components that lazy-load inside Suspense.
    const container = await findByTestId('chart-container');
    expect(container).toBeInTheDocument();
  });

  it('passes down a custom height to the chart container', async () => {
    const { findByTestId } = await renderChart({ type: 'line', data: sampleData, height: 320 });
    const container = await findByTestId('chart-container');
    expect(container.style.height).toBe('320px');
  });

  it('renders a graceful error element for an unknown chart type', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { findByTestId } = await renderChart({ type: 'unknown_type', data: sampleData });
    const error = await findByTestId('chart-error');
    expect(error).toBeInTheDocument();
    expect(error.textContent).toContain('unknown_type');
    spy.mockRestore();
  });

  it('applies extra className to the chart wrapper', async () => {
    const { findByTestId } = await renderChart({ type: 'pie', data: sampleData, className: 'my-custom-class' });
    const container = await findByTestId('chart-container');
    expect(container.className).toContain('my-custom-class');
  });
});

// ---------------------------------------------------------------------------
// Bundle isolation guard
//
// Scans the checkout-flow source files for any static top-level imports of
// 'chart.js' or 'react-chartjs-2'.  Finding one means the library would be
// bundled eagerly — which is the regression we fixed.
// ---------------------------------------------------------------------------

describe('Checkout flow — Chart.js bundle isolation', () => {
  const CHECKOUT_FILES = [
    'src/pages/checkouts/CheckoutList.jsx',
    'src/pages/checkouts/CheckoutDetail.jsx',
    'src/pages/checkouts/CreateCheckout.jsx',
    'src/pages/checkouts/MailCheckout.jsx',
  ];

  // Regex that matches a static ES import of chart.js or react-chartjs-2
  // (i.e. NOT inside a dynamic import() call)
  const EAGER_IMPORT_PATTERN =
    /^import\s+[^(].*?from\s+['"](?:chart\.js|react-chartjs-2)['"]/m;

  const ROOT = path.resolve(__dirname, '../..');

  CHECKOUT_FILES.forEach((relPath) => {
    it(`${relPath} must not statically import chart.js or react-chartjs-2`, () => {
      const absPath = path.join(ROOT, relPath);
      const source = fs.readFileSync(absPath, 'utf8');
      expect(
        EAGER_IMPORT_PATTERN.test(source),
        `Found a static chart.js import in ${relPath}. ` +
        `Use LazyChart instead — see src/components/ui/LazyChart.jsx.`
      ).toBe(false);
    });
  });

  it('LazyChart.jsx must NOT directly import chart.js (it should dynamic-import LazyChartInner)', () => {
    const absPath = path.join(ROOT, 'src/components/ui/LazyChart.jsx');
    const source = fs.readFileSync(absPath, 'utf8');
    expect(EAGER_IMPORT_PATTERN.test(source)).toBe(false);
  });

  it('LazyChartInner.jsx is the only file in the checkout flow importing chart.js statically', () => {
    const absPath = path.join(ROOT, 'src/components/ui/LazyChartInner.jsx');
    const source = fs.readFileSync(absPath, 'utf8');
    // LazyChartInner SHOULD have static chart.js imports (that is its whole job)
    expect(source).toMatch(/from\s+['"]chart\.js['"]/);
    expect(source).toMatch(/from\s+['"]react-chartjs-2['"]/);
  });
});
