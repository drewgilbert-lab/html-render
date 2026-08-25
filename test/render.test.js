'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { render } = require('../src/index');
const { pillar, cluster, spoke, bandedSpoke, body, HERO_WITH_THESIS } = require('./helpers');

test('valid Pillar Markdown renders the Pillar layout', () => {
  const { html, pageType } = body(pillar());
  assert.equal(pageType, 'pillar');

  // Component order is fixed by the layout.
  const order = [
    'class="breadcrumb-bar"',
    'class="hero" id="hero"',
    'class="hub-intro-section" id="overview"',
    'class="article-body-section"',
    'class="main-col"',
    'class="sidenav"',
    'class="faq-section" id="faq"',
    'class="cta-section" id="cta"',
  ];
  let cursor = -1;
  for (const marker of order) {
    const at = html.indexOf(marker);
    assert.ok(at > -1, `missing ${marker}`);
    assert.ok(at > cursor, `${marker} is out of order`);
    cursor = at;
  }

  // Pillar body sections live in the narrow article column with left-aligned headers.
  assert.match(html, /<section id="why">/);
  assert.match(html, /class="section-header align-left"/);
  // Auto table of contents and side nav both resolve to the body sections.
  assert.match(html, /<a href="#why"><span class="hub-toc-dot"><\/span>Why It Matters<\/a>/);
  assert.match(html, /<div class="nav-head">On this page<\/div>/);
  // Body only: no document scaffolding, navigation, or footer.
  assert.doesNotMatch(html, /<html|<head|<body|wp-header-placeholder|wp-footer-placeholder/);
});

test('valid Cluster Markdown renders the Cluster layout with the resource index after the first section', () => {
  const { html, pageType } = body(cluster());
  assert.equal(pageType, 'cluster');

  const firstSection = html.indexOf('<section class="page-section" id="why">');
  const resourceIndex = html.indexOf('class="data-cuts-section" id="resource-index"');
  const secondSection = html.indexOf('id="program"');
  assert.ok(firstSection > -1 && resourceIndex > firstSection && secondSection > resourceIndex);

  // Cluster sections are full-width bands that alternate.
  assert.match(html, /<section class="page-section tinted" id="program">/);
  // The thesis band is absent when no hero thesis is supplied.
  assert.doesNotMatch(html, /thesis-wrap/);
});

test('valid Spoke Markdown renders the article variant', () => {
  const { html, pageType, layout } = body(spoke());
  assert.equal(pageType, 'spoke');
  assert.equal(layout, 'article');
  assert.match(html, /class="container article-hero"/);
  assert.match(html, /class="container article-body"/);
  assert.match(html, /class="related-hubs-section" id="related"/);
  // The article variant does not use the gradient hero or the side nav.
  assert.doesNotMatch(html, /class="hero" id="hero"/);
  assert.doesNotMatch(html, /class="sidenav"/);
});

test('the banded Spoke variant uses the gradient hero and section bands', () => {
  const { html, layout } = body(bandedSpoke());
  assert.equal(layout, 'banded');
  assert.match(html, /class="hero" id="hero"/);
  assert.match(html, /<section class="page-section" id="why">/);
  assert.doesNotMatch(html, /class="article-hero"/);
});

test('a hero thesis renders inside the Pillar hero and as a band on a Cluster', () => {
  const pillarHtml = body(pillar('', HERO_WITH_THESIS)).html;
  assert.match(pillarHtml, /hero-left[\s\S]*?<p class="thesis-block">A forty word statement/);
  assert.doesNotMatch(pillarHtml, /thesis-wrap/);

  const clusterHtml = body(cluster('', HERO_WITH_THESIS)).html;
  assert.match(clusterHtml, /<div class="thesis-wrap">/);
  // The cluster hero itself carries no thesis block.
  assert.doesNotMatch(clusterHtml.slice(0, clusterHtml.indexOf('thesis-wrap')), /thesis-block/);
});

test('optional page slots appear only when supplied', () => {
  const bare = body(pillar()).html;
  assert.doesNotMatch(bare, /freshness-bar|citations-section|methodology-section|related-hubs-section/);

  const extras = [
    'freshness:',
    '  label: Q3 2026',
    '  note: Reflects HG Insights telemetry',
    'methodology:',
    '  title: How we measure this',
    '  body: One paragraph explaining the method.',
    '  caveat: Install share is not revenue share.',
    'citations:',
    '  items:',
    '    - source: Google Search Central',
    '      title: AI Features and Your Website',
    '      url: https://developers.google.com/search/docs/appearance/ai-features',
    '',
  ].join('\n');
  const full = body(pillar(extras)).html;
  assert.match(full, /class="freshness-bar"/);
  assert.match(full, /class="methodology-section" id="methodology"/);
  assert.match(full, /class="citations-section" id="citations"/);
  // Methodology sits between the body and the FAQ.
  assert.ok(full.indexOf('id="methodology"') < full.indexOf('id="faq"'));
});

test('render options control the emitted wrapper assets', () => {
  const plain = render(pillar(), { styles: false, script: false, schema: false }).html;
  assert.doesNotMatch(plain, /<style>|<script/);
  assert.match(plain, /<div class="hg-geo-page" data-page-type="pillar">/);

  const withFont = render(pillar()).html;
  assert.match(withFont, /@import url\('https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(render(pillar(), { font: false }).html, /@import/);
});

test('the comment header carries the values WordPress needs', () => {
  const { html, meta } = render(pillar());
  assert.match(html, /Page type {8}pillar/);
  assert.match(html, /Canonical URL {4}https:\/\/hginsights\.com\/geo\/test-page\//);
  assert.equal(meta.sections, 2);
  assert.ok(meta.words > 0);
});
