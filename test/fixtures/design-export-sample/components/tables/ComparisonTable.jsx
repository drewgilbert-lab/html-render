import React from 'react';

// columns: [{ key, label, align }]  rows: [{ [key]: ReactNode }] — first column renders as the vendor name.
export function ComparisonTable({ columns = [], rows = [] }) {
  const firstKey = columns.length ? columns[0].key : null;
  return (
    <>
      <div className="table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              {columns.map(c => <th key={c.key} style={c.align ? { textAlign: c.align } : undefined}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key}
                      className={c.key === firstKey ? 'vendor-name' : undefined}
                      style={c.align ? { textAlign: c.align } : undefined}>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
