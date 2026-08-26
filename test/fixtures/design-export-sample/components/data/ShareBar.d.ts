/**
 * Inline relative-share bar cell: a small fill bar plus an optional bold figure.
 */
export interface ShareBarProps {
  /** Track mode: percent fill of the 70px track. No-track mode: the bar's own pixel length. */
  width?: number | string;
  /** Bold figure beside the bar, e.g. "38.2%". Omit for a bar-only cell. */
  value?: React.ReactNode;
  /** default/primary = gradient (leaders), accent = blue ramp (mid-tier), dim = gray (trailing). */
  emphasis?: 'default' | 'primary' | 'accent' | 'dim';
  /** Drop the track so the bar's pixel length itself encodes magnitude. */
  noTrack?: boolean;
}
export function ShareBar(props: ShareBarProps): JSX.Element;
