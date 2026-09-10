'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  nextDark,
  bodyBand,
  pageSectionClass,
  resolveTrailingBands,
  withOnWhite,
} = require('../src/layouts/bands');

test('nextDark forces the second of two darks to light', () => {
  assert.equal(nextDark(false, false), false);
  assert.equal(nextDark(false, true), true);
  assert.equal(nextDark(true, false), false);
  assert.equal(nextDark(true, true), false);
});

test('bodyBand respects band: tinted unless the previous band is already dark', () => {
  const tinted = { meta: { band: 'tinted' } };
  const white = { meta: { band: 'white' } };
  assert.equal(bodyBand(tinted, 0, false), true);
  assert.equal(bodyBand(tinted, 1, true), false);
  assert.equal(bodyBand(white, 1, false), false);
  assert.equal(bodyBand({ meta: {} }, 1, false), true);
  assert.equal(bodyBand({ meta: {} }, 0, false), false);
});

test('pageSectionClass names the tinted modifier only when the band is dark', () => {
  assert.equal(pageSectionClass(true), 'page-section tinted');
  assert.equal(pageSectionClass(false), 'page-section');
});

test('resolveTrailingBands never leaves a dark slot against the CTA', () => {
  const afterLight = resolveTrailingBands(false, ['methodology', 'faq', 'citations', 'related']);
  assert.deepEqual(afterLight, {
    methodology: true,
    faq: false,
    citations: false,
    related: false,
  });

  const afterDark = resolveTrailingBands(true, ['methodology', 'faq']);
  assert.deepEqual(afterDark, { methodology: false, faq: false });

  const faqOnly = resolveTrailingBands(false, ['faq']);
  assert.deepEqual(faqOnly, { faq: false });
});

test('withOnWhite appends the modifier to the opening class attribute', () => {
  assert.equal(
    withOnWhite('<section class="faq-section" id="faq">'),
    '<section class="faq-section on-white" id="faq">',
  );
});
