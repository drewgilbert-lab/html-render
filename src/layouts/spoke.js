'use strict';

/**
 * Spoke layout — one conversation inside a cluster.
 *
 * The approved designs contain two legitimate spoke variants, selected with
 * `layout:` in frontmatter:
 *
 *   article (default) — light article hero, then a reading column plus a
 *                       sticky right-rail nav. Glossary / definition spokes
 *                       use this.
 *   banded            — gradient stat hero, then alternating section bands in
 *                       the reading column plus the same rail. Methodology,
 *                       benchmark-report, and reporting-framework spokes use
 *                       this (every remaining GEO format maps here).
 *
 * Component order (fixed per variant):
 *   article: breadcrumb -> article hero -> freshness-bar -> article body +
 *            side-nav -> methodology? -> FAQ -> citations? -> related -> CTA
 *   banded:  breadcrumb -> gradient hero -> freshness-bar -> intro copy? ->
 *            section bands + side-nav -> methodology? -> FAQ -> citations? ->
 *            related -> CTA
 *
 * Spoke chrome omits the hero eyebrow, meta pills, and in-hero thesis. The
 * thesis sits in the reading column. The freshness bar always renders. The
 * footer CTA is a single primary button.
 */

const { el, lines, indent, container } = require('../html');
const { renderSlot } = require('../components');
const { renderNodes } = require('./section-body');
const { renderSectionHeader } = require('../components/page');
const assemble = require('./assemble');
const { bodyBand, pageSectionClass, renderTrailingSlots } = require('./bands');
const { normalizeField } = require('../validate/fields');

const pageType = 'spoke';

const describe = () => ({
  pageType,
  summary: 'One conversation inside a cluster, in one of two approved variants.',
  variants: {
    article: [
      'breadcrumb (omitted when standalone: true)',
      'article-hero',
      'freshness-bar',
      'article body + side-nav',
      'methodology (optional)',
      'faq',
      'citations (optional)',
      'related',
      'cta (single primary button)',
    ],
    banded: [
      'breadcrumb (omitted when standalone: true)',
      'hero (no eyebrow, pills, or thesis)',
      'freshness-bar',
      'intro copy (optional)',
      'section bands + side-nav',
      'methodology (optional)',
      'faq',
      'citations (optional)',
      'related',
      'cta (single primary button)',
    ],
  },
});

function renderSpokeBody(readingColHtml, fm, sections) {
  return el(
    'section',
    { class: 'spoke-body-section' },
    `\n${indent(
      container(
        lines(
          readingColHtml,
          renderSlot('side-nav', assemble.sideNavInput(fm, sections, { withCtaButton: true })),
        ),
      ),
    )}\n`,
  );
}

function renderArticleSection(section) {
  const meta = section.meta || {};
  return el(
    'section',
    { id: section.anchor },
    `\n${indent(
      lines(
        meta.eyebrow ? el('div', { class: 'section-eyebrow' }, meta.eyebrow) : '',
        el('h2', null, section.titleHtml),
        meta.subtitle ? el('p', { class: 'section-subtitle' }, meta.subtitle) : '',
        renderNodes(section.blocks, {}),
      ),
    )}\n`,
  );
}

function renderBandedSection(section, isDark) {
  const meta = section.meta || {};
  return el(
    'section',
    { class: pageSectionClass(isDark), id: section.anchor },
    `\n${indent(
      lines(
        renderSectionHeader({ eyebrow: meta.eyebrow, title: section.titleHtml, subtitle: meta.subtitle, align: 'left' }),
        renderNodes(section.blocks, {}),
      ),
    )}\n`,
  );
}

function thesisBlock(fm) {
  if (!(fm.hero && fm.hero.thesis)) return '';
  return el('p', { class: 'thesis-block' }, normalizeField({ type: 'text' }, fm.hero.thesis));
}

function renderArticle(doc) {
  const fm = doc.frontmatter;
  const sections = assemble.visibleSections(fm, doc.sections);
  const blocks = [];
  const thesis = thesisBlock(fm);
  if (thesis) blocks.push(thesis);
  const preamble = renderNodes(doc.preamble, {});
  if (preamble) blocks.push(preamble);
  sections.forEach((section) => {
    blocks.push(renderArticleSection(section));
  });

  return lines(
    fm.standalone ? '' : renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('article-hero', assemble.articleHeroInput(fm)),
    renderSlot('freshness-bar', assemble.freshnessInput(fm)),
    renderSpokeBody(el('div', { class: 'spoke-col article-body' }, `\n${indent(lines(blocks))}\n`), fm, sections),
    ...renderTrailingSlots(fm, false),
    renderSlot('cta', assemble.ctaInput(fm)),
  );
}

function renderBanded(doc) {
  const fm = doc.frontmatter;
  const sections = assemble.visibleSections(fm, doc.sections);
  const col = [];
  const thesis = thesisBlock(fm);
  if (thesis) col.push(thesis);
  let previousDark = false;
  sections.forEach((section, index) => {
    const isDark = bodyBand(section, index, previousDark);
    col.push(renderBandedSection(section, isDark));
    previousDark = isDark;
  });
  return lines(
    fm.standalone ? '' : renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('hero', assemble.heroInput(fm)),
    renderSlot('freshness-bar', assemble.freshnessInput(fm)),
    fm.intro ? renderSlot('intro-toc', assemble.introTocInput(fm, sections, { omitToc: true })) : '',
    renderSpokeBody(el('div', { class: 'spoke-col' }, `\n${indent(lines(col))}\n`), fm, sections),
    ...renderTrailingSlots(fm, previousDark),
    renderSlot('cta', assemble.ctaInput(fm)),
  );
}

function render(doc) {
  return doc.layout === 'banded' ? renderBanded(doc) : renderArticle(doc);
}

module.exports = { pageType, describe, render };
