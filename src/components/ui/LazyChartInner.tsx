// @ts-nocheck
/**
 * @fileoverview LazyChartInner — real Chart.js import boundary.
 *
 * This file is intentionally separate from LazyChart.jsx so that the
 * `import('./LazyChartInner')` dynamic import in LazyChart.jsx creates
 * a clean code-split boundary that Rollup/Vite can assign to the
 * `chartjs` manual chunk (vite.config.js).
 *
 * ALL Chart.js and react-chartjs-2 imports MUST stay in this file (or files
 * it imports).  Importing from 'chart.js' or 'react-chartjs-2' in any other
 * checkout-flow file will collapse the split and re-introduce the regression.
 *
 * @module LazyChartInner
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import {
  Bar,
  Line,
  Pie,
  Doughnut,
  Radar,
  PolarArea,
  Bubble,
  Scatter,
} from 'react-chartjs-2';

// Register all components once; fine inside a lazy chunk because this module
// is only evaluated after the chartjs chunk has been fetched.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

/** Maps Chart.js chart-type string to the corresponding react-chartjs-2 component. */
const CHART_COMPONENTS = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
  polarArea: PolarArea,
  bubble: Bubble,
  scatter: Scatter,
};

/**
 * Inner implementation of LazyChart.
 * Rendered only after the chartjs chunk has been dynamically loaded.
 *
 * @param {Object} props
 * @param {string} props.type
 * @param {Object} props.data
 * @param {Object} [props.options]
 * @param {number} [props.height]
 * @param {string} [props.className]
 */
function LazyChartInner({ type, data, options, height = 260, className = '' }) {
  const ChartComponent = CHART_COMPONENTS[type];

  if (!ChartComponent) {
    console.error(
      `[LazyChart] Unknown chart type: "${type}". ` +
      `Valid types: ${Object.keys(CHART_COMPONENTS).join(', ')}.`
    );
    return (
      <div
        data-testid="chart-error"
        className="w-full rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-sm text-red-600"
        style={{ height }}
      >
        Unknown chart type: &quot;{type}&quot;
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height }} data-testid="chart-container">
      <ChartComponent
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          ...options,
        }}
      />
    </div>
  );
}

export default LazyChartInner;
