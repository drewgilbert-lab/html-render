'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { blocks, page, renderBlock } = require('../src/components');
const { body, pillar } = require('./helpers');

/** Render a single in-flow component block. */
function block(name, data) {
  return renderBlock({ type: 'component', name, data, line: 1 });
}

test('every component declares a contract and a design source', () => {
  for (const component of [...blocks.values(), ...page.values()]) {
    assert.ok(component.summary, `${component.name} has no summary`);
    assert.ok(component.source, `${component.name} has no design source`);
    assert.ok(component.fields && Object.keys(component.fields).length, `${component.name} has no fields`);
    assert.equal(typeof component.render, 'function');
  }
});

test('callout renders both tones', () => {
  assert.match(block('callout', { label: 'Why It Matters', body: 'Because.' }), /class="callout-box"/);
  assert.match(block('callout', { label: 'Watch Out', body: 'Careful.', tone: 'warn' }), /callout-box callout-box--melon/);
});

test('callout label is optional — omitting it renders an unlabelled note', () => {
  const html = block('callout', { body: 'Always check the freshness date.' });
  assert.doesNotMatch(html, /callout-box-label/);
  assert.match(html, /<p class="callout-box-body">Always check the freshness date\.<\/p>/);
});

test('concept-cards renders one card per item', () => {
  const html = block('concept-cards', {
    items: [
      { title: 'One', body: 'First' },
      { title: 'Two', body: 'Second' },
      { title: 'Three', body: 'Third' },
    ],
  });
  assert.equal((html.match(/class="concept-card"/g) || []).length, 3);
  assert.match(html, /<h3 class="concept-card-title">One<\/h3>/);
});

test('quote derives avatar initials and renders an optional reference link', () => {
  const plain = block('quote', { text: 'A claim.', name: 'Devon Marsh', title: 'Director of GEO Research' });
  assert.match(plain, /class="expert-quote-avatar">DM</);
  assert.doesNotMatch(plain, /expert-quote-reference/);

  const linked = block('quote', {
    text: 'A claim.',
    name: 'Devon Marsh',
    title: 'Director',
    initials: 'XX',
    link_text: 'See the method',
    link_url: '/geo/method/',
  });
  assert.match(linked, /class="expert-quote-avatar">XX</);
  assert.match(linked, /<a class="expert-quote-reference" href="\/geo\/method\/">See the method &rarr;<\/a>/);
});

test('process-steps numbers its badges in order', () => {
  const html = block('process-steps', {
    items: [
      { title: 'Fix the prompt set', body: 'Do this first.' },
      { title: 'Name the competitors', body: 'Then this.' },
    ],
  });
  assert.match(html, /class="process-step-badge">1</);
  assert.match(html, /class="process-step-badge">2</);
});

test('bars derives widths from the values, indexed to the largest', () => {
  const html = block('bars', {
    title: 'AI crawler visits',
    items: [
      { label: 'Non-customer', value: '1x' },
      { label: 'Customer', value: '21x' },
      { label: 'Top Rated', value: '31x' },
    ],
  });
  assert.match(html, /width:3%/);
  assert.match(html, /width:68%/);
  assert.match(html, /width:100%/);

  // An explicit share overrides the derived width.
  const explicit = block('bars', {
    items: [
      { label: 'A', value: '1x', share: 10 },
      { label: 'B', value: '99x', share: 50 },
    ],
  });
  assert.match(explicit, /width:10%/);
  assert.match(explicit, /width:50%/);
});

