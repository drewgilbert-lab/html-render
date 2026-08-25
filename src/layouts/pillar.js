'use strict';

/**
 * Pillar layout — the parent hub of a Hub / Cluster / Spoke conversation space.
 *
 * Component order (fixed):
 *   breadcrumb -> gradient hero -> freshness bar? -> intro + TOC ->
 *   article body (narrow column + sticky side nav) -> methodology? -> FAQ ->
 *   citations? -> related? -> CTA
 */

const { el, lines, indent, container } = require('../html');
const { renderSlot } = require('../components');
const { renderNodes } = require('./section-body');
const { renderSectionHeader } = require('../components/page');
const assemble = require('./assemble');

const pageType = 'pillar';

const describe = () => ({
  pageType,
  summary: 'Parent hub: routes readers and retrieval systems down to every cluster and key spoke.',
  order: [
    'breadcrumb',
    'hero',
    'freshness-bar (optional)',
    'intro-toc',
    'article body sections + side-nav',
    'methodology (optional)',
    'faq',
    'citations (optional)',
    'related (optional)',
    'cta',
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

function render(doc) {
  const fm = doc.frontmatter;
  const sections = doc.sections;

  const body = sections.map((section) => renderSection(section));
  const withRules = [];
  body.forEach((html, index) => {
    if (index > 0) withRules.push('<hr class="section-rule">');
    withRules.push(html);
  });

  const articleBody = el(
    'section',
    { class: 'article-body-section' },
    `\n${indent(
      container(
        lines(
          el('div', { class: 'main-col' }, `\n${indent(lines(withRules))}\n`),
          renderSlot('side-nav', assemble.sideNavInput(fm, sections)),
        ),
      ),
    )}\n`,
  );

  return lines(
    renderSlot('breadcrumb', assemble.breadcrumbInput(fm)),
    renderSlot('hero', assemble.heroInput(fm)),
    fm.freshness ? renderSlot('freshness-bar', fm.freshness) : '',
    renderSlot('intro-toc', assemble.introTocInput(fm, sections)),
    articleBody,
    fm.methodology ? renderSlot('methodology', fm.methodology) : '',
    renderSlot('faq', fm.faq),
    fm.citations ? renderSlot('citations', fm.citations) : '',
    fm.related ? renderSlot('related', fm.related) : '',
    renderSlot('cta', fm.cta),
  );
}

module.exports = { pageType, describe, render };
