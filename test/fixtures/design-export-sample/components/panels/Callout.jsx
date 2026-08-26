import React from 'react';

export function Callout({ label, variant = 'default', children }) {
  return (
    <div className={'callout-box' + (variant === 'melon' ? ' callout-box--melon' : '')}>
      {label ? <div className="callout-box-label">{label}</div> : null}
      <p className="callout-box-body">{children}</p>
    </div>
  );
}
