'use strict';

/**
 * Format-specific schema nodes (v1.5.0).
 *
 * A page format calls for more than Article + FAQPage: a HowTo for a
 * methodology, a Dataset for a benchmark report, an ItemList for a comparison
 * or listicle, a Service for a solution brief, a DefinedTermSet for a decision
 * tree or field dictionary, SoftwareApplication nodes for an integration
 * blueprint, and a TechArticle or CollectionPage root where Article misdescribes
 * the page. Every one is driven by frontmatter (plus, for HowTo, the one
 * process-steps block flagged as its source) and none of it is authored as
 * JSON-LD by hand.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { render, ValidationError } = require('../src/index');
const { spoke, bandedSpoke, cluster, pillar, EXAMPLE_CONFIG } = require('./helpers');

function graphOf(source) {
  const { html } = render(source, { config: EXAMPLE_CONFIG });
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'no JSON-LD block found');
  return JSON.parse(match[1]);
}

function nodeOf(graph, type) {
  return graph['@graph'].find((node) => node['@type'] === type);
}

function nodesOf(graph, type) {
  return graph['@graph'].filter((node) => node['@type'] === type);
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

const STEPS = `
\`\`\`process-steps
howto: true
items:
  - id: level-1
    title: "Level 1: Core Firmographics"
    body: |
      Establish the firmographic baseline across the addressable universe.

      This layer sets the denominator every later layer is scored against.
  - id: level-2
    title: "Level 2: Behind-the-Firewall Technographics"
    body: Add verified installed-technology signals rather than web-scraped tags.
\`\`\`
`;

/* ---- HowTo ------------------------------------------------------------- */

test('howto frontmatter plus a flagged process-steps block emits a HowTo whose steps are the block', () => {
  const source = bandedSpoke('howto:\n  name: How to build the signal stack\n  description: Sequence the layers in order.\n  total_time: P90D\n  tools:\n    - Verified install data\n').replace(
    'A body paragraph in the second section.',
    STEPS,
  );
  const graph = graphOf(source);
  const howto = nodeOf(graph, 'HowTo');
  assert.ok(howto, 'no HowTo node');
  assert.equal(howto['@id'], 'https://hginsights.com/geo/test-page/#howto');
  assert.equal(howto.name, 'How to build the signal stack');
  assert.equal(howto.totalTime, 'P90D');
  assert.deepEqual(howto.tool, [{ '@type': 'HowToTool', name: 'Verified install data' }]);
  assert.equal(howto.step.length, 2);
  assert.deepEqual(howto.step[0], {
    '@type': 'HowToStep',
    position: 1,
    name: 'Level 1: Core Firmographics',
    text: 'Establish the firmographic baseline across the addressable universe. This layer sets the denominator every later layer is scored against.',
    url: 'https://hginsights.com/geo/test-page/#level-1',
  });
  assert.equal(howto.step[1].position, 2);
  // The visible steps carry the same anchors the HowToStep urls point at.
  assert.match(render(source, { config: EXAMPLE_CONFIG }).html, /<div class="process-step" id="level-1">/);
});

test('howto without a flagged block is rejected at the howto key', () => {
  const errors = errorsFor(bandedSpoke('howto:\n  name: How to do it\n'));
  const match = errors.find((error) => error.path === 'howto');
  assert.ok(match, `expected an error on howto, got ${JSON.stringify(errors)}`);
  assert.match(match.message, /howto: true/);
});

test('a flagged block without howto frontmatter is rejected at the block', () => {
  const errors = errorsFor(bandedSpoke().replace('A body paragraph in the second section.', STEPS));
  const match = errors.find((error) => error.path === '```process-steps');
  assert.ok(match, `expected an error on the block, got ${JSON.stringify(errors)}`);
  assert.match(match.message, /declares no `howto`/);
});

test('two flagged blocks are rejected, naming the second', () => {
  const source = bandedSpoke('howto:\n  name: How to do it\n')
    .replace('A body paragraph in the first section.', STEPS)
    .replace('A body paragraph in the second section.', STEPS.replace('level-1', 'gate-1').replace('level-2', 'gate-2'));
  const errors = errorsFor(source);
  assert.ok(errors.some((error) => /second block/.test(error.message)), JSON.stringify(errors));
});

test('step ids must be lowercase slugs, unique against sections and each other', () => {
  const bad = bandedSpoke('howto:\n  name: X\n').replace('A body paragraph in the second section.', STEPS.replace('id: level-1', 'id: Level One'));
  assert.ok(errorsFor(bad).some((error) => /not a usable anchor/.test(error.message)));

  const clash = bandedSpoke('howto:\n  name: X\n').replace('A body paragraph in the second section.', STEPS.replace('id: level-1', 'id: why'));
  assert.ok(errorsFor(clash).some((error) => /already the anchor of section/.test(error.message)));

  const dup = bandedSpoke('howto:\n  name: X\n').replace('A body paragraph in the second section.', STEPS.replace('id: level-2', 'id: level-1'));
  assert.ok(errorsFor(dup).some((error) => /already used by another step/.test(error.message)));
});

