import React from 'react';

const CHECK = (
  <svg viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// items: [{ lead, text, attribution }]
export function KeyInsights({ label = 'Analyst Insights', title, items = [] }) {
  return (
    <div className="insights-panel">
      <div className="insights-panel-label">{label}</div>
      {title ? <h3>{title}</h3> : null}
      <div className="insight-list">
        {items.map((item, i) => (
          <div className="insight-item" key={i}>
            <div className="insight-icon">{CHECK}</div>
            <div>
              <p className="insight-text">
                {item.lead ? <strong>{item.lead}</strong> : null}{item.lead ? ' ' : null}{item.text}
              </p>
              {item.attribution ? <div className="insight-attribution">{item.attribution}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
