'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { render, ValidationError } = require('../src/index');
const { parseBody } = require('../src/parse/markdown');
const { EXAMPLE_CONFIG } = require('./helpers');

/**
 * A document with no `page_type` composes itself: the renderer walks the body
 * in the order it was written. These tests pin that order, the region wrappers,
 * and the errors that are still structural.
 */

const FRONTMATTER = `---
title: A Body Order Page
url: https://hginsights.com/geo/body-order/
description: One sentence describing the page.
published: 2026-09-14
---
`;

function doc(body) {
  return `${FRONTMATTER}\n${body}\n`;
}

function html(body) {
  return render(doc(body), { config: EXAMPLE_CONFIG }).html;
}

function errorsFor(body) {
  try {
    render(doc(body), { config: EXAMPLE_CONFIG });
  } catch (error) {
    assert.ok(error instanceof ValidationError, `expected a ValidationError, got ${error.name}: ${error.message}`);
    return error.errors;
  }
  throw new assert.AssertionError({ message: 'expected validation to fail, but rendering succeeded' });
}

/** Positions of a list of substrings in the output, for order assertions. */
function order(output, ...needles) {
  return needles.map((needle) => {
    const at = output.indexOf(needle);
    assert.notEqual(at, -1, `expected to find ${JSON.stringify(needle)} in the output`);
    return at;
  });
}

test('the rendered order is the order the body was written in', () => {
  const output = html(
    [
      '```cta',
      'title: First',
      'body: The CTA is written first, so it renders first.',
      '```',
      '',
      '## A heading',
      '',
      '```breadcrumb',
      'current: Last',
      '```',
    ].join('\n'),
  );
  const [cta, heading, breadcrumb] = order(output, 'class="cta-section"', '<h2>A heading</h2>', 'class="breadcrumb-bar"');
  assert.ok(cta < heading && heading < breadcrumb, 'components should render in document order, not in a fixed slot order');
});

test('no page class means no page-class chrome is invented', () => {
  const output = html('A single paragraph.');
  assert.doesNotMatch(output, /data-page-type/);
  for (const chrome of ['class="hero"', 'class="freshness-bar"', 'class="faq-section"', 'class="cta-section"', 'class="sidenav"']) {
    assert.doesNotMatch(output, new RegExp(chrome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(output, /<p>A single paragraph\.<\/p>/);
});

test('a section region carries its own id and band, and the band is never overridden', () => {
  const output = html(
    [':::section', 'id: one', 'band: tinted', '', '## First', ':::', '', ':::section', 'id: two', 'band: tinted', '', '## Second', ':::'].join('\n'),
  );
  // Two tinted bands in a row: the author asked for it, so the author gets it.
  assert.match(output, /<section class="page-section tinted" id="one">/);
  assert.match(output, /<section class="page-section tinted" id="two">/);
});

test('a section region can inset its content in the container column', () => {
  assert.match(html([':::section', 'container: true', '', 'Inset copy.', ':::'].join('\n')), /<section class="page-section">\s*<div class="container">/);
  assert.doesNotMatch(html([':::section', '', 'Full bleed copy.', ':::'].join('\n')), /<section class="page-section">\s*<div class="container">/);
});

test('two-column puts side-nav in the rail and everything else in the column', () => {
  const output = html(
    [
      ':::two-column',
      '',
      '## In the column',
      '',
      '```side-nav',
      'label: On this page',
      'items:',
      '  - label: In the column',
      '    anchor: col',
      '```',
      ':::',
    ].join('\n'),
  );
  assert.match(output, /<section class="spoke-body-section">\s*<div class="container">\s*<div class="spoke-col">/);
  const [column, rail] = order(output, '<div class="spoke-col">', '<aside class="sidenav">');
  assert.ok(column < rail, 'the rail is the second grid child');
  // The rail is a sibling of the column, never nested inside it.
  const columnEnd = output.indexOf('</div>', output.indexOf('<h2>In the column</h2>'));
  assert.ok(rail > columnEnd, 'side-nav should not render inside the reading column');
});

test('two-column variant: article selects the narrow pillar column', () => {
  const output = html([':::two-column', 'variant: article', '', 'Reading copy.', ':::'].join('\n'));
  assert.match(output, /<section class="article-body-section">\s*<div class="container">\s*<div class="main-col">/);
});

test('regions nest, and a heading keeps its section block metadata', () => {
  const output = html(
    [':::two-column', '', ':::section', 'id: inner', '', '## Nested', '', '```section', 'eyebrow: Why It Matters', '```', ':::', ':::'].join('\n'),
  );
  assert.match(output, /<section class="spoke-body-section">/);
  assert.match(output, /<section class="page-section" id="inner">/);
  assert.match(output, /<div class="section-eyebrow">Why It Matters<\/div>\s*<h2>Nested<\/h2>/);
});

test('an unbalanced region is a parse error naming the region', () => {
  assert.match(errorsFor(':::two-column\n\nNo closer.')[0].message, /Unclosed ":::two-column" region/);
  assert.match(errorsFor('Some copy.\n\n:::')[0].message, /has no open region/);
  assert.match(errorsFor(':::Two_Column\n\n:::')[0].message, /is not a usable region name/);
});

test('a region the renderer has no wrapper for is refused, not guessed at', () => {
  assert.throws(() => html([':::nonesuch', '', 'copy', ':::'].join('\n')), /Unresolved region ":::nonesuch"/);
});

test('a ":::" closer directly after a paragraph closes the region', () => {
  // The paragraph scanner must stop at the marker rather than swallow it.
  const parsed = parseBody([':::section', '', 'A paragraph.', ':::'].join('\n'), 1);
  assert.equal(parsed.nodes.length, 1);
  assert.equal(parsed.nodes[0].type, 'region');
  assert.deepEqual(parsed.nodes[0].nodes.map((node) => node.type), ['paragraph']);
});

test('a body-order document renders byte-identically every time', () => {
  const body = [':::two-column', '', ':::section', 'id: a', 'band: tinted', '', '## A', '', 'Copy.', ':::', '', '```side-nav', 'label: Nav', 'items:', '  - label: A', '    anchor: a', '```', ':::'].join('\n');
  assert.equal(html(body), html(body));
});

test('the graph carries what the document declares, and omits what it does not', () => {
  const output = html('Some copy.');
  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(output)[1]);
  const types = graph['@graph'].map((node) => node['@type']);
  assert.deepEqual(types, ['Organization', 'Article']);
  // No author and no faq in the frontmatter, so no Person and no FAQPage.
  assert.ok(!types.includes('Person'));
  assert.ok(!types.includes('FAQPage'));
});
