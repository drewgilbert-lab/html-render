'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { auditCatalog, formatAudit, componentNumber } = require('../src/audit');

const FIXTURE = path.join(__dirname, 'fixtures', 'catalog');

/** A stand-in registry and stylesheet, so the join is tested without the live repo. */
const COMPONENTS = [
  { kind: 'block', name: 'thesis', source: '31-thesis-block (formula variant)' },
  { kind: 'page', name: 'gone', source: '99-retired-component' },
];
const CSS = [
  '/* ---- Comparison table (11) -------------------------------- */',
  '/* ---- Bars and freshness (10, 04) -------------------------- */',
  '/* ---- Page composition ------------------------------------- */',
].join('\n');

function fixture() {
  return auditCatalog(FIXTURE, { components: COMPONENTS, css: CSS });
}

function entry(result, number) {
  return result.entries.find((row) => row.number === number);
}

test('componentNumber ignores a trailing variant note', () => {
  assert.equal(componentNumber('46-callout-box'), '46');
  assert.equal(componentNumber('31-thesis-block (formula variant)'), '31');
  assert.equal(componentNumber('10-supporting-charts (mini bar)'), '10');
  assert.equal(componentNumber('not-a-component'), null);
});

test('a catalogued component nothing implements is new', () => {
  const widget = entry(fixture(), '77');
  assert.equal(widget.status, 'new');
  assert.equal(widget.role, 'widget');
  assert.equal(widget.js, 'yes');
  assert.equal(widget.context, 'web');
});

test('a parenthetical source still covers its component', () => {
  const thesis = entry(fixture(), '31');
  assert.equal(thesis.status, 'covered');
  assert.deepEqual(thesis.coveredBy, ['block `thesis`']);
});

test('a numbered CSS header covers a component with no registry entry', () => {
  const table = entry(fixture(), '11');
  assert.equal(table.status, 'covered');
  assert.match(table.coveredBy.join(), /^css /);
});

test('a comma-separated CSS header covers every number it names', () => {
  const bars = entry(fixture(), '10');
  assert.equal(bars.status, 'covered');
  assert.match(bars.coveredBy.join(), /Bars and freshness/);
  assert.equal(entry(fixture(), '04').status, 'covered');
});

test('out-of-scope components are not reported as gaps', () => {
  const result = fixture();
  for (const number of ['01', '40']) {
    const row = entry(result, number);
    assert.equal(row.status, 'out-of-scope');
    assert.ok(row.reason, `${number} has no stated reason`);
  }
  assert.equal(result.counts.new, 1);
  assert.equal(result.counts.outOfScope, 2);
  assert.equal(result.counts.covered, 4);
});

test('a source naming no catalogued component is reported as removed', () => {
  const result = fixture();
  assert.deepEqual(result.removed, [{ number: '99', claimedBy: ['page `gone`'] }]);
});

test('review triggers come from the refresh history and the usage notes only', () => {
  const bars = entry(fixture(), '10');
  assert.ok(
    bars.reviewTriggers.some((trigger) => /Refresh history/.test(trigger)),
    'the catalog names 10 in its refresh history',
  );
  assert.ok(
    bars.reviewTriggers.some((trigger) => /Refreshed 2099-01-01/.test(trigger)),
    'the component file has a refresh usage note',
  );
  assert.ok(
    !bars.reviewTriggers.some((trigger) => /refreshed hue/.test(trigger)),
    'the token list is not a usage note',
  );
});

test('the catalog refresh date is read from the index', () => {
  assert.equal(fixture().refreshed, '2099-01-01');
});

test('a directory with no components/ fails with a usable message', () => {
  assert.throws(() => auditCatalog(__dirname), /no components\/ directory/);
});

test('formatAudit reports every classification', () => {
  const printed = formatAudit(fixture());
  assert.match(printed, /## New — not implemented here \(1\)/);
  assert.match(printed, /## Removed — implemented here, gone from the catalog \(1\)/);
  assert.match(printed, /## Out of scope by design \(2\)/);
  assert.match(printed, /## Covered \(4\)/);
});

test('the live registry audits without throwing', () => {
  const result = auditCatalog(FIXTURE);
  assert.ok(result.counts.catalogued === 7);
  assert.ok(typeof result.counts.covered === 'number');
});
