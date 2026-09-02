/**
 * Sidebar panel of analyst takeaways beside the primary chart: check-icon bullets with attribution.
 */
export interface KeyInsightsProps {
  label?: React.ReactNode;
  title?: React.ReactNode;
  /** Each insight: a bolded lead clause, supporting detail, and a pointer to the backing exhibit. */
  items?: { lead?: React.ReactNode; text?: React.ReactNode; attribution?: React.ReactNode }[];
}
export function KeyInsights(props: KeyInsightsProps): JSX.Element;
