'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { render } = require('../src/index');
const { DEFAULTS, PAGE_CLASS_TOKEN } = require('../src/config');
const { page, pillar, cluster, spoke, bandedSpoke, body, EXAMPLE_CONFIG, HERO_WITH_THESIS, INTRO } = require('./helpers');

test('the FAQ renders as a static Q&A list, with no accordion affordance', () => {
  const html = body(pillar()).html;
  // Questions are headings, not buttons: the export has no toggle. The coral
  // circle beside a question is an ornament marking the row, so it is present
  // in the markup and hidden from assistive technology.
  assert.match(html, /<h3 class="faq-question">\s*<span>What is this\?<\/span>/);
  assert.match(html, /<span class="faq-icon" aria-hidden="true"><\/span>/);
  assert.match(html, /<div class="faq-answer">A fixture used by the renderer test suite\.<\/div>/);
  assert.doesNotMatch(html, /faq-item open/);
  assert.doesNotMatch(html, /<details|<summary|<button/);
  assert.doesNotMatch(html, /aria-expanded/);
  // Nothing is left for the script to toggle.
  const withScript = render(pillar(), { config: EXAMPLE_CONFIG, styles: false, schema: false }).html;
  const script = withScript.slice(withScript.indexOf('<script'), withScript.indexOf('</script>'));
  assert.doesNotMatch(script, /faq/, 'script.js still references the FAQ toggle');
});

test('render options control the emitted wrapper assets', () => {
  const plain = render(pillar(), { config: EXAMPLE_CONFIG, styles: false, script: false, schema: false }).html;
  assert.doesNotMatch(plain, /<style>|<script/);
  assert.match(plain, new RegExp(`<div class="${DEFAULTS.pageClass}">`));

  const withFont = render(pillar(), { config: EXAMPLE_CONFIG }).html;
  assert.match(withFont, /@import url\('https:\/\/use\.typekit\.net\/ltv7nur\.css'\)/);
  assert.doesNotMatch(render(pillar(), { config: EXAMPLE_CONFIG, font: false }).html, /@import/);
});

test('the comment header carries the values the publishing site needs', () => {
  const { html, meta } = render(pillar(), { config: EXAMPLE_CONFIG });
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

test('the sticky side-nav clears the header and spoke body is padded', () => {
  const { stylesheet, behaviourScript } = require('../src/index');
  const css = stylesheet();
  assert.match(css, /\.sidenav \{ position: sticky; top: 28px;/);
  assert.match(css, /\.spoke-body-section \{ padding: clamp\(48px,5vw,80px\) 0;/);
  assert.match(behaviourScript(), /rootMargin: '-80px 0px -60% 0px'/);
});

test('tables wrap in place and never use a horizontal slider', () => {
  // The export gives the wrapper an overflow-x slider. This renderer emits a
  // body into a host column of unknown width, and a slider hides columns from
  // print, so the table wraps in place instead. Colour and shape are the
  // export's; only the overflow behaviour departs.
  const { stylesheet } = require('../src/index');
  const css = stylesheet();
  assert.match(css, /\.table-wrapper \{ overflow: visible;/);
  assert.match(css, /table\.comparison-table \{ width: 100%; table-layout: fixed;/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
  assert.doesNotMatch(css, /\.comparison-table thead th \{[^}]*white-space: nowrap/);
  assert.match(css, /\.comparison-table thead tr \{ background: var\(--hg-navy\);/);
});

test('footnote definition lines are not rendered next to the formatted citations slot', () => {
  const citations = [
    '```citations',
    'items:',
    '  - source: Google Search Central',
    '    title: AI Features and Your Website',
    '    url: https://developers.google.com/search/docs/appearance/ai-features',
    '```',
  ].join('\n');
  const source = page({
    body: `A body paragraph.[^1]\n\n[^1]: Google Search Central: dumped definition.\n\n${citations}`,
  });
  const html = body(source).html;
  assert.match(html, /href="#citation-1"/);
  assert.doesNotMatch(html, /dumped definition/);
  assert.match(html, /class="citations-section" id="citations"/);
});
