/**
 * The everyday tinted aside: "Why It Matters", a note, a pro-tip, or a melon-accented caution.
 */
export interface CalloutProps {
  /** Optional uppercase kicker. Omit for an unlabelled note. */
  label?: React.ReactNode;
  /** default = dark-blue accent on --grad-subtle; melon = warning/caution. */
  variant?: 'default' | 'melon';
  children?: React.ReactNode;
}
export function Callout(props: CalloutProps): JSX.Element;
