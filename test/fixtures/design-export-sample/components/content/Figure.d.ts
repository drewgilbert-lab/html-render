/**
 * Wrapper for an image, diagram, or screenshot with an optional caption — and a dashed draft placeholder.
 */
export interface FigureProps {
  src?: string;
  alt?: string;
  /** Short italic caption, e.g. "Figure 1. CRM install share, Q2 2026." */
  caption?: React.ReactNode;
  /** Placeholder label shown when `src` is absent. Defaults to "[IMAGE NEEDED]". */
  placeholder?: React.ReactNode;
}
export function Figure(props: FigureProps): JSX.Element;
