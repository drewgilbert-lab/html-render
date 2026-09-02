/**
 * Directional value cell — arrow plus figure. Positive is blue, negative is melon, never green.
 */
export interface TrendIndicatorProps {
  /** up = --hg-positive (blue), down = --hg-negative (melon), flat = grey. */
  direction?: 'up' | 'down' | 'flat';
  /** The figure, e.g. "+3.1pp". The arrow glyph is supplied for you. */
  children?: React.ReactNode;
}
export function TrendIndicator(props: TrendIndicatorProps): JSX.Element;
