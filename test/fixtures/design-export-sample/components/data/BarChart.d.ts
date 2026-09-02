export interface BarSegment { width: number; series: 's1' | 's2' | 's3' | 'dim'; title?: string; }
export interface BarChartRow {
  label: React.ReactNode;
  /** Printed figure at the right of the row. */
  value?: React.ReactNode;
  /** Bar width as a percentage (single variant). */
  width?: number;
  /** Emphasis ramp: default = dark-blue→purple, accent = blue→light-blue, dim = gray. */
  emphasis?: 'default' | 'accent' | 'dim';
  /** Stacked variant only. */
  segments?: BarSegment[];
  /** Grouped variant only. */
  bars?: BarSegment[];
}
/**
 * The card-framed horizontal bar chart that ranks vendors by one metric, with stacked and grouped variants.
 */
export interface BarChartProps {
  /** Pick one per page: single-metric ranking, part-of-total stack, or series comparison. */
  variant?: 'single' | 'stacked' | 'grouped';
  title?: React.ReactNode;
  /** Small grey line under the title. */
  subtitle?: React.ReactNode;
  /** Pill at the top right, e.g. "Q2 2026". */
  dateBadge?: React.ReactNode;
  rows?: BarChartRow[];
  /** Series legend — required for stacked and grouped. */
  legend?: { label: React.ReactNode; series: 's1' | 's2' | 's3' | 'dim' }[];
  source?: React.ReactNode;
  downloadLabel?: string;
  downloadHref?: string;
}
export function BarChart(props: BarChartProps): JSX.Element;
