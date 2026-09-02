import React from 'react';

// rows for 'single':  [{ label, width, value, emphasis }]  emphasis: 'default'|'accent'|'dim'
// rows for 'stacked': [{ label, value, segments: [{ width, series }] }]  series: 's1'|'s2'|'s3'|'dim'
// rows for 'grouped': [{ label, value, bars: [{ width, series }] }]
// legend: [{ label, series }]
export function BarChart({ variant = 'single', title, subtitle, dateBadge, rows = [], legend = [], source, downloadLabel = 'Download data ↓', downloadHref = '#' }) {
  return (
    <div className="chart-wrapper">
      <div className="chart-title-row">
        <div className="chart-title">
          {title}
          {subtitle ? <><br /><span style={{ fontWeight: 400, fontSize: 13, color: 'var(--hg-text-light)' }}>{subtitle}</span></> : null}
        </div>
        {dateBadge ? <span className="chart-date-badge">{dateBadge}</span> : null}
      </div>
      {legend.length ? (
        <div className="bar-legend">
          {legend.map((l, i) => (
            <span className="bar-legend-item" key={i}>
              <span className={'bar-legend-swatch ' + l.series}></span>{l.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className={'bar-chart' + (variant === 'single' ? '' : ' ' + variant)}>
        {rows.map((row, i) => (
          <div className="bar-row" key={i}>
            <div className="bar-label">{row.label}</div>
            {variant === 'grouped' ? (
              <div className="bar-group">
                {(row.bars || []).map((b, j) => (
                  <div className={'bar-subbar ' + b.series} style={{ width: b.width + '%' }} key={j}></div>
                ))}
              </div>
            ) : (
              <div className="bar-track">
                {variant === 'stacked'
                  ? (row.segments || []).map((s, j) => (
                      <div className={'bar-seg ' + s.series} style={{ width: s.width + '%' }} title={s.title} key={j}></div>
                    ))
                  : <div className={'bar-fill' + (row.emphasis && row.emphasis !== 'default' ? ' ' + row.emphasis : '')} style={{ width: row.width + '%' }}></div>}
              </div>
            )}
            <div className="bar-value">{row.value}</div>
          </div>
        ))}
      </div>
      {(source || downloadLabel) ? (
        <div className="chart-footer">
          <span>{source}</span>
          {downloadLabel ? <a href={downloadHref}>{downloadLabel}</a> : null}
        </div>
      ) : null}
    </div>
  );
}
