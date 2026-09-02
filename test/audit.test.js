'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { auditCatalog, formatAudit, headerCovers, isLegacyNumbered, OUT_OF_SCOPE } = require('../src/audit');

const FIXTURE = path.join(__dirname, 'fixtures', 'design-export-sample');

/** A stand-in registry and stylesheet, so the join is tested without the live repo. */
const COMPONENTS = [
  { kind: 'block', name: 'figure', source: 'Figure' },
  { kind: 'block', name: 'quote', source: '12-expert-quote-card' },
  { kind: 'page', name: 'gone', source: 'RetiredComponent' },
];
const CSS = [
  '/* ---- Share bar ------------------------------------------- */',
  '/* ---- Comparison table ------------------------------------- */',
  '/* ---- Callout box (46) ------------------------------------- */',
  '/* ---- Page composition ------------------------------------- */',
].join('\n');

function fixture() {
  return auditCatalog(FIXTURE, { components: COMPONENTS, css: CSS });
}

function entry(result, name) {
  return result.entries.find((row) => row.name === name);
}

test('headerCovers joins a header label to a component name', () => {
  assert.ok(headerCovers('Figure block', 'Figure'));
  assert.ok(headerCovers('Comparison table', 'ComparisonTable'));
  assert.ok(headerCovers('Share bar', 'ShareBar'));
  assert.ok(!headerCovers('Page composition', 'ComparisonTable'));
  assert.ok(!headerCovers('Share bar', 'Figure'));
});

test('isLegacyNumbered recognises the retired numbered convention', () => {
  assert.ok(isLegacyNumbered('46-callout-box'));
  assert.ok(isLegacyNumbered('31-thesis-block (formula variant)'));
  assert.ok(!isLegacyNumbered('Figure'));
  assert.ok(!isLegacyNumbered('ComparisonTable'));
});

test('a registry source joins on the verbatim export name', () => {
  const figure = entry(fixture(), 'Figure');
  assert.equal(figure.status, 'covered');
  assert.deepEqual(figure.coveredBy, ['block `figure`']);
});

test('an unnumbered CSS header covers a component with no registry entry', () => {
  const result = fixture();
  assert.equal(entry(result, 'ShareBar').status, 'covered');
  assert.match(entry(result, 'ShareBar').coveredBy.join(), /^css `Share bar/);
  assert.equal(entry(result, 'ComparisonTable').status, 'covered');
});

test('a numbered CSS header is legacy and does not join', () => {
  const result = fixture();
  assert.equal(entry(result, 'Callout').status, 'new');
  assert.deepEqual(
    result.legacy.headers.filter((label) => /Callout/.test(label)),
    ['Callout box (46)'],
  );
});

test('a numbered registry source is legacy, not removed', () => {
  const result = fixture();
  assert.deepEqual(result.legacy.sources, [{ source: '12-expert-quote-card', claimedBy: 'block `quote`' }]);
  assert.ok(!result.removed.some((row) => row.source === '12-expert-quote-card'));
});

test('a named source the export no longer lists is reported as removed', () => {
  assert.deepEqual(fixture().removed, [{ source: 'RetiredComponent', claimedBy: 'page `gone`' }]);
});

test('each entry carries its category and its prompt.md role line', () => {
  const share = entry(fixture(), 'ShareBar');
  assert.equal(share.category, 'data');
  assert.match(share.role, /share-visualisation cell/);
});

test('out-of-scope components are keyed by exact export names', () => {
  assert.deepEqual(Object.keys(OUT_OF_SCOPE), ['DocCover', 'PageHeaderBand', 'PageFooterBand', 'AboutBlock', 'Logo']);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  fs.writeFileSync(
    path.join(dir, '_ds_manifest.json'),
    JSON.stringify({
      namespace: 'Test_000000',
      components: [{ name: 'DocCover', sourcePath: 'components/document/DocCover.jsx' }],
    }),
  );
  const result = auditCatalog(dir, { components: [], css: '' });
  assert.equal(result.entries[0].status, 'out-of-scope');
  assert.match(result.entries[0].reason, /print\/PDF chrome/);
});

test('the export namespace is read from the manifest', () => {
  assert.equal(fixture().namespace, 'HGInsightsMarketingDesignSystem_3bf70b');
});

test('a directory with no manifest fails with a usable message', () => {
  assert.throws(() => auditCatalog(__dirname), /no _ds_manifest\.json under/);
});

test('formatAudit reports every classification', () => {
  const printed = formatAudit(fixture());
  assert.match(printed, /Export namespace: HGInsightsMarketingDesignSystem_3bf70b/);
  assert.match(printed, /## New — not implemented here \(5\)/);
  assert.match(printed, /## Removed — implemented here, gone from the export \(1\)/);
  assert.match(printed, /## Legacy numbered convention — cannot join on export names \(2\)/);
  assert.match(printed, /## Covered \(3\)/);
});

test('the live registry audits the fixture without throwing', () => {
  const result = auditCatalog(FIXTURE);
  assert.equal(result.counts.catalogued, 8);
  assert.ok(typeof result.counts.covered === 'number');
});
