// @ts-nocheck
/**
 * @fileoverview LazyChart — lazy-loaded Chart.js wrapper for the Checkout flow.
 *
 * PERFORMANCE FIX: Chart.js was previously bundled eagerly into the main chunk,
 * inflating the initial JS payload by ~200 KB (gzip) for every page load —
 * including pages that never render a chart (CheckoutList, CheckoutDetail, etc.).
 *
 * This component is the **single, controlled entry point** for Chart.js in the
 * checkout flow.  All Chart.js imports live inside a `React.lazy` dynamic import
 * so Vite/Rollup can split them into the dedicated `chartjs` chunk defined in
 * vite.config.js.  The chunk is fetched from the network only when a <LazyChart>
 * is actually mounted — meaning users who never visit a chart-heavy screen pay
 * zero cost.
 *
 * Usage (checkout flow):
 *   import LazyChart from '../../components/ui/LazyChart';
 *
 *   <LazyChart type="bar" data={chartData} options={chartOptions} />
 *
 * Supported `type` values mirror react-chartjs-2: 'bar' | 'line' | 'pie' |
 * 'doughnut' | 'radar' | 'polarArea' | 'bubble' | 'scatter'.
 *
 * @module LazyChart
 */

import { lazy, Suspense } from 'react';

// ---------------------------------------------------------------------------
// Inner component — lives inside a separate dynamic-import boundary.
// Vite resolves this as the `chartjs` manual chunk (see vite.config.js).
// ---------------------------------------------------------------------------

const ChartInner = lazy(() =>
  import('./LazyChartInner')
);

// ---------------------------------------------------------------------------
// Fallback UI while the chartjs chunk is being fetched.
// Sized to prevent layout shift by matching the expected chart area.
// ---------------------------------------------------------------------------

function ChartSkeleton({ height = 260 }) {
  return (
    <div
      data-testid="chart-skeleton"
      style={{ height }}
      className="w-full rounded-lg bg-gray-100 animate-pulse"
      aria-busy="true"
      aria-label="Loading chart…"
    />
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * LazyChart — renders a Chart.js chart via react-chartjs-2 on demand.
 *
 * @param {Object}  props
 * @param {string}  props.type       - Chart type (bar, line, pie, doughnut, …)
 * @param {Object}  props.data       - Chart.js data object
 * @param {Object}  [props.options]  - Chart.js options object
 * @param {number}  [props.height]   - Skeleton/fallback height in px (default 260)
 * @param {string}  [props.className] - Extra CSS classes for the wrapper div
 */
function LazyChart({ type, data, options, height = 260, className = '' }) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} />}>
      <ChartInner
        type={type}
        data={data}
        options={options}
        height={height}
        className={className}
      />
    </Suspense>
  );
}

export default LazyChart;
