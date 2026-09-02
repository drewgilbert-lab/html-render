'use strict';

/**
 * Frontmatter -> component inputs.
 *
 * Authors write page metadata once at the top level (title, description,
 * eyebrow, author, pills); several components need pieces of it. This module is
 * the only place that mapping happens, so a layout never reaches into raw
 * frontmatter and a component never has to know where its values came from.
 */

function breadcrumbInput(fm) {
  return { items: fm.breadcrumbs, current: fm.breadcrumb_label || fm.title };
}

/** Gradient hero: H1, lead, byline, stats. Eyebrow, pills, and thesis are omitted. */
function heroInput(fm) {
  const hero = fm.hero || {};
  return {
    title: fm.title,
    description: fm.description,
    author: fm.author,
    freshness_badge: hero.freshness_badge,
    source: hero.source,
    coverage: hero.coverage,
    stats: hero.stats,
  };
}

function articleHeroInput(fm) {
  return { title: fm.title, author: fm.author };
}

function thesisBandInput(fm) {
  const thesis = fm.hero && fm.hero.thesis;
  return thesis ? { text: thesis } : null;
}

/** `2026-08-11` → `Q3 2026`. Returns the trimmed input when it is not an ISO date. */
function quarterLabel(isoDate) {
  const match = /^(\d{4})-(\d{2})/.exec(String(isoDate || '').trim());
  if (!match) return String(isoDate || '').trim();
  return `Q${Math.ceil(Number(match[2]) / 3)} ${match[1]}`;
}

function freshnessLabel(fm) {
  if (fm.freshness && fm.freshness.label) return fm.freshness.label;
  return quarterLabel(fm.updated || fm.published);
}

/** Freshness bar: label only. Note, cadence, and methodology link are ignored. */
function freshnessInput(fm) {
  return { label: freshnessLabel(fm) };
}

/**
 * Build the on-page nav list. An explicit `intro.toc` wins; otherwise it is
 * derived from the body sections, so the nav can never drift from the page.
 */
function tocItems(fm, sections, { resourceIndexAfterFirst = false } = {}) {
  const explicit = fm.intro && fm.intro.toc;
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((item) => ({ label: item.label, anchor: String(item.anchor).replace(/^#/, '') }));
  }
  const items = [];
  sections.forEach((section, index) => {
    items.push({ label: section.navLabel, anchor: section.anchor });
    if (resourceIndexAfterFirst && index === 0) items.push({ label: 'Full Resource Index', anchor: 'resource-index' });
  });
  if (fm.methodology) items.push({ label: 'Methodology', anchor: 'methodology' });
  items.push({ label: 'FAQ', anchor: 'faq' });
  return items;
}

function introTocInput(fm, sections, options = {}) {
  const intro = fm.intro || {};
  return {
    eyebrow: intro.eyebrow,
    title: intro.title,
    body: intro.body,
    toc_label: intro.toc_label,
    toc: options.omitToc ? [] : tocItems(fm, sections, options),
  };
}

/** First CTA button whose variant is primary (the default when omitted). */
function primaryCtaButton(fm) {
  const buttons = (fm.cta && fm.cta.buttons) || [];
  const primary = buttons.find((button) => button.variant !== 'secondary');
  return primary ? { label: primary.label, url: primary.url } : undefined;
}

function sideNavInput(fm, sections, options = {}) {
  const sideNav = fm.side_nav || {};
  const input = { label: sideNav.label, items: tocItems(fm, sections, options), note: sideNav.note };
  if (options.withCtaButton) {
    const button = primaryCtaButton(fm);
    if (button) input.button = button;
  }
  return input;
}

/** Footer CTA: one primary button, no use-case links or meta pills. */
function ctaInput(fm) {
  const source = fm.cta || {};
  const primary = primaryCtaButton(fm);
  return {
    eyebrow: source.eyebrow,
    title: source.title,
    body: source.body,
    buttons: primary ? [{ label: primary.label, url: primary.url, variant: 'primary' }] : [],
  };
}

module.exports = {
  breadcrumbInput,
  heroInput,
  articleHeroInput,
  thesisBandInput,
  freshnessInput,
  introTocInput,
  sideNavInput,
  ctaInput,
  quarterLabel,
};
