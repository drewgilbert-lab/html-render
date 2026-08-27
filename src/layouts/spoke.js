'use strict';

/**
 * Spoke layout — one conversation inside a cluster.
 *
 * The approved designs contain two legitimate spoke variants, selected with
 * `layout:` in frontmatter:
 *
 *   article (default) — light article hero, then one flowing narrow column.
 *                       Definition, glossary, comparison, and decision-tree
 *                       spokes use this.
 *   banded            — gradient stat hero, then full-width alternating section
 *                       bands. Methodology, benchmark-report, and reporting
 *                       framework spokes use this.
 *
 * Component order (fixed per variant):
 *   article: breadcrumb -> article hero -> article body -> methodology? ->
 *            FAQ -> citations? -> related -> CTA
 *   banded:  breadcrumb -> gradient hero -> intro + TOC? -> section bands ->
 *            methodology? -> FAQ -> citations? -> related -> CTA
 */

const { el, lines, indent, container } = require('../html');
const { renderSlot } = require('../components');
const { renderNodes } = require('./section-body');
const { renderSectionHeader } = require('../components/page');
const assemble = require('./assemble');
const { normalizeField } = require('../validate/fields');

const pageType = 'spoke';

const describe = () => ({
  pageType,
  summary: 'One conversation inside a cluster, in one of two approved variants.',
  variants: {
    article: [
      'breadcrumb (omitted when standalone: true)',
      'article-hero',
      'article body (thesis + sections)',
      'methodology (optional)',
      'faq',
      'citations (optional)',
      'related',
      'cta',
    ],
    banded: [
      'breadcrumb (omitted when standalone: true)',
      'hero',
      'intro-toc (optional)',
      'section bands',
      'methodology (optional)',
      'faq',
      'citations (optional)',
      'related',
      'cta',
    ],
  },
});

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

function renderBandedSection(section, index) {
  const meta = section.meta || {};
  const tinted = meta.band ? meta.band === 'tinted' : index % 2 === 1;
  return el(
    'section',
    { class: tinted ? 'page-section tinted' : 'page-section', id: section.anchor },
    `\n${indent(
      container(
        lines(
          renderSectionHeader({ eyebrow: meta.eyebrow, title: section.titleHtml, subtitle: meta.subtitle, align: 'left' }),
          renderNodes(section.blocks, {}),
        ),
      ),
    )}\n`,
  );
}

function renderArticle(doc) {
  const fm = doc.frontmatter;
  const blocks = [];
  if (fm.hero && fm.hero.thesis) {
    blocks.push(el('p', { class: 'thesis-block' }, normalizeField({ type: 'text' }, fm.hero.thesis)));
  }
  const preamble = renderNodes(doc.preamble, {});
  if (preamble) blocks.push(preamble);
  doc.sections.forEach((section, index) => {
    // A rule separates one section from the next; the opening thesis and lead
    // copy run straight into the first heading.
    if (index > 0) blocks.push('<hr class="section-rule">');
    blocks.push(renderArticleSection(section));
  });

  return lines(
    fm.standalone ? '' : renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('article-hero', assemble.articleHeroInput(fm)),
    el('div', { class: 'container article-body' }, `\n${indent(lines(blocks))}\n`),
    fm.methodology ? renderSlot('methodology', fm.methodology) : '',
    renderSlot('faq', fm.faq),
    fm.citations ? renderSlot('citations', fm.citations) : '',
    renderSlot('related', fm.related),
    renderSlot('cta', fm.cta),
  );
}

function renderBanded(doc) {
  const fm = doc.frontmatter;
  const sections = doc.sections;
  return lines(
    fm.standalone ? '' : renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('hero', assemble.heroInput(fm)),
    fm.freshness ? renderSlot('freshness-bar', fm.freshness) : '',
    fm.intro ? renderSlot('intro-toc', assemble.introTocInput(fm, sections)) : '',
    sections.map((section, index) => renderBandedSection(section, index)),
    fm.methodology ? renderSlot('methodology', fm.methodology) : '',
    renderSlot('faq', fm.faq),
    fm.citations ? renderSlot('citations', fm.citations) : '',
    renderSlot('related', fm.related),
    renderSlot('cta', fm.cta),
  );
}

function render(doc) {
  return doc.layout === 'banded' ? renderBanded(doc) : renderArticle(doc);
}

module.exports = { pageType, describe, render };
