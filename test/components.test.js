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
