'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { renderFile } = require('../src/index');

const EXAMPLES = path.join(__dirname, '..', 'examples');

/**
 * Pull the JSON-LD out of a rendered page. The block is indented inside the
 * wrapper div, so the indentation is stripped before parsing.
 */
function graphFor(file) {
  const html = renderFile(path.join(EXAMPLES, file)).html;
  const match = /<script type="application\/ld\+json">\n([\s\S]*?)\n\s*<\/script>/.exec(html);
  assert.ok(match, 'no JSON-LD block found');
  return JSON.parse(match[1]);
}

function typesOf(graph) {
  return graph['@graph'].map((node) => node['@type']);
}

test('every page carries Organization, Person, Article, BreadcrumbList, and FAQPage', () => {
  for (const file of ['pillar.md', 'cluster.md', 'spoke.md', 'spoke-banded.md']) {
    const graph = graphFor(file);
    assert.equal(graph['@context'], 'https://schema.org');
    for (const type of ['Organization', 'Person', 'Article', 'BreadcrumbList', 'FAQPage']) {
      assert.ok(typesOf(graph).includes(type), `${file} is missing ${type}`);
    }
  }
});

test('the breadcrumb list ends with the page itself', () => {
  const graph = graphFor('spoke.md');
  const crumbs = graph['@graph'].find((node) => node['@type'] === 'BreadcrumbList').itemListElement;
  assert.equal(crumbs.length, 5);
  assert.deepEqual(crumbs.map((crumb) => crumb.position), [1, 2, 3, 4, 5]);
  assert.equal(crumbs[4].name, 'Share of Voice in AI Search');
  assert.equal(
    crumbs[4].item,
    'https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/share-of-voice/',
  );
});

test('a cluster adds an ItemList indexing every spoke', () => {
  const graph = graphFor('cluster.md');
  const list = graph['@graph'].find((node) => node['@type'] === 'ItemList');
  assert.ok(list, 'cluster has no ItemList');
  assert.equal(list.numberOfItems, 13);
  assert.equal(list.itemListElement[0].position, 1);
  // The in-production entry has no URL yet, so none is invented.
  const pending = list.itemListElement.find((item) => item.name === 'AI Visibility Benchmarks');
  assert.ok(pending && pending.url === undefined);
});

test('a term declaration adds DefinedTerm and points the Article at it', () => {
  const graph = graphFor('spoke.md');
  const term = graph['@graph'].find((node) => node['@type'] === 'DefinedTerm');
  assert.ok(term);
  assert.equal(term.name, 'AI Share of Voice');
  assert.equal(term.alternateName, 'AI SOV');
  assert.equal(term.termCode, 'AI-SOV');
  assert.equal(term.inDefinedTermSet.name, 'Core AI Visibility Metrics and Vocabulary');

  const article = graph['@graph'].find((node) => node['@type'] === 'Article');
  assert.equal(article.about['@id'], term['@id']);
});

test('FAQ answers are plain text, with Markdown stripped', () => {
  const graph = graphFor('pillar.md');
  const faq = graph['@graph'].find((node) => node['@type'] === 'FAQPage');
  const answer = faq.mainEntity[0].acceptedAnswer.text;
  assert.doesNotMatch(answer, /[*_`]|<strong>/);
  assert.match(answer, /Mention Rate, Citation Rate, Share of Voice, and Share of Model/);
});

test('a page without a term declaration has no DefinedTerm', () => {
  assert.ok(!typesOf(graphFor('pillar.md')).includes('DefinedTerm'));
});
