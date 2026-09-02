import React from 'react';

const ARROWS = { up: '▲', down: '▼', flat: '→' };

export function TrendIndicator({ direction = 'flat', children }) {
  return <span className={'trend-indicator ' + direction}>{ARROWS[direction]} {children}</span>;
}
