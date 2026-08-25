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

function heroInput(fm) {
  const hero = fm.hero || {};
  return {
    eyebrow: fm.eyebrow,
    title: fm.title,
    description: fm.description,
    pills: fm.pills,
    thesis: hero.thesis,
    author: fm.author,
    freshness_badge: hero.freshness_badge,
    source: hero.source,
    coverage: hero.coverage,
    stats: hero.stats,
  };
}

function articleHeroInput(fm) {
  return { title: fm.title, author: fm.author, pills: fm.pills };
}

function thesisBandInput(fm) {
  const thesis = fm.hero && fm.hero.thesis;
  return thesis ? { text: thesis } : null;
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

function introTocInput(fm, sections, options) {
  const intro = fm.intro || {};
  return {
    eyebrow: intro.eyebrow,
    title: intro.title,
    body: intro.body,
    toc_label: intro.toc_label,
    toc: tocItems(fm, sections, options),
  };
}

function sideNavInput(fm, sections, options) {
  const sideNav = fm.side_nav || {};
  return { label: sideNav.label, items: tocItems(fm, sections, options), note: sideNav.note };
}

module.exports = { breadcrumbInput, heroInput, articleHeroInput, thesisBandInput, introTocInput, sideNavInput };
