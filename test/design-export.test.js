'use strict';

/**
 * Ingestion proof against the Claude Design export fixture.
 *
 * `test/fixtures/design-export-sample` is a verbatim excerpt of a real export
 * (manifest, four component triads, and their CSS attributed to the files it
 * actually lives in). These tests read that fixture — not inline-duplicated
 * markup — so they prove the ingestion mechanism end to end and keep the
 * fixture and the registry in agreement:
 *
 *   1. every exported component name has a registry entry sourced verbatim;
 *   2. a component's CSS is discovered by searching its class names across
 *      every file in the manifest's `globalCssPaths` — never assumed from its
 *      category folder (Callout lives in components/panels/ but its CSS is in
 *      css/content.css; ShareBar's is in css/charts.css, and no data.css
 *      exists at all);
 *   3. everything a registry render emits stays within the class vocabulary
 *      of the export's own JSX, and every ported rule is scoped;
 *   4. the audit reports all four covered.
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
      columns: [{ label: 'Vendor' }, { label: 'Share', align: 'center' }],
      rows: [{ cells: ['Salesforce', { share: { width: 38.2, value: '38.2%' } }] }],
      caption: 'Source: HG Insights.',
    }),
  };
  // ComparisonTable composes ShareBar inside a cell, so its vocabulary is the union.
  const allowed = {
    Figure: jsxClasses.get('Figure'),
    Callout: jsxClasses.get('Callout'),
    ShareBar: jsxClasses.get('ShareBar'),
    ComparisonTable: new Set([...jsxClasses.get('ComparisonTable'), ...jsxClasses.get('ShareBar')]),
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

test('the audit reports all four fixture components covered by the live registry', () => {
  const result = auditCatalog(FIXTURE);
  assert.equal(result.counts.catalogued, 4);
  assert.equal(result.counts.covered, 4);
  assert.equal(result.counts.new, 0);
  for (const entry of result.entries) {
    assert.ok(
      entry.coveredBy.some((claim) => claim.startsWith('block ')),
      `${entry.name} lacks a registry claim: ${entry.coveredBy.join(', ')}`,
    );
  }
});
