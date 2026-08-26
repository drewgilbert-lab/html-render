import React from 'react';

export function ShareBar({ width, value, emphasis = 'default', noTrack = false }) {
  const fillCls = ['share-bar-fill', emphasis !== 'default' ? emphasis : ''].filter(Boolean).join(' ');
  return (
    <span className={'share-bar' + (noTrack ? ' no-track' : '')}>
      {noTrack
        ? <span className={fillCls} style={{ width: typeof width === 'number' ? width + 'px' : width }}></span>
        : <span className="share-bar-track"><span className={fillCls} style={{ width: typeof width === 'number' ? width + '%' : width }}></span></span>}
      {value != null ? <span className="share-bar-value">{value}</span> : null}
    </span>
  );
}
