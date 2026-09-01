export interface ComparisonColumn {
  key: string;
  label: React.ReactNode;
  /** Per-column text alignment; left by default. */
  align?: 'left' | 'center' | 'right';
}
/**
 * Horizontally-scrollable vendor comparison table with a gradient header row.
 */
export interface ComparisonTableProps {
  /** Column definitions, in order. The first column is styled as the row identity. */
  columns?: ComparisonColumn[];
  /** Row objects keyed by column key. Cell values may be ShareBar/TrendIndicator/Badge elements. */
  rows?: Record<string, React.ReactNode>[];
}
export function ComparisonTable(props: ComparisonTableProps): JSX.Element;
