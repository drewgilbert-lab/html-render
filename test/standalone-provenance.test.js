'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { render, ValidationError } = require('../src/index');
const { page, spoke, bandedSpoke, EXAMPLE_CONFIG } = require('./helpers');

/** Drop the SHARED breadcrumbs block from a composed document. */
function withoutBreadcrumbs(source) {
  return source.replace(/breadcrumbs:\n(?: {2}.*\n)+/, '');
}

function graphOf(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'no JSON-LD block found');
  return JSON.parse(match[1]);
}

function nodeOf(graph, type) {
  return graph['@graph'].find((node) => node['@type'] === type);
}

function errorsFor(source) {
  try {
    render(source, { config: EXAMPLE_CONFIG });
  } catch (error) {
    assert.ok(error instanceof ValidationError, `expected a ValidationError, got ${error.name}: ${error.message}`);
    return error.errors;
  }
  throw new assert.AssertionError({ message: 'expected validation to fail, but rendering succeeded' });
}

/* ---- standalone spokes ------------------------------------------------- */

/* ---- author knows_about ------------------------------------------------ */

test('author.knows_about becomes Person.knowsAbout in the graph', () => {
  const source = spoke().replace(
    'author:\n',
    'author:\n  knows_about:\n    - Generative Engine Optimization\n    - AI Share of Voice\n',
  );
  const graph = graphOf(render(source, { config: EXAMPLE_CONFIG }).html);
  assert.deepEqual(nodeOf(graph, 'Person').knowsAbout, [
    'Generative Engine Optimization',
    'AI Share of Voice',
  ]);
});

test('a Person without knows_about carries no knowsAbout key', () => {
  const graph = graphOf(render(spoke(), { config: EXAMPLE_CONFIG }).html);
  assert.ok(!('knowsAbout' in nodeOf(graph, 'Person')));
});

/* ---- provenance keys ---------------------------------------------------- */

test('provenance keys are accepted and echoed in the output header', () => {
  const source = spoke('page_skill_version: 0.24.0 (create-glossary-spoke)\ncomponent_library_version: html-render v1.3.0 e73b8e6\n');
  const { html } = render(source, { config: EXAMPLE_CONFIG });
  assert.match(html, /Skill version {4}0\.24\.0 \(create-glossary-spoke\)/);
  assert.match(html, /Library version {2}html-render v1\.3\.0 e73b8e6/);
});

test('the header carries no provenance rows when the keys are absent', () => {
  const { html } = render(spoke(), { config: EXAMPLE_CONFIG });
  assert.ok(!html.includes('Skill version'));
  assert.ok(!html.includes('Library version'));
});

/* ---- citations separator ------------------------------------------------ */

test('the citations list separates source from title with a colon, never an em dash', () => {
  const source = page({
    body: '```citations\nitems:\n  - source: Gartner\n    title: A Cited Report\n    url: https://www.gartner.com/report\n```',
  });
  const { html } = render(source, { config: EXAMPLE_CONFIG });
  assert.match(html, /citation-source">Gartner<\/span>: <a/);
  assert.ok(!html.includes('&mdash;'), 'rendered output still contains an &mdash;');
  assert.ok(!html.includes('—'), 'rendered output still contains a literal em dash');
});