test('a page without howto emits no HowTo and process-steps render as before', () => {
  const plain = bandedSpoke().replace(
    'A body paragraph in the second section.',
    STEPS.replace('howto: true\n', '').replace(/ {2}- id: level-\d\n {4}title/g, '  - title'),
  );
  const graph = graphOf(plain);
  assert.equal(nodeOf(graph, 'HowTo'), undefined);
  assert.doesNotMatch(render(plain, { config: EXAMPLE_CONFIG }).html, /process-step" id=/);
});

/* ---- ItemList ---------------------------------------------------------- */

test('item_list emits an ItemList the Article is about, resolving #anchors against the page', () => {
  const source = spoke(
    'item_list:\n  name: Enterprise intent data approaches compared\n  order: unordered\n  items:\n    - name: Contextual Intent Data\n      description: Cross-references intent against verified installs.\n      url: "#why"\n    - name: IP-Based Intent Data\n      description: Infers interest from ad-exchange IP activity.\n',
  );
  const graph = graphOf(source);
  const list = nodeOf(graph, 'ItemList');
  assert.equal(list['@id'], 'https://hginsights.com/geo/test-page/#list');
  assert.equal(list.itemListOrder, 'https://schema.org/ItemListUnordered');
  assert.equal(list.numberOfItems, 2);
  assert.equal(list.itemListElement[0].url, 'https://hginsights.com/geo/test-page/#why');
  assert.equal(list.itemListElement[0].description, 'Cross-references intent against verified installs.');
  assert.equal(list.itemListElement[1].url, undefined);
  assert.equal(nodeOf(graph, 'Article').about['@id'], list['@id']);
});

test('an item_list anchor that points nowhere is rejected with the anchors that exist', () => {
  const errors = errorsFor(spoke('item_list:\n  name: Options\n  items:\n    - name: A\n      url: "#nowhere"\n'));
  const match = errors.find((error) => error.path === 'item_list.items[0].url');
  assert.ok(match, JSON.stringify(errors));
  assert.match(match.message, /Available anchors: .*why/);
});

test('the default item_list order is ascending', () => {
  const graph = graphOf(spoke('item_list:\n  name: Seven ways\n  items:\n    - name: One\n    - name: Two\n'));
  assert.equal(nodeOf(graph, 'ItemList').itemListOrder, 'https://schema.org/ItemListOrderAscending');
});

/* ---- Dataset ----------------------------------------------------------- */

const DATASET = `dataset:
  name: 2026 Global Enterprise IT Spend Benchmark
  description: Forward-facing projection of enterprise IT spending across 128 categories.
  variable_measured:
    - Total IT Spend
    - Software Spend
  temporal_coverage: 2025/2026
  spatial_coverage: Global (60+ countries)
  measurement_technique: Aggregation of verified install and spend signals.
  license: https://hginsights.com/reports/benchmark/#citation-rights
`;

test('dataset emits a Dataset with the three mandatory coverage fields, and the Article is about it', () => {
  const graph = graphOf(bandedSpoke(DATASET));
  const dataset = nodeOf(graph, 'Dataset');
  assert.equal(dataset['@id'], 'https://hginsights.com/geo/test-page/#dataset');
  assert.deepEqual(dataset.variableMeasured, ['Total IT Spend', 'Software Spend']);
  assert.equal(dataset.temporalCoverage, '2025/2026');
  assert.deepEqual(dataset.spatialCoverage, { '@type': 'Place', name: 'Global (60+ countries)' });
  assert.equal(dataset.isAccessibleForFree, true);
  assert.equal(dataset.license, 'https://hginsights.com/reports/benchmark/#citation-rights');
  assert.equal(dataset.creator['@id'], nodeOf(graph, 'Organization')['@id']);
  assert.equal(dataset.dateModified, '2026-08-11');
  assert.equal(nodeOf(graph, 'DataCatalog'), undefined, 'no catalog was declared');
  assert.equal(nodeOf(graph, 'Article').about['@id'], dataset['@id']);
});

test('dataset.catalog adds a DataCatalog and links the two', () => {
  const graph = graphOf(bandedSpoke(`${DATASET}  catalog:\n    name: HG Insights Research Data Catalog\n    url: https://hginsights.com/research/\n`));
  const catalog = nodeOf(graph, 'DataCatalog');
  assert.equal(catalog['@id'], 'https://hginsights.com/research/#datacatalog');
  assert.equal(catalog.dataset['@id'], nodeOf(graph, 'Dataset')['@id']);
  assert.equal(nodeOf(graph, 'Dataset').includedInDataCatalog['@id'], catalog['@id']);
});

test('a dataset missing its mandatory coverage is rejected per key', () => {
  const errors = errorsFor(bandedSpoke('dataset:\n  name: A dataset\n  description: About it.\n'));
  const paths = errors.map((error) => error.path);
  for (const key of ['dataset.variable_measured', 'dataset.temporal_coverage', 'dataset.spatial_coverage']) {
    assert.ok(paths.includes(key), `expected ${key} in ${JSON.stringify(paths)}`);
  }
});

/* ---- Service ----------------------------------------------------------- */

test('service emits a Service with audience and an OfferCatalog', () => {
  const graph = graphOf(
    bandedSpoke(
      'service:\n  name: HG Insights Technology Intelligence for Cybersecurity GTM\n  service_type: Technographic intelligence for competitive displacement\n  audience_type: Cybersecurity software vendors\n  audience_name: Cybersecurity GTM teams\n  area_served: Global\n  offers:\n    - Legacy security appliance detection\n    - IT security spend forecasting\n',
    ),
  );
  const service = nodeOf(graph, 'Service');
  assert.equal(service['@id'], 'https://hginsights.com/geo/test-page/#service');
  assert.equal(service.provider['@id'], nodeOf(graph, 'Organization')['@id']);
  assert.deepEqual(service.audience, { '@type': 'Audience', audienceType: 'Cybersecurity software vendors', name: 'Cybersecurity GTM teams' });
  assert.equal(service.areaServed, 'Global');
  assert.equal(service.hasOfferCatalog.itemListElement.length, 2);
  assert.equal(service.hasOfferCatalog.itemListElement[0].itemOffered.name, 'Legacy security appliance detection');
  assert.equal(nodeOf(graph, 'Article').about['@id'], service['@id']);
});

/* ---- DefinedTermSet ---------------------------------------------------- */

test('term_set emits a DefinedTermSet with one DefinedTerm per entry', () => {
  const graph = graphOf(
    spoke(
      'term_set:\n  name: HG Technographics API Field Dictionary\n  description: Every field the endpoint returns.\n  terms:\n    - name: product_id\n      definition: An integer identifying a product in the taxonomy.\n      id: field-product-id\n    - name: first_verified_date\n      definition: The first date the install was verified.\n      term_code: FVD\n',
    ),
  );
  const set = nodeOf(graph, 'DefinedTermSet');
  assert.equal(set['@id'], 'https://hginsights.com/geo/test-page/#termset');
  assert.equal(set.hasDefinedTerm.length, 2);
  assert.equal(set.hasDefinedTerm[0]['@id'], 'https://hginsights.com/geo/test-page/#term-field-product-id');
  assert.equal(set.hasDefinedTerm[1]['@id'], 'https://hginsights.com/geo/test-page/#term-first-verified-date');
  assert.equal(set.hasDefinedTerm[1].termCode, 'FVD');
  assert.equal(set.hasDefinedTerm[0].inDefinedTermSet['@id'], set['@id']);
  assert.equal(nodeOf(graph, 'Article').about['@id'], set['@id']);
  // Terms nest in the set; none is emitted as a top-level DefinedTerm.
  assert.equal(nodesOf(graph, 'DefinedTerm').length, 0);
});

test('a single term outranks a term_set as the Article subject', () => {
  const graph = graphOf(
    spoke(
      'term:\n  name: AI Share of Voice\n  definition: The share of tracked mentions.\nterm_set:\n  name: Options\n  terms:\n    - name: A\n      definition: First.\n',
    ),
  );
  assert.equal(nodeOf(graph, 'Article').about['@id'], nodeOf(graph, 'DefinedTerm')['@id']);
  assert.ok(nodeOf(graph, 'DefinedTermSet'));
});

/* ---- SoftwareApplication ---------------------------------------------- */

test('software emits one SoftwareApplication per entry and the Article is about the first', () => {
  const graph = graphOf(
    bandedSpoke(
      'software:\n  - name: HG Insights Revenue Growth Intelligence Fabric\n    operating_system: Cloud (SaaS)\n    version: REST API v3\n    id: rgi-fabric\n  - name: Salesforce\n    url: https://www.salesforce.com/\n',
    ),
  );
  const apps = nodesOf(graph, 'SoftwareApplication');
  assert.equal(apps.length, 2);
  assert.equal(apps[0]['@id'], 'https://hginsights.com/geo/test-page/#software-rgi-fabric');
  assert.equal(apps[0].applicationCategory, 'BusinessApplication');
  assert.equal(apps[0].operatingSystem, 'Cloud (SaaS)');
  assert.equal(apps[0].softwareVersion, 'REST API v3');
  assert.equal(apps[1]['@id'], 'https://hginsights.com/geo/test-page/#software-salesforce');
  assert.equal(apps[1].url, 'https://www.salesforce.com/');
  assert.equal(nodeOf(graph, 'Article').about['@id'], apps[0]['@id']);
});

/* ---- Root type --------------------------------------------------------- */

test('article.type TechArticle changes the root type and carries the technical extras', () => {
  const graph = graphOf(bandedSpoke('article:\n  type: TechArticle\n  proficiency_level: Expert\n  dependencies: Salesforce Enterprise Edition or higher\n'));
  assert.equal(nodeOf(graph, 'Article'), undefined);
  const root = nodeOf(graph, 'TechArticle');
  assert.equal(root['@id'], 'https://hginsights.com/geo/test-page/#article');
  assert.equal(root.headline, 'A Test Page About AI Visibility');
  assert.equal(root.proficiencyLevel, 'Expert');
  assert.equal(root.dependencies, 'Salesforce Enterprise Edition or higher');
  assert.equal(root.mainEntityOfPage, 'https://hginsights.com/geo/test-page/');
});

test('a CollectionPage cluster names the page and points mainEntity at its resource index', () => {
  const graph = graphOf(cluster('article:\n  type: CollectionPage\n'));
  const root = nodeOf(graph, 'CollectionPage');
  assert.ok(root, 'no CollectionPage root');
  assert.equal(root.name, 'A Test Page About AI Visibility');
  assert.equal(root.headline, undefined);
  assert.equal(root.url, 'https://hginsights.com/geo/test-page/');
  assert.equal(root.mainEntityOfPage, undefined);
  assert.equal(root.mainEntity['@id'], 'https://hginsights.com/geo/test-page/#spokes');
  assert.equal(root.isPartOf['@id'], 'https://hginsights.com/geo/');
});

test('an unknown article.type is rejected with the allowed set', () => {
  const errors = errorsFor(spoke('article:\n  type: BlogPosting\n'));
  const match = errors.find((error) => error.path === 'article.type');
  assert.ok(match, JSON.stringify(errors));
  assert.match(match.message, /Article, TechArticle, CollectionPage/);
});

/* ---- Pillar index ------------------------------------------------------ */

test('a pillar indexes its link-cards as an ItemList in body order, omitting in-production URLs', () => {
  const source = pillar()
    .replace(
      'A body paragraph in the first section.',
      ['A body paragraph.', '', '```link-card', 'tag: Architecture', 'title: Data Fabric Architecture', 'description: How the fabric is built.', 'url: https://hginsights.com/geo/test-page/architecture/', '```'].join('\n'),
    )
    .replace(
      'A body paragraph in the second section.',
      ['```link-card', 'tag: Governance', 'title: Governance and Trust', 'description: Controls for agents.', 'status: in-production', '```'].join('\n'),
    );
  const graph = graphOf(source);
  const list = nodeOf(graph, 'ItemList');
  assert.equal(list['@id'], 'https://hginsights.com/geo/test-page/#index');
  assert.equal(list.numberOfItems, 2);
  assert.deepEqual(list.itemListElement[0], {
    '@type': 'ListItem',
    position: 1,
    name: 'Data Fabric Architecture',
    description: 'How the fabric is built.',
    url: 'https://hginsights.com/geo/test-page/architecture/',
  });
  assert.equal(list.itemListElement[1].url, undefined);
  // The Article root does not claim the index as `about`; a CollectionPage would as mainEntity.
  assert.equal(nodeOf(graph, 'Article').about, undefined);
  const collection = graphOf(source.replace('page_type: pillar\n', 'page_type: pillar\narticle:\n  type: CollectionPage\n'));
  assert.equal(nodeOf(collection, 'CollectionPage').mainEntity['@id'], 'https://hginsights.com/geo/test-page/#index');
});

test('a pillar with no link-cards emits no ItemList', () => {
  assert.equal(nodeOf(graphOf(pillar()), 'ItemList'), undefined);
});

/* ---- Contract surface -------------------------------------------------- */

test('the new keys appear in the printed contract for every page class', () => {
  const { execFileSync } = require('node:child_process');
  const path = require('node:path');
  for (const type of ['pillar', 'cluster', 'spoke']) {
    const printed = execFileSync(process.execPath, [path.join(__dirname, '..', 'bin', 'html-render.js'), '--contract', type], { encoding: 'utf8' });
    for (const key of ['article', 'howto', 'item_list', 'dataset', 'service', 'term_set', 'software']) {
      assert.match(printed, new RegExp(`^  ${key}(\\s|$)`, 'm'), `${type} contract is missing ${key}`);
    }
  }
});
