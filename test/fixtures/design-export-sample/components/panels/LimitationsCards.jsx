import React from 'react';

// items: [{ title, body }]
export function LimitationsCards({ items = [] }) {
  return (
    <div className="limitations-cards">
      {items.map((item, i) => (
        <div className="limit" key={i}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
}
