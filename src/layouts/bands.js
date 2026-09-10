'use strict';

/**
 * Section background adjacency.
 *
 * Body bands and trailing page slots are either light (white) or dark
 * (tinted / off-white). Two dark bands may not sit next to each other; when
 * they would, the second is forced to light. Consecutive lights are allowed.
 * Author `band: tinted` does not win against this rule.
 *
 * Hero, freshness-bar, and CTA keep their required-dark chrome. Because CTA
 * always follows the trailing slots, the last trailing slot is forced light
 * rather than lightening the CTA.
 */

const { renderSlot } = require('../components');

const SLOT_DEFAULT_DARK = {
  methodology: true,
  faq: true,
  citations: false,
  related: true,
};

function requestedBodyDark(section, index) {
  const meta = (section && section.meta) || {};
  if (meta.band === 'tinted') return true;
  if (meta.band === 'white') return false;
  return index % 2 === 1;
}

function nextDark(previousDark, requestedDark) {
  if (previousDark && requestedDark) return false;
  return Boolean(requestedDark);
}

function bodyBand(section, index, previousDark) {
  return nextDark(previousDark, requestedBodyDark(section, index));
}

function pageSectionClass(isDark) {
  return isDark ? 'page-section tinted' : 'page-section';
}

function withOnWhite(html) {
  return String(html).replace(/^<([a-z]+) class="([^"]*)"/, '<$1 class="$2 on-white"');
}

function trailingSlotNames(fm) {
  const names = [];
  if (fm.methodology) names.push('methodology');
  names.push('faq');
  if (fm.citations) names.push('citations');
  if (fm.related) names.push('related');
  return names;
}

function resolveTrailingBands(previousDark, names) {
  const bands = {};
  let prev = Boolean(previousDark);
  for (const name of names) {
    const isDark = nextDark(prev, SLOT_DEFAULT_DARK[name]);
    bands[name] = isDark;
    prev = isDark;
  }
  const last = names[names.length - 1];
  if (last && bands[last]) bands[last] = false;
  return bands;
}

function renderTrailingSlots(fm, previousDark) {
  const names = trailingSlotNames(fm);
  const bands = resolveTrailingBands(previousDark, names);
  return names.map((name) => {
    const html = renderSlot(name, fm[name]);
    if (SLOT_DEFAULT_DARK[name] && !bands[name]) return withOnWhite(html);
    return html;
  });
}

module.exports = {
  SLOT_DEFAULT_DARK,
  requestedBodyDark,
  nextDark,
  bodyBand,
  pageSectionClass,
  withOnWhite,
  trailingSlotNames,
  resolveTrailingBands,
  renderTrailingSlots,
};