test('benchmark-figure renders only the parts that are supplied', () => {
  const minimal = block('benchmark-figure', { figure: '5.1x', label: 'Higher conversion rate' });
  assert.match(minimal, /class="bf-figure">5\.1x</);
  assert.doesNotMatch(minimal, /bf-compare|bf-tiers|bf-definition|bf-footer/);

  const full = block('benchmark-figure', {
    eyebrow: 'GEO Reporting Benchmark',
    figure: '5.1x',
    label: 'Higher conversion rate',
    compare: {
      left_label: 'AI-referred',
      left_value: '14.2%',
      right_label: 'Google organic',
      right_value: '2.8%',
      delta: '5.1x higher',
      delta_note: 'Averi, March 2026',
    },
    bars: { title: 'Indexed', items: [{ label: 'A', value: '1x' }, { label: 'B', value: '21x' }] },
    definition: { title: 'What these figures measure', body: 'Confirmed crawler visits.' },
    footer: 'Source: TrustRadius internal data.',
  });
  assert.match(full, /class="bf-delta up">&#9650; 5\.1x higher</);
  assert.match(full, /class="bf-definition-title">What these figures measure</);
  assert.match(full, /class="bf-footer">Source: TrustRadius internal data\.</);
});

test('link-card degrades to a non-link card when the page is still in production', () => {
  const live = block('link-card', { tag: 'Cluster Hub', title: 'Core Metrics', description: 'The hub.', url: '/geo/core/' });
  assert.match(live, /^<a class="data-cut-card" href="\/geo\/core\/">/);

  const pending = block('link-card', { tag: 'Cluster Hub', title: 'Core Metrics', description: 'The hub.', status: 'in-production' });
  assert.match(pending, /^<div class="data-cut-card coming-soon">/);
  assert.match(pending, /class="coming-soon-badge">In production, not yet published</);
});

test('related-cards and the related page band share one card implementation', () => {
  const inline = block('related-cards', {
    items: [{ tag: 'Methodology', title: 'How to calculate', url: '/geo/calc/', description: 'The formula.' }],
  });
  assert.match(inline, /class="related-hubs-grid"/);
  assert.match(inline, /class="related-hub-card" href="\/geo\/calc\/"/);
  assert.match(inline, /class="related-hub-link">Read the guide &rarr;</);

  const slot = page.get('related').render({
    eyebrow: 'Keep Going',
    title: 'Where to go next',
    items: [{ tag: 'Methodology', title: 'How to calculate', url: '/geo/calc/', description: 'The formula.', link_text: 'See it' }],
  });
  assert.match(slot, /class="related-hubs-section" id="related"/);
  assert.match(slot, /class="related-hubs-grid"/);
});

test('figure renders an image with an empty-alt fallback and an optional caption', () => {
  const html = block('figure', {
    src: '/assets/chart-crm-share.png',
    alt: 'CRM install share by vendor, Q2 2026',
    caption: 'Figure 1. CRM install share among companies with 500+ employees, Q2 2026.',
  });
  assert.match(html, /^<figure class="figure-block">/);
  assert.match(html, /<img src="\/assets\/chart-crm-share\.png" alt="CRM install share by vendor, Q2 2026">/);
  assert.match(html, /<figcaption class="figure-caption">Figure 1\./);

  const bare = block('figure', { src: '/assets/chart.png' });
  assert.match(bare, /<img src="\/assets\/chart\.png" alt="">/);
  assert.doesNotMatch(bare, /figcaption/);
});

test('figure without a src renders the dashed draft placeholder', () => {
  const draft = block('figure', { caption: 'Figure 2. Pending.' });
  assert.match(draft, /<div class="figure-placeholder"><span class="figure-placeholder-label">\[IMAGE NEEDED\]<\/span><\/div>/);

  const labelled = block('figure', { placeholder: '[IMAGE NEEDED] CRM share chart, Q2 2026' });
  assert.match(labelled, /figure-placeholder-label">\[IMAGE NEEDED\] CRM share chart, Q2 2026</);
});

test('share-bar fills the track by percent and carries its emphasis class', () => {
  const html = block('share-bar', { width: 38.2, value: '38.2%' });
  assert.equal(
    html,
    '<span class="share-bar"><span class="share-bar-track"><span class="share-bar-fill" style="width:38.2%"></span></span><span class="share-bar-value">38.2%</span></span>',
  );

  const accent = block('share-bar', { width: 11.8, value: '11.8%', emphasis: 'accent' });
  assert.match(accent, /class="share-bar-fill accent"/);

  const bare = block('share-bar', { width: 56 });
  assert.doesNotMatch(bare, /share-bar-value/);
});

test('share-bar no_track drops the track and sizes the bar in pixels', () => {
  const html = block('share-bar', { width: 56, value: '38.2%', no_track: true });
  assert.equal(
    html,
    '<span class="share-bar no-track"><span class="share-bar-fill" style="width:56px"></span><span class="share-bar-value">38.2%</span></span>',
  );
});

test('comparison-table renders structure and composes share-bar inside a cell', () => {
  const html = block('comparison-table', {
    columns: [{ label: 'Vendor' }, { label: 'Install Share' }, { label: 'YoY Change', align: 'center' }],
    rows: [
      { cells: ['Salesforce', { share: { width: 38.2, value: '38.2%' } }, '+3.1pp'] },
      { cells: ['SAP CRM', { share: { width: 11.8, value: '11.8%', emphasis: 'dim' } }, '-1.4pp'] },
    ],
  });
  assert.match(html, /^<div class="table-wrapper">/);
  assert.match(html, /<table class="comparison-table">/);
  assert.match(html, /<th style="text-align:center">YoY Change<\/th>/);
  assert.match(html, /<td class="vendor-name">Salesforce<\/td>/);
  assert.match(html, /<td><span class="share-bar"><span class="share-bar-track"><span class="share-bar-fill" style="width:38.2%">/);
  assert.match(html, /share-bar-fill dim/);
  assert.match(html, /<td style="text-align:center">\+3\.1pp<\/td>/);
  // The export removed `caption`; a source line reaches a table only via Markdown.
  assert.doesNotMatch(html, /table-caption/);
  // Only the first column carries the row identity class.
  assert.equal((html.match(/class="vendor-name"/g) || []).length, 2);
});

test('comparison-table composes trend-indicator inside a trend cell', () => {
  const html = block('comparison-table', {
    columns: [{ label: 'Vendor' }, { label: 'YoY Change', align: 'center' }],
    rows: [
      { cells: ['Salesforce', { trend: { direction: 'up', value: '+3.1pp' } }] },
      { cells: ['SAP CRM', { trend: { direction: 'down', value: '-1.4pp' } }] },
      { cells: ['Other', { trend: { value: 'flat' } }] },
    ],
  });
  assert.match(html, /<td style="text-align:center"><span class="trend-indicator up">&#9650; \+3\.1pp<\/span><\/td>/);
  assert.match(html, /<span class="trend-indicator down">&#9660; -1\.4pp<\/span>/);
  assert.match(html, /<span class="trend-indicator flat">&rarr; flat<\/span>/);
});

test('trend-indicator renders standalone with the arrow the direction implies', () => {
  assert.equal(block('trend-indicator', { direction: 'up', value: '+3.1pp' }), '<span class="trend-indicator up">&#9650; +3.1pp</span>');
  assert.equal(block('trend-indicator', { value: 'flat' }), '<span class="trend-indicator flat">&rarr; flat</span>');
});

test('limitations-cards renders one melon-accented card per caveat', () => {
  const html = block('limitations-cards', {
    items: [
      { title: 'Install share is not revenue share', body: 'Broad adoption can mean a small revenue fraction.' },
      { title: 'Geographic signal density varies', body: 'Coverage is strongest in North America.' },
    ],
  });
  assert.match(html, /^<div class="limitations-cards">/);
  assert.equal((html.match(/class="limit"/g) || []).length, 2);
  assert.match(html, /<h3>Install share is not revenue share<\/h3>\s*<p>Broad adoption/);
});

test('key-insights renders the label, an optional title, and check-icon items with attribution', () => {
  const html = block('key-insights', {
    title: 'What the data tells us',
    items: [
      { lead: 'Salesforce is consolidating.', text: 'Install share grew from 35.1% to 38.2% YoY.', attribution: 'See primary chart' },
      { text: 'A finding with no lead clause.' },
    ],
  });
  assert.match(html, /^<div class="insights-panel">/);
  assert.match(html, /<div class="insights-panel-label">Analyst Insights<\/div>/);
  assert.match(html, /<h3>What the data tells us<\/h3>/);
  assert.match(html, /<p class="insight-text"><strong>Salesforce is consolidating\.<\/strong> Install share grew/);
  assert.match(html, /<div class="insight-attribution">See primary chart<\/div>/);
  assert.match(html, /<p class="insight-text">A finding with no lead clause\.<\/p>/);
  assert.equal((html.match(/class="insight-icon"/g) || []).length, 2);
  assert.match(html, /<svg viewBox="0 0 12 12"/);

  const relabelled = block('key-insights', { label: 'Key Takeaways', items: [{ text: 'One.' }] });
  assert.match(relabelled, /insights-panel-label">Key Takeaways</);
  assert.doesNotMatch(relabelled, /<h3>/);
});

test('bar-chart single variant derives widths from values, indexed to the largest, unless width is explicit', () => {
  const html = block('bar-chart', {
    title: 'CRM Install Share',
    subtitle: '500+ employees',
    date_badge: 'Q2 2026',
    rows: [
      { label: 'Salesforce', value: '38.2%' },
      { label: 'HubSpot', value: '11.8%', emphasis: 'accent' },
      { label: 'Other', value: '7.9%', width: 19, emphasis: 'dim' },
    ],
    source: 'Source: HG Insights',
    download_label: 'Download data',
    download_url: '/data/crm.csv',
  });
  assert.match(html, /^<div class="chart-wrapper">/);
  assert.match(html, /<div class="chart-title">CRM Install Share<br><span style="font-weight:400;font-size:13px;color:var\(--hg-text-light\)">500\+ employees<\/span><\/div>/);
  assert.match(html, /<span class="chart-date-badge">Q2 2026<\/span>/);
  assert.match(html, /<div class="bar-chart">/);
  assert.match(html, /<div class="bar-fill" style="width:100%">/);
  assert.match(html, /<div class="bar-fill accent" style="width:31%">/);
  assert.match(html, /<div class="bar-fill dim" style="width:19%">/);
  assert.match(html, /<div class="bar-value">38\.2%<\/div>/);
  assert.match(html, /<div class="chart-footer">\s*<span>Source: HG Insights<\/span>\s*<a href="\/data\/crm\.csv">Download data<\/a>/);
  assert.doesNotMatch(html, /bar-legend/);
});

test('bar-chart stacked and grouped variants carry their series classes and a legend', () => {
  const stacked = block('bar-chart', {
    variant: 'stacked',
    title: 'Spend mix',
    legend: [{ label: 'Software', series: 's1' }, { label: 'Services', series: 's2' }],
    rows: [{ label: 'Enterprise', value: '$1.1T', segments: [{ width: 60, series: 's1', title: 'Software' }, { width: 40, series: 's2' }] }],
  });
  assert.match(stacked, /<div class="bar-chart stacked">/);
  assert.match(stacked, /<span class="bar-legend-item"><span class="bar-legend-swatch s1"><\/span>Software<\/span>/);
  assert.match(stacked, /<div class="bar-track">\s*<div class="bar-seg s1" style="width:60%" title="Software"><\/div>\s*<div class="bar-seg s2" style="width:40%"><\/div>/);

  const grouped = block('bar-chart', {
    variant: 'grouped',
    title: 'Two periods',
    legend: [{ label: '2025', series: 's2' }, { label: '2026', series: 's1' }],
    rows: [{ label: 'Salesforce', value: '+3.1pp', bars: [{ width: 70, series: 's2' }, { width: 82, series: 's1' }] }],
  });
  assert.match(grouped, /<div class="bar-chart grouped">/);
  assert.match(grouped, /<div class="bar-group">\s*<div class="bar-subbar s2" style="width:70%"><\/div>\s*<div class="bar-subbar s1" style="width:82%"><\/div>/);
  assert.doesNotMatch(grouped, /bar-track/);
});

test('a comparison-table row shorter than its columns pads with empty cells', () => {
  const html = block('comparison-table', {
    columns: [{ label: 'Vendor' }, { label: 'Share' }],
    rows: [{ cells: ['Salesforce'] }],
  });
  assert.match(html, /<td class="vendor-name">Salesforce<\/td>\n\s*<td><\/td>/);
});

test('a table in the body renders as the canonical comparison table', () => {
  const source = pillar().replace(
    'A body paragraph in the first section.',
    ['| Dimension | A | B |', '| --- | --- | --- |', '| What | one | two |', 'Source: HG Insights, 2026.'].join('\n'),
  );
  const { html } = body(source);
  assert.match(html, /<div class="table-wrapper">/);
  assert.match(html, /<table class="comparison-table">/);
  assert.match(html, /<td class="vendor-name">What<\/td>/);
  assert.match(html, /<p class="table-caption">Source: HG Insights, 2026\.<\/p>/);
});

test('a blockquote becomes the thesis block and lists get their branded classes', () => {
  const source = pillar().replace(
    'A body paragraph in the first section.',
    ['> A lead statement.', '', '- one', '- two', '', '1. first', '2. second'].join('\n'),
  );
  const { html } = body(source);
  assert.match(html, /<p class="thesis-block">A lead statement\.<\/p>/);
  assert.match(html, /<ul class="bullet-list">/);
  assert.match(html, /<ol class="numbered-list">/);
});

test('a cluster wraps ### groups in a grouping block', () => {
  const { cluster } = require('./helpers');
  const source = cluster().replace(
    'A body paragraph in the first section.',
    ['### A grouping heading', '', 'Copy under the grouping.'].join('\n'),
  );
  const { html } = body(source);
  assert.match(html, /<div class="grouping-block">\s*<h3 class="grouping-h2">A grouping heading<\/h3>/);
});
