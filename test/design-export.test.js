'use strict';

/**
 * Ingestion proof against the Claude Design export fixture.
 *
 * `test/fixtures/design-export-sample` is a verbatim excerpt of a real export
 * (manifest, eight component triads, and their CSS attributed to the files it
 * actually lives in). These tests read that fixture — not inline-duplicated
 * markup — so they prove the ingestion mechanism end to end and keep the
 * fixture and the registry in agreement:
 *
 *   1. every exported component name has a registry entry sourced verbatim;
 *   2. a component's CSS is discovered by searching its class names across
 *      every file in the manifest's `globalCssPaths` — never assumed from its
 *      category folder (Callout lives in components/panels/ but its CSS is in
 *      css/content.css; ShareBar's is in css/charts.css, and no data.css
 *      exists at all; LimitationsCards lives in components/panels/ but its
 *      CSS is in css/editorial.css);
 *   3. everything a registry render emits stays within the class vocabulary
 *      of the export's own JSX, and every ported rule is scoped;
 *   4. the audit reports all eight covered.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { blocks, renderBlock } = require('../src/components');
const { auditCatalog } = require('../src/audit');

const FIXTURE = path.join(__dirname, 'fixtures', 'design-export-sample');
const STYLES = fs.readFileSync(path.join(__dirname, '..', 'src', 'assets', 'styles.css'), 'utf8');

const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE, '_ds_manifest.json'), 'utf8'));

/** Hyphenated class-name tokens, from JSX string literals or a class attribute. */
function classTokens(text) {
  const names = new Set();
  for (const match of text.matchAll(/["'`]([^"'`]*)["'`]/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (/^[a-z][a-z0-9]*(-{1,2}[a-z0-9]+)+$/.test(token)) names.add(token);
    }
  }
  return names;
}

/** The fixture CSS files (manifest `globalCssPaths`) that mention a class. */
function cssFilesMentioning(className) {
  return manifest.globalCssPaths.filter((cssPath) =>
    fs.readFileSync(path.join(FIXTURE, cssPath), 'utf8').includes(`.${className}`),
  );
}

const jsxClasses = new Map(
  manifest.components.map((component) => [
    component.name,
    classTokens(fs.readFileSync(path.join(FIXTURE, component.sourcePath), 'utf8')),
  ]),
);

function block(name, data) {
  return renderBlock({ type: 'component', name, data, line: 1 });
}

test('every exported component has a registry entry sourced by its verbatim name', () => {
  for (const component of manifest.components) {
    const entry = [...blocks.values()].find((candidate) => candidate.source === component.name);
    assert.ok(entry, `no registry entry claims source "${component.name}"`);
  }
});

test('component CSS is discovered across globalCssPaths, not assumed from the category folder', () => {
  // Where each component's classes actually live — Callout (panels/) and
  // ShareBar (data/) both resolve outside their category's name.
  const expected = {
    Figure: 'css/content.css',
    Callout: 'css/content.css',
    ShareBar: 'css/charts.css',
    ComparisonTable: 'css/tables.css',
    LimitationsCards: 'css/editorial.css',
    TrendIndicator: 'css/charts.css',
    KeyInsights: 'css/panels.css',
    BarChart: 'css/charts.css',
  };
  for (const component of manifest.components) {
    for (const className of jsxClasses.get(component.name)) {
      const found = cssFilesMentioning(className);
      assert.deepEqual(
        found,
        [expected[component.name]],
        `.${className} (${component.name}) expected in ${expected[component.name]}, found in: ${found.join(', ') || 'nowhere'}`,
      );
    }
  }
});

test('every exported class is ported into styles.css, scoped to the page class', () => {
  for (const [name, classes] of jsxClasses) {
    for (const className of classes) {
      const rules = STYLES.split('\n').filter((line) => line.includes(`.${className}`));
      assert.ok(rules.length, `.${className} (${name}) is not in styles.css`);
      for (const line of rules) {
        assert.match(line, /__page_class__/, `unscoped rule for .${className}: ${line.trim()}`);
      }
    }
  }
});

test('registry renders stay within the class vocabulary of the export JSX', () => {
  const rendered = {
    Figure: [
      block('figure', { src: '/a.png', alt: 'a', caption: 'Figure 1.' }),
      block('figure', {}),
    ].join('\n'),
    Callout: [
      block('callout', { label: 'Why It Matters', body: 'Because.' }),
      block('callout', { body: 'Unlabelled.', tone: 'warn' }),
    ].join('\n'),
    ShareBar: [
      block('share-bar', { width: 38.2, value: '38.2%' }),
      block('share-bar', { width: 56, no_track: true, emphasis: 'dim' }),
    ].join('\n'),
    ComparisonTable: block('comparison-table', {
      columns: [{ label: 'Vendor' }, { label: 'Share', align: 'center' }, { label: 'YoY' }],
      rows: [{ cells: ['Salesforce', { share: { width: 38.2, value: '38.2%' } }, { trend: { direction: 'up', value: '+3.1pp' } }] }],
    }),
    LimitationsCards: block('limitations-cards', {
      items: [
        { title: 'Install share is not revenue share', body: 'Broad adoption can mean a small revenue fraction.' },
        { title: 'Geographic signal density varies', body: 'Coverage is strongest in North America and Western Europe.' },
      ],
    }),
    TrendIndicator: [
      block('trend-indicator', { direction: 'up', value: '+3.1pp' }),
      block('trend-indicator', { value: 'flat' }),
    ].join('\n'),
    KeyInsights: block('key-insights', {
      title: 'What the data tells us',
      items: [{ lead: 'Salesforce is consolidating.', text: 'Install share grew from 35.1% to 38.2% YoY.', attribution: 'See primary chart' }],
    }),
    BarChart: [
      block('bar-chart', {
        title: 'CRM Install Share',
        subtitle: '500+ employees',
        date_badge: 'Q2 2026',
        rows: [
          { label: 'Salesforce', width: 82, value: '38.2%' },
          { label: 'HubSpot', width: 28, value: '11.8%', emphasis: 'accent' },
        ],
        source: 'Source: HG Insights',
      }),
      block('bar-chart', {
        variant: 'stacked',
        title: 'Spend mix',
        legend: [{ label: 'Software', series: 's1' }, { label: 'Services', series: 's2' }],
        rows: [{ label: 'Enterprise', value: '$1.1T', segments: [{ width: 60, series: 's1' }, { width: 40, series: 's2' }] }],
      }),
      block('bar-chart', {
        variant: 'grouped',
        title: 'Two periods',
        legend: [{ label: '2025', series: 's2' }, { label: '2026', series: 's1' }],
        rows: [{ label: 'Salesforce', value: '+3.1pp', bars: [{ width: 70, series: 's2' }, { width: 82, series: 's1' }] }],
      }),
    ].join('\n'),
  };
  // ComparisonTable composes ShareBar and TrendIndicator inside cells, so its vocabulary is the union.
  const allowed = {
    Figure: jsxClasses.get('Figure'),
    Callout: jsxClasses.get('Callout'),
    ShareBar: jsxClasses.get('ShareBar'),
    ComparisonTable: new Set([
      ...jsxClasses.get('ComparisonTable'),
      ...jsxClasses.get('ShareBar'),
      ...jsxClasses.get('TrendIndicator'),
    ]),
    LimitationsCards: jsxClasses.get('LimitationsCards'),
    TrendIndicator: jsxClasses.get('TrendIndicator'),
    KeyInsights: jsxClasses.get('KeyInsights'),
    BarChart: jsxClasses.get('BarChart'),
  };
  for (const name of Object.keys(rendered)) {
    for (const match of rendered[name].matchAll(/class="([^"]+)"/g)) {
      for (const token of match[1].split(/\s+/)) {
        if (!/^[a-z][a-z0-9]*(-{1,2}[a-z0-9]+)+$/.test(token)) continue;
        assert.ok(allowed[name].has(token), `${name} rendered class "${token}" that its JSX never writes`);
      }
    }
  }
});

test('the audit reports all eight fixture components covered by the live registry', () => {
  const result = auditCatalog(FIXTURE);
  assert.equal(result.counts.catalogued, 8);
  assert.equal(result.counts.covered, 8);
  assert.equal(result.counts.new, 0);
  for (const entry of result.entries) {
    assert.ok(
      entry.coveredBy.some((claim) => claim.startsWith('block ')),
      `${entry.name} lacks a registry claim: ${entry.coveredBy.join(', ')}`,
    );
  }
});
