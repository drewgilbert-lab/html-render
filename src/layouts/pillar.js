'use strict';

/**
 * Pillar layout — the parent hub of a Hub / Cluster / Spoke conversation space.
 *
 * Component order (fixed):
 *   breadcrumb -> gradient hero -> freshness-bar -> intro + TOC ->
 *   article body (thesis? + sections + sticky side nav) -> methodology? -> FAQ ->
 *   citations? -> related? -> CTA
 *
 * Hero omits eyebrow, pills, and thesis. Thesis sits at the top of the reading
 * column. The freshness bar always renders. The footer CTA is a single primary
 * button.
 */

const { el, lines, indent, container } = require('../html');
const { renderSlot } = require('../components');
const { renderNodes } = require('./section-body');
const { renderSectionHeader } = require('../components/page');
const assemble = require('./assemble');
const { normalizeField } = require('../validate/fields');

const pageType = 'pillar';

const describe = () => ({
  pageType,
  summary: 'Parent hub: routes readers and retrieval systems down to every cluster and key spoke.',
  order: [
    'breadcrumb',
    'hero (no eyebrow, pills, or thesis)',
    'freshness-bar',
    'intro-toc',
    'article body sections + side-nav',
    'methodology (optional)',
    'faq',
    'citations (optional)',
    'related (optional)',
    'cta (single primary button)',
  ],
});

function renderSection(section) {
  const meta = section.meta || {};
  return el(
    'section',
    { id: section.anchor },
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

function render(doc) {
  const fm = doc.frontmatter;
  const sections = doc.sections;

  const col = [];
  const thesis = thesisBlock(fm);
  if (thesis) col.push(thesis);
  sections.forEach((section) => {
    col.push(renderSection(section));
  });

  const articleBody = el(
    'section',
    { class: 'article-body-section' },
    `\n${indent(
      container(
        lines(
          el('div', { class: 'main-col' }, `\n${indent(lines(col))}\n`),
          renderSlot('side-nav', assemble.sideNavInput(fm, sections)),
        ),
      ),
    )}\n`,
  );

  return lines(
    renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('hero', assemble.heroInput(fm)),
    renderSlot('freshness-bar', assemble.freshnessInput(fm)),
    renderSlot('intro-toc', assemble.introTocInput(fm, sections)),
    articleBody,
    fm.methodology ? renderSlot('methodology', fm.methodology) : '',
    renderSlot('faq', fm.faq),
    fm.citations ? renderSlot('citations', fm.citations) : '',
    fm.related ? renderSlot('related', fm.related) : '',
    renderSlot('cta', assemble.ctaInput(fm)),
  );
}

module.exports = { pageType, describe, render };
