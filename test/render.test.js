'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { render } = require('../src/index');
const { DEFAULTS, PAGE_CLASS_TOKEN } = require('../src/config');
const { pillar, cluster, spoke, bandedSpoke, body, EXAMPLE_CONFIG, HERO_WITH_THESIS, INTRO } = require('./helpers');

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
  // Cluster has no right-rail nav.
  assert.doesNotMatch(html, /class="sidenav"/);
});

test('valid Spoke Markdown renders the article variant', () => {
  const { html, pageType, layout } = body(spoke());
  assert.equal(pageType, 'spoke');
  assert.equal(layout, 'article');
  assert.match(html, /class="container article-hero"/);
  assert.match(html, /class="spoke-body-section"/);
  assert.match(html, /class="spoke-col article-body"/);
  assert.match(html, /class="related-hubs-section" id="related"/);
  assert.match(html, /class="sidenav"/);
  assert.match(html, /<div class="nav-cta">[\s\S]*?<a class="btn-primary" href="https:\/\/hginsights\.com\/demo">Book a Demo<\/a>/);
  assert.match(html, /class="cta-section" id="cta"/);
  assert.match(html, /<div class="cta-buttons">[\s\S]*?<a class="btn-primary" href="https:\/\/hginsights\.com\/demo">Book a Demo<\/a>/);
  assert.doesNotMatch(html, /class="btn-secondary"/);
  assert.match(html, /class="freshness-bar"/);
  assert.match(html, /Data last updated: Q3 2026/);
  assert.doesNotMatch(html, /section-rule/);
  assert.doesNotMatch(html, /class="pill"/);
  // The article variant does not use the gradient hero or a jump nav.
  assert.doesNotMatch(html, /class="hero" id="hero"/);
  assert.doesNotMatch(html, /class="hub-toc"/);
});

test('the banded Spoke variant uses the gradient hero, section bands, and the side-nav rail', () => {
  const { html, layout } = body(bandedSpoke(`${INTRO}\n`, HERO_WITH_THESIS));
  assert.equal(layout, 'banded');
  assert.match(html, /class="hero" id="hero"/);
  assert.match(html, /<section class="page-section" id="why">/);
  assert.match(html, /class="spoke-body-section"/);
  assert.match(html, /class="sidenav"/);
  assert.match(html, /class="hub-intro-section no-toc" id="overview"/);
  assert.match(html, /<h2 class="hub-intro-title">What this guide covers<\/h2>/);
  assert.match(html, /<div class="nav-cta">[\s\S]*?<a class="btn-primary" href="https:\/\/hginsights\.com\/demo">Book a Demo<\/a>/);
  assert.doesNotMatch(html, /class="article-hero"/);
  assert.doesNotMatch(html, /class="hub-toc"/);
  assert.doesNotMatch(html, /hero-eyebrow/);
  assert.doesNotMatch(html, /class="pill"/);
  assert.match(html, /class="freshness-bar"/);
  assert.match(html, /Data last updated: Q3 2026/);
  assert.doesNotMatch(html, /freshness-cadence|methodology-link/);
  assert.doesNotMatch(html, /section-rule/);
  // Thesis lives in the reading column, not inside the hero.
  const heroEnd = html.indexOf('</section>', html.indexOf('class="hero" id="hero"'));
  const spokeCol = html.indexOf('class="spoke-col"');
  const thesis = html.indexOf('class="thesis-block"');
  assert.ok(thesis > heroEnd && thesis > spokeCol, 'banded thesis should sit in .spoke-col, not the hero');
  assert.match(html, /<div class="cta-buttons">[\s\S]*?<a class="btn-primary" href="https:\/\/hginsights\.com\/demo">Book a Demo<\/a>/);
  assert.doesNotMatch(html, /class="btn-secondary"/);
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

test('the FAQ renders as a static Q&A list, with no accordion affordance', () => {
  const html = body(pillar()).html;
  // Questions are headings, not buttons: the export dropped the toggle.
  assert.match(html, /<h3 class="faq-question">What is this\?<\/h3>/);
  assert.match(html, /<div class="faq-answer">A fixture used by the renderer test suite\.<\/div>/);
  assert.doesNotMatch(html, /faq-item open/);
  assert.doesNotMatch(html, /faq-icon/);
  assert.doesNotMatch(html, /aria-expanded/);
  // Nothing is left for the script to toggle.
  const withScript = render(pillar(), { config: EXAMPLE_CONFIG, styles: false, schema: false }).html;
  const script = withScript.slice(withScript.indexOf('<script'), withScript.indexOf('</script>'));
  assert.doesNotMatch(script, /faq/, 'script.js still references the FAQ toggle');
});

test('render options control the emitted wrapper assets', () => {
  const plain = render(pillar(), { config: EXAMPLE_CONFIG, styles: false, script: false, schema: false }).html;
  assert.doesNotMatch(plain, /<style>|<script/);
  assert.match(plain, new RegExp(`<div class="${DEFAULTS.pageClass}" data-page-type="pillar">`));

  const withFont = render(pillar(), { config: EXAMPLE_CONFIG }).html;
  assert.match(withFont, /@import url\('https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(render(pillar(), { config: EXAMPLE_CONFIG, font: false }).html, /@import/);
});

test('the comment header carries the values the publishing site needs', () => {
  const { html, meta } = render(pillar(), { config: EXAMPLE_CONFIG });
  assert.match(html, /Page type {8}pillar/);
  assert.match(html, /Canonical URL {4}https:\/\/hginsights\.com\/geo\/test-page\//);
  assert.equal(meta.sections, 2);
  assert.ok(meta.words > 0);
});

test('the wrapper class is written in exactly one place', () => {
  // Neither asset may spell the class out; both carry the placeholder instead.
  for (const asset of ['styles.css', 'script.js']) {
    const text = fs.readFileSync(path.join(__dirname, '..', 'src', 'assets', asset), 'utf8');
    assert.ok(text.includes(PAGE_CLASS_TOKEN), `${asset} lost its ${PAGE_CLASS_TOKEN} placeholder`);
    assert.ok(!text.includes(`.${DEFAULTS.pageClass}`), `${asset} hardcodes .${DEFAULTS.pageClass} instead of the placeholder`);
  }

  // And nothing reaches the output still holding one.
  const html = render(pillar(), { config: EXAMPLE_CONFIG }).html;
  assert.ok(!html.includes(PAGE_CLASS_TOKEN), 'an unsubstituted placeholder reached the output');
  const scoped = (html.match(new RegExp(`\\.${DEFAULTS.pageClass}\\b`, 'g')) || []).length;
  assert.ok(scoped > 300, `stylesheet is not scoped to .${DEFAULTS.pageClass} — found ${scoped} selectors`);
  assert.match(html, new RegExp(`querySelector\\('\\.${DEFAULTS.pageClass}'\\)`));
});
